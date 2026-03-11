import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { handleCors, jsonOk, jsonError, unauthorized, internalError } from "../_shared/edge-response.ts";

const CF_API = "https://api.cloudflare.com/client/v4";

async function cfFetch<T>(token: string, url: string, init?: RequestInit) {
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await resp.json().catch(() => null) as { success: boolean; errors: any[]; result: T } | null;
  return { resp, data };
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

function isServiceRoleAuth(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  return data?.user ?? null;
}

// ── Helper: Check if domain uses Cloudflare nameservers ──
async function detectCloudflareZone(domain: string): Promise<boolean> {
  try {
    // Extract root domain (e.g., "has.h-and-c.co.uk" → "h-and-c.co.uk")
    const parts = domain.split(".");
    // Handle co.uk, com.au etc. by trying progressively
    let rootDomain = domain;
    if (parts.length > 2) {
      // Try with last 2 parts first, then 3 for .co.uk style
      const candidates = [];
      if (parts.length >= 3) candidates.push(parts.slice(-3).join("."));
      candidates.push(parts.slice(-2).join("."));
      
      for (const candidate of candidates) {
        const nsResp = await fetch(
          `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(candidate)}&type=NS`,
          { headers: { Accept: "application/dns-json" } }
        );
        const nsData = await nsResp.json();
        const nsRecords = (nsData?.Answer ?? [])
          .filter((a: any) => a.type === 2)
          .map((a: any) => (a.data ?? "").toLowerCase());
        
        if (nsRecords.length > 0) {
          return nsRecords.some((ns: string) => ns.includes(".ns.cloudflare.com"));
        }
      }
    }
    
    // Fallback: check the domain directly
    const nsResp = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(rootDomain)}&type=NS`,
      { headers: { Accept: "application/dns-json" } }
    );
    const nsData = await nsResp.json();
    const nsRecords = (nsData?.Answer ?? [])
      .filter((a: any) => a.type === 2)
      .map((a: any) => (a.data ?? "").toLowerCase());
    
    return nsRecords.some((ns: string) => ns.includes(".ns.cloudflare.com"));
  } catch {
    return false;
  }
}

// ── Helper: Detect if a CNAME is proxied (resolves to CF IPs instead of target) ──
async function detectProxiedCname(domain: string): Promise<{ is_proxied: boolean; cname_target: string | null }> {
  try {
    // Check CNAME record
    const cnameResp = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
      { headers: { Accept: "application/dns-json" } }
    );
    const cnameData = await cnameResp.json();
    const cnameRecords = (cnameData?.Answer ?? []).filter((a: any) => a.type === 5);

    if (cnameRecords.length === 0) return { is_proxied: false, cname_target: null };

    const cnameTarget = cnameRecords[0].data?.replace(/\.$/, "") ?? null;

    // If CNAME exists but A records resolve to Cloudflare proxy IPs, the CNAME is proxied
    const aResp = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      { headers: { Accept: "application/dns-json" } }
    );
    const aData = await aResp.json();
    const aRecords = (aData?.Answer ?? []).filter((a: any) => a.type === 1);

    if (aRecords.length > 0) {
      const ips = aRecords.map((a: any) => a.data);
      const isCloudflareProxy = ips.some((ip: string) => {
        const parts = ip.split(".").map(Number);
        return (parts[0] === 104 && parts[1] >= 16 && parts[1] <= 31) ||
               (parts[0] === 172 && parts[1] >= 64 && parts[1] <= 71);
      });
      // If resolves to CF proxy IPs and not our origin, it's proxied
      const isOurOrigin = ips.includes("185.158.133.1");
      if (isCloudflareProxy && !isOurOrigin) {
        return { is_proxied: true, cname_target: cnameTarget };
      }
    }

    return { is_proxied: false, cname_target: cnameTarget };
  } catch {
    return { is_proxied: false, cname_target: null };
  }
}

function getPreferredDnsRecord(domain: string, zoneName?: string | null) {
  const normalizedDomain = domain.toLowerCase();
  const normalizedZone = (zoneName ?? "").toLowerCase();
  const isApexDomain = normalizedZone ? normalizedDomain === normalizedZone : false;

  if (isApexDomain) {
    return {
      type: "A" as const,
      name: domain,
      content: "185.158.133.1",
      proxied: false,
      is_apex: true,
    };
  }

  return {
    type: "CNAME" as const,
    name: domain,
    content: "stores.eclipserblx.com",
    proxied: false,
    is_apex: false,
  };
}

function getPreferredWwwRecord(domain: string, apexRecordType: "A" | "CNAME") {
  if (apexRecordType === "A") {
    return {
      type: "A" as const,
      name: `www.${domain}`,
      content: "185.158.133.1",
      proxied: false,
    };
  }

  return {
    type: "CNAME" as const,
    name: `www.${domain}`,
    content: "stores.eclipserblx.com",
    proxied: false,
  };
}

// ── Helper: Health check a domain ──
async function performHealthCheck(domain: string) {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    domain,
    dns_ok: false,
    cname_target: null,
    cname_is_proxied: false,
    resolves_to_cloudflare: false,
    resolves_to_lovable_ip: false,
    http_reachable: false,
    http_status: null,
    error_code: null,
    is_cloudflare_zone: false,
    diagnosis: "",
    recommended_fix: "",
  };

  try {
    // 1. Check CNAME resolution
    const cnameResp = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
      { headers: { Accept: "application/dns-json" } }
    );
    const cnameData = await cnameResp.json();
    const cnameRecords = (cnameData?.Answer ?? []).filter((a: any) => a.type === 5);
    if (cnameRecords.length > 0) {
      checks.cname_target = cnameRecords[0].data?.replace(/\.$/, "");
      checks.dns_ok = true;
    }

    // 2. Check A record resolution
    const aResp = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      { headers: { Accept: "application/dns-json" } }
    );
    const aData = await aResp.json();
    const aRecords = (aData?.Answer ?? []).filter((a: any) => a.type === 1);
    if (aRecords.length > 0) {
      checks.dns_ok = true;
      const ips = aRecords.map((a: any) => a.data);
      checks.resolved_ips = ips;
      checks.resolves_to_lovable_ip = ips.includes("185.158.133.1");
      // Cloudflare proxy IPs are in 104.16-31.x.x, 172.64-71.x.x ranges
      checks.resolves_to_cloudflare = ips.some((ip: string) => {
        const parts = ip.split(".").map(Number);
        return (parts[0] === 104 && parts[1] >= 16 && parts[1] <= 31) ||
               (parts[0] === 172 && parts[1] >= 64 && parts[1] <= 71);
      });
    }

    // 3. Check NS to detect Cloudflare zone
    checks.is_cloudflare_zone = await detectCloudflareZone(domain);

    // 3.5. Detect proxied CNAME
    const proxiedCheck = await detectProxiedCname(domain);
    checks.cname_is_proxied = proxiedCheck.is_proxied;
    if (proxiedCheck.cname_target) checks.cname_target = proxiedCheck.cname_target;

    // 4. Try HTTP fetch to check for errors
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const httpResp = await fetch(`https://${domain}/`, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": "EclipseHealthCheck/1.0" },
      });
      clearTimeout(timeout);
      
      checks.http_status = httpResp.status;
      checks.http_reachable = true;

      // Check for Cloudflare error pages
      const body = await httpResp.text();
      const bodyLower = body.toLowerCase();
      const hasError1000 =
        /error\s*(code)?\s*1000/.test(bodyLower) ||
        bodyLower.includes("error-1000") ||
        bodyLower.includes("conflict within cloudflare");

      if (hasError1000) {
        if (checks.is_cloudflare_zone) {
          checks.error_code = "1000";
          if (!checks.cname_target && checks.resolves_to_cloudflare) {
            checks.diagnosis = "Error 1000 — apex/root domain is flattening through Cloudflare and causing cross-zone conflict. Use a DNS-only A record to 185.158.133.1 for the root domain.";
          } else {
            checks.diagnosis = "Error 1000 — cross-zone Cloudflare conflict detected.";
          }
        } else {
          checks.error_code = "1000_non_cf";
          checks.diagnosis = "DNS conflict — your CNAME is being resolved through Cloudflare's proxy. Use an A record instead.";
        }
      } else if (body.includes("Error 1014")) {
        checks.error_code = "1014";
        checks.diagnosis = "CNAME Cross-User Banned — your CNAME is set to Proxied (orange cloud). Switch to DNS-only (grey cloud).";
      } else if (body.includes("Error 522")) {
        checks.error_code = "522";
        checks.diagnosis = "Connection timed out — the origin server is not responding.";
      } else if (body.includes("Error 523")) {
        checks.error_code = "523";
        checks.diagnosis = "Origin is unreachable — check DNS records are correct.";
      } else if (body.includes("ERR_TOO_MANY_REDIRECTS") || httpResp.status === 301 || httpResp.status === 302) {
        checks.error_code = "redirect_loop";
        checks.diagnosis = "Redirect loop detected — check for conflicting redirect rules.";
      } else if (httpResp.status === 403 && checks.is_cloudflare_zone && checks.resolves_to_cloudflare) {
        if (!checks.cname_target) {
          checks.error_code = "1000";
          checks.diagnosis = "403 with Cloudflare edge IPs and no visible CNAME usually indicates root-domain flattening conflict. Use a DNS-only A record to 185.158.133.1.";
        } else if (checks.cname_is_proxied) {
          checks.error_code = "403_cloudflare";
          checks.diagnosis = "403 Forbidden — your CNAME is Proxied (orange cloud) which triggers Cloudflare cross-zone blocking. Switch to DNS-only (grey cloud).";
        } else {
          checks.error_code = "403_cloudflare";
          checks.diagnosis = "403 Forbidden — your DNS-only CNAME resolves through Cloudflare but the custom hostname may not be active yet. This can happen if the domain was recently added. Wait 5-10 minutes and re-check, or verify the custom hostname is active in your domain settings.";
        }
      } else if (httpResp.status === 403 && checks.is_cloudflare_zone && checks.resolves_to_lovable_ip) {
        checks.error_code = "403_direct_a";
        checks.diagnosis = "403 Forbidden — your A record points directly to the origin server, bypassing the proxy. Since your domain is on Cloudflare, you must use a CNAME record instead so traffic routes through the proxy correctly.";
      } else if (httpResp.status === 403 && !checks.is_cloudflare_zone && checks.resolves_to_lovable_ip) {
        checks.error_code = "403_direct_a";
        checks.diagnosis = "403 Forbidden — your A record points to the origin but the domain is not registered as a custom hostname. Use a CNAME record pointing to stores.eclipserblx.com instead.";
      } else if (httpResp.status === 403) {
        checks.error_code = "403";
        checks.diagnosis = "403 Forbidden — access is being blocked. Check WAF rules or Cloudflare settings on the domain.";
      } else if (httpResp.status >= 200 && httpResp.status < 400) {
        checks.error_code = null;
        checks.diagnosis = "Domain appears to be working correctly.";
      }
    } catch (fetchErr: any) {
      checks.http_reachable = false;
      checks.diagnosis = `Could not reach domain: ${fetchErr.message}`;
    }

    // 5. Generate recommended fix
    if (checks.cname_is_proxied) {
      checks.recommended_fix = "DISABLE_PROXY";
      if (!checks.error_code) {
        checks.error_code = "proxied_cname";
        checks.diagnosis = "Your CNAME record is Proxied (orange cloud). This will cause errors. Switch it to DNS-only (grey cloud) immediately.";
      }
    } else if (checks.error_code === "1000_non_cf") {
      checks.recommended_fix = "USE_A_RECORD";
    } else if (checks.error_code === "1000" && checks.is_cloudflare_zone) {
      if (!checks.cname_target && checks.resolves_to_cloudflare) {
        checks.recommended_fix = "USE_A_RECORD";
      } else {
        checks.recommended_fix = "CLOUDFLARE_CROSS_ZONE";
      }
    } else if (checks.error_code === "1014") {
      checks.recommended_fix = "DISABLE_PROXY";
    } else if (checks.error_code === "403_direct_a") {
      checks.recommended_fix = "USE_CNAME";
    } else if (checks.error_code === "403_cloudflare") {
      checks.recommended_fix = "CLOUDFLARE_CROSS_ZONE";
    } else if (checks.error_code === "403") {
      checks.recommended_fix = "CHECK_WAF";
    } else if (checks.error_code === "1000") {
      checks.recommended_fix = "CHECK_DNS";
    } else if (!checks.dns_ok) {
      checks.recommended_fix = "ADD_DNS_RECORDS";
    }
  } catch (e: any) {
    checks.diagnosis = `Health check failed: ${e.message}`;
  }

  return checks;
}

// ── Action: claim-subdomain ──
async function claimSubdomain(userId: string, storeId: string, slug: string) {
  const admin = getSupabaseAdmin();
  const domain = `${slug.toLowerCase()}.eclipserblx.com`;

  const { data: store } = await admin.from("stores").select("id, slug, owner_id").eq("id", storeId).single();
  if (!store || store.owner_id !== userId) return jsonError("Not your store", 403);

  const { data: existing } = await admin.from("store_domains").select("id").eq("domain", domain).single();
  if (existing) return jsonError("Subdomain already claimed", 409);

  const { data: storeExisting } = await admin
    .from("store_domains")
    .select("id")
    .eq("store_id", storeId)
    .eq("domain_type", "subdomain")
    .limit(1);
  if (storeExisting && storeExisting.length > 0) return jsonError("Store already has a subdomain", 409);

  // Subdomains on eclipserblx.com are same-zone — they use the proxied wildcard AAAA record
  // and Worker routing. Do NOT create Custom Hostnames for same-zone subdomains (causes Error 1000).
  const sslStatus = "active"; // SSL handled by wildcard + Worker

  const { data: record, error } = await admin.from("store_domains").insert({
    store_id: storeId,
    domain,
    domain_type: "subdomain",
    status: "active",
    ssl_status: sslStatus,
    verified_at: new Date().toISOString(),
    is_primary: true,
  }).select().single();

  if (error) return jsonError(error.message, 500);
  return jsonOk({ domain: record });
}

// ── Action: request-custom-domain (with Cloudflare auto-detection) ──
async function requestCustomDomain(userId: string, storeId: string, domain: string) {
  const admin = getSupabaseAdmin();

  domain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (domain.endsWith(".eclipserblx.com")) return jsonError("Use claim-subdomain for eclipserblx.com subdomains", 400);
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    return jsonError("Invalid domain format", 400);
  }

  const { data: store } = await admin.from("stores").select("id, owner_id").eq("id", storeId).single();
  if (!store || store.owner_id !== userId) return jsonError("Not your store", 403);

  const { data: existing } = await admin.from("store_domains").select("id, status").eq("domain", domain).neq("status", "removed").single();
  if (existing) return jsonError("Domain already registered", 409);

  await admin.from("store_domains").delete().eq("domain", domain).eq("status", "removed");

  // Auto-detect Cloudflare zone
  const isCloudflare = await detectCloudflareZone(domain);

  const { data: record, error } = await admin.from("store_domains").insert({
    store_id: storeId,
    domain,
    domain_type: "custom",
    status: "pending",
    ssl_status: "pending",
    is_primary: false,
    is_cloudflare_zone: isCloudflare,
  }).select().single();

  if (error) return jsonError(error.message, 500);

  // Return different instructions based on detection
  const instructions = isCloudflare
    ? {
        warning: "CLOUDFLARE_DETECTED",
        message: "Your domain uses Cloudflare DNS. To avoid Error 1000 (cross-zone conflict), you MUST follow these specific steps:",
        step1: `In your Cloudflare dashboard, add a CNAME record: ${domain} → stores.eclipserblx.com — set it to DNS-only (grey cloud)`,
        step2: `Add a TXT record: _eclipsestore-verify.${domain} → ${record.verification_token}`,
        step3: "CRITICAL: Ensure the CNAME proxy status shows a GREY cloud icon, NOT orange",
        step4: "If you still see Error 1000 after verifying, you may need to pause Cloudflare on your domain or use a non-Cloudflare DNS provider",
        alternative: `Alternative: Add an A record for ${domain} → 185.158.133.1 (DNS-only/grey cloud) instead of a CNAME. This may avoid the cross-zone conflict.`,
      }
    : {
        step1: `Add a CNAME record: ${domain} → stores.eclipserblx.com (DNS-only / grey cloud — do NOT proxy your CNAME)`,
        step2: `Add a TXT record: _eclipsestore-verify.${domain} → ${record.verification_token}`,
        step3: "Click 'Verify DNS' once records are set up",
      };

  return jsonOk({ domain: record, instructions, is_cloudflare_zone: isCloudflare });
}

// ── Action: verify-custom-domain ──
async function verifyCustomDomain(userId: string, domainId: string) {
  const admin = getSupabaseAdmin();

  const { data: domainRecord } = await admin
    .from("store_domains")
    .select("*, stores!inner(owner_id)")
    .eq("id", domainId)
    .single();

  if (!domainRecord) return jsonError("Domain not found", 404);
  if ((domainRecord as any).stores?.owner_id !== userId) return jsonError("Not your domain", 403);
  if (domainRecord.domain_type !== "custom") return jsonError("Only custom domains need verification", 400);

  const txtName = `_eclipsestore-verify.${domainRecord.domain}`;
  const dohResp = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtName)}&type=TXT`, {
    headers: { Accept: "application/dns-json" },
  });
  const dohData = await dohResp.json();
  
  const txtRecords: string[] = (dohData?.Answer ?? [])
    .filter((a: any) => a.type === 16)
    .map((a: any) => (a.data ?? "").replace(/"/g, ""));

  const tokenMatch = txtRecords.some((txt: string) => txt === domainRecord.verification_token);

  if (!tokenMatch) {
    // Also re-check Cloudflare status
    const isCloudflare = await detectCloudflareZone(domainRecord.domain);
    await admin.from("store_domains").update({ status: "verifying", is_cloudflare_zone: isCloudflare }).eq("id", domainId);
    return jsonOk({ verified: false, message: "TXT record not found yet. DNS may still be propagating.", expected_token: domainRecord.verification_token, is_cloudflare_zone: isCloudflare });
  }

  const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");

  let sslStatus = "pending";
  let cfHostnameId = null;

  if (cfToken && cfZoneId) {
    try {
      const { data } = await cfFetch<any>(cfToken, `${CF_API}/zones/${cfZoneId}/custom_hostnames`, {
        method: "POST",
        body: JSON.stringify({
          hostname: domainRecord.domain,
          ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
        }),
      });

      if (data?.success) {
        cfHostnameId = data.result?.id;
        sslStatus = data.result?.ssl?.status === "active" ? "active" : "pending";
      } else {
        console.error("Cloudflare custom hostname error:", data?.errors);
        sslStatus = "failed";
      }
    } catch (e) {
      console.error("Cloudflare API error:", e);
      sslStatus = "failed";
    }
  }

  // Re-detect Cloudflare status
  const isCloudflare = await detectCloudflareZone(domainRecord.domain);

  await admin.from("store_domains").update({
    status: "active",
    verified_at: new Date().toISOString(),
    ssl_status: sslStatus,
    cloudflare_hostname_id: cfHostnameId,
    is_cloudflare_zone: isCloudflare,
    updated_at: new Date().toISOString(),
  }).eq("id", domainId);

  // Auto-run health check after verification
  const healthCheck = await performHealthCheck(domainRecord.domain);
  await admin.from("store_domains").update({
    last_health_check: healthCheck,
    last_health_check_at: new Date().toISOString(),
  }).eq("id", domainId);

  return jsonOk({ 
    verified: true, 
    ssl_status: sslStatus, 
    is_cloudflare_zone: isCloudflare,
    health_check: healthCheck,
  });
}

// ── Action: health-check (public for domain owners) ──
async function healthCheckDomain(userId: string, domainId: string) {
  const admin = getSupabaseAdmin();

  const { data: domainRecord } = await admin
    .from("store_domains")
    .select("*, stores!inner(owner_id)")
    .eq("id", domainId)
    .single();

  if (!domainRecord) return jsonError("Domain not found", 404);
  if ((domainRecord as any).stores?.owner_id !== userId) return jsonError("Not your domain", 403);

  const healthCheck = await performHealthCheck(domainRecord.domain);

  // Update Cloudflare zone status based on health check
  await admin.from("store_domains").update({
    last_health_check: healthCheck,
    last_health_check_at: new Date().toISOString(),
    is_cloudflare_zone: healthCheck.is_cloudflare_zone,
  }).eq("id", domainId);

  return jsonOk(healthCheck);
}

// ── Action: admin-health-check (service role only, no owner check) ──
async function adminHealthCheck(domainId: string) {
  const admin = getSupabaseAdmin();

  const { data: domainRecord } = await admin
    .from("store_domains")
    .select("*")
    .eq("id", domainId)
    .single();

  if (!domainRecord) return jsonError("Domain not found", 404);

  const healthCheck = await performHealthCheck(domainRecord.domain);

  await admin.from("store_domains").update({
    last_health_check: healthCheck,
    last_health_check_at: new Date().toISOString(),
    is_cloudflare_zone: healthCheck.is_cloudflare_zone,
  }).eq("id", domainId);

  return jsonOk(healthCheck);
}

// ── Action: auto-fix-dns (uses seller's own Cloudflare token) ──
async function autoFixDns(userId: string, domainId: string) {
  const admin = getSupabaseAdmin();

  // 1. Get domain record + verify ownership
  const { data: domainRecord } = await admin
    .from("store_domains")
    .select("*, stores!inner(owner_id, id)")
    .eq("id", domainId)
    .single();

  if (!domainRecord) return jsonError("Domain not found", 404);
  const storeData = domainRecord as any;
  if (storeData.stores?.owner_id !== userId) return jsonError("Not your domain", 403);

  const storeId = storeData.stores.id;
  const domain = domainRecord.domain;

  // 2. Fetch seller's Cloudflare credentials
  const { data: creds } = await admin
    .from("store_credentials")
    .select("cloudflare_api_token, cloudflare_zone_id")
    .eq("store_id", storeId)
    .single();

  if (!creds?.cloudflare_api_token || !creds?.cloudflare_zone_id) {
    return jsonError("No Cloudflare credentials saved. Add your API Token and Zone ID in domain settings first.", 400);
  }

  const sellerToken = creds.cloudflare_api_token;
  const sellerZoneId = creds.cloudflare_zone_id;
  const fixes: string[] = [];
  const errors: string[] = [];

  try {
    // 3. Verify the token works
    const { data: verifyData } = await cfFetch<any>(sellerToken, `${CF_API}/zones/${sellerZoneId}`);
    if (!verifyData?.success) {
      return jsonError("Invalid Cloudflare credentials. Check your API Token has Zone:DNS:Edit permission and the Zone ID is correct.", 403);
    }

    // 4. Determine preferred record type (apex domains should use A to avoid flattening conflicts)
    const sellerZoneName = (verifyData?.result?.name ?? "").toLowerCase();
    const preferredRecord = getPreferredDnsRecord(domain, sellerZoneName);

    // 5. List existing DNS records for this domain
    const { data: dnsListData } = await cfFetch<any[]>(
      sellerToken,
      `${CF_API}/zones/${sellerZoneId}/dns_records?name=${encodeURIComponent(domain)}`
    );

    const existingRecords = dnsListData?.result ?? [];

    const hasPreferredRecord = existingRecords.some((rec: any) => {
      if (preferredRecord.type === "A") {
        return rec.type === "A" && rec.content === preferredRecord.content && rec.proxied === false;
      }
      return rec.type === "CNAME" && rec.content === preferredRecord.content && rec.proxied === false;
    });

    // 6. Delete conflicting records
    for (const rec of existingRecords) {
      const shouldDelete = preferredRecord.type === "A"
        ? (rec.type === "CNAME" || (rec.type === "A" && (rec.content !== preferredRecord.content || rec.proxied === true)))
        : (rec.type === "A" || (rec.type === "CNAME" && (rec.content !== preferredRecord.content || rec.proxied === true)));

      if (shouldDelete) {
        const { data: delData } = await cfFetch<any>(
          sellerToken,
          `${CF_API}/zones/${sellerZoneId}/dns_records/${rec.id}`,
          { method: "DELETE" }
        );
        if (delData?.success) {
          fixes.push(`Deleted ${rec.type} record: ${rec.name} → ${rec.content}${rec.proxied ? " (proxied)" : ""}`);
        } else {
          errors.push(`Failed to delete ${rec.type} record ${rec.name}: ${JSON.stringify(delData?.errors)}`);
        }
      }
    }

    // 7. Create preferred DNS-only record if missing
    if (!hasPreferredRecord) {
      const { data: createData } = await cfFetch<any>(
        sellerToken,
        `${CF_API}/zones/${sellerZoneId}/dns_records`,
        {
          method: "POST",
          body: JSON.stringify({
            type: preferredRecord.type,
            name: preferredRecord.name,
            content: preferredRecord.content,
            proxied: preferredRecord.proxied,
            ttl: 1,
          }),
        }
      );

      if (createData?.success) {
        fixes.push(`Created ${preferredRecord.type}: ${preferredRecord.name} → ${preferredRecord.content} (DNS-only)`);
      } else {
        errors.push(`Failed to create ${preferredRecord.type}: ${JSON.stringify(createData?.errors)}`);
      }
    }
    const preferredWwwRecord = getPreferredWwwRecord(domain, preferredRecord.type);
    const { data: wwwListData } = await cfFetch<any[]>(
      sellerToken,
      `${CF_API}/zones/${sellerZoneId}/dns_records?name=${encodeURIComponent(preferredWwwRecord.name)}`
    );
    const wwwRecords = wwwListData?.result ?? [];

    const hasPreferredWwwRecord = wwwRecords.some((rec: any) => {
      if (preferredWwwRecord.type === "A") {
        return rec.type === "A" && rec.content === preferredWwwRecord.content && rec.proxied === false;
      }
      return rec.type === "CNAME" && rec.content === preferredWwwRecord.content && rec.proxied === false;
    });

    // Delete bad www records
    for (const rec of wwwRecords) {
      const shouldDelete = preferredWwwRecord.type === "A"
        ? (rec.type === "CNAME" || (rec.type === "A" && (rec.content !== preferredWwwRecord.content || rec.proxied === true)))
        : (rec.type === "A" || (rec.type === "CNAME" && (rec.content !== preferredWwwRecord.content || rec.proxied === true)));

      if (shouldDelete) {
        await cfFetch<any>(sellerToken, `${CF_API}/zones/${sellerZoneId}/dns_records/${rec.id}`, { method: "DELETE" });
        fixes.push(`Deleted conflicting www ${rec.type} record: ${rec.content}${rec.proxied ? " (proxied)" : ""}`);
      }
    }

    // Create preferred www record if needed
    if (!hasPreferredWwwRecord) {
      const { data: wwwData } = await cfFetch<any>(
        sellerToken,
        `${CF_API}/zones/${sellerZoneId}/dns_records`,
        {
          method: "POST",
          body: JSON.stringify({
            type: preferredWwwRecord.type,
            name: preferredWwwRecord.name,
            content: preferredWwwRecord.content,
            proxied: preferredWwwRecord.proxied,
            ttl: 1,
          }),
        }
      );
      if (wwwData?.success) {
        fixes.push(`Created ${preferredWwwRecord.type} for www: ${preferredWwwRecord.name} → ${preferredWwwRecord.content} (DNS-only)`);
      }
    }

    // 8. Check and fix custom hostname SSL if pending
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (cfToken && cfZoneId && domainRecord.cloudflare_hostname_id) {
      const { data: chData } = await cfFetch<any>(
        cfToken,
        `${CF_API}/zones/${cfZoneId}/custom_hostnames/${domainRecord.cloudflare_hostname_id}`
      );
      if (chData?.success) {
        const sslStatus = chData.result?.ssl?.status;
        if (sslStatus === "active") {
          await admin.from("store_domains").update({ ssl_status: "active" }).eq("id", domainId);
          fixes.push("SSL certificate is now active");
        } else if (sslStatus === "pending_validation" || sslStatus === "pending_issuance" || sslStatus === "pending_deployment") {
          fixes.push(`SSL is ${sslStatus} — should activate within a few minutes`);
        } else if (sslStatus === "initializing") {
          // Try to trigger re-validation by patching the custom hostname
          await cfFetch<any>(cfToken, `${CF_API}/zones/${cfZoneId}/custom_hostnames/${domainRecord.cloudflare_hostname_id}`, {
            method: "PATCH",
            body: JSON.stringify({ ssl: { method: "http", type: "dv" } }),
          });
          fixes.push("Triggered SSL re-validation on custom hostname");
        }
      } else {
        // Custom hostname may be broken, try recreating it
        await cfFetch<any>(cfToken, `${CF_API}/zones/${cfZoneId}/custom_hostnames/${domainRecord.cloudflare_hostname_id}`, { method: "DELETE" });
        const { data: newCh } = await cfFetch<any>(cfToken, `${CF_API}/zones/${cfZoneId}/custom_hostnames`, {
          method: "POST",
          body: JSON.stringify({
            hostname: domain,
            ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
          }),
        });
        if (newCh?.success) {
          await admin.from("store_domains").update({
            cloudflare_hostname_id: newCh.result.id,
            ssl_status: "pending",
          }).eq("id", domainId);
          fixes.push("Recreated custom hostname for SSL provisioning");
        } else {
          errors.push(`Failed to recreate custom hostname: ${JSON.stringify(newCh?.errors)}`);
        }
      }
    }

    // 9. Re-run health check
    const healthResult = await performHealthCheck(domain);
    await admin.from("store_domains").update({
      last_health_check: healthResult,
      last_health_check_at: new Date().toISOString(),
      is_cloudflare_zone: healthResult.is_cloudflare_zone,
    }).eq("id", domainId);

    return jsonOk({
      success: errors.length === 0,
      fixes,
      errors,
      health_check: healthResult,
      message: errors.length === 0
        ? `DNS fixed successfully! ${fixes.length} change(s) applied. DNS may take 2-5 minutes to propagate.`
        : `Completed with ${errors.length} error(s). ${fixes.length} fix(es) applied.`,
    });
  } catch (e: any) {
    return jsonError(`Auto-fix failed: ${e.message}`, 500);
  }
}

// ── Action: check-status ──
async function checkStatus(userId: string, domainId: string) {
  const admin = getSupabaseAdmin();

  const { data: domainRecord } = await admin
    .from("store_domains")
    .select("*, stores!inner(owner_id)")
    .eq("id", domainId)
    .single();

  if (!domainRecord) return jsonError("Domain not found", 404);
  if ((domainRecord as any).stores?.owner_id !== userId) return jsonError("Not your domain", 403);

  if (domainRecord.ssl_status === "pending" && domainRecord.cloudflare_hostname_id) {
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");

    if (cfToken && cfZoneId) {
      const { data } = await cfFetch<any>(cfToken, `${CF_API}/zones/${cfZoneId}/custom_hostnames/${domainRecord.cloudflare_hostname_id}`);
      if (data?.success) {
        const newSslStatus = data.result?.ssl?.status === "active" ? "active" : "pending";
        if (newSslStatus !== domainRecord.ssl_status) {
          await admin.from("store_domains").update({ ssl_status: newSslStatus, updated_at: new Date().toISOString() }).eq("id", domainId);
          domainRecord.ssl_status = newSslStatus;
        }
      }
    }
  }

  return jsonOk({
    id: domainRecord.id,
    domain: domainRecord.domain,
    domain_type: domainRecord.domain_type,
    status: domainRecord.status,
    ssl_status: domainRecord.ssl_status,
    verified_at: domainRecord.verified_at,
    is_primary: domainRecord.is_primary,
    is_cloudflare_zone: domainRecord.is_cloudflare_zone,
    last_health_check: domainRecord.last_health_check,
    last_health_check_at: domainRecord.last_health_check_at,
  });
}

// ── Action: remove-domain ──
async function removeDomain(userId: string, domainId: string) {
  const admin = getSupabaseAdmin();

  const { data: domainRecord } = await admin
    .from("store_domains")
    .select("*, stores!inner(owner_id)")
    .eq("id", domainId)
    .single();

  if (!domainRecord) return jsonError("Domain not found", 404);
  if ((domainRecord as any).stores?.owner_id !== userId) return jsonError("Not your domain", 403);

  if (domainRecord.cloudflare_hostname_id) {
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (cfToken && cfZoneId) {
      await cfFetch<any>(cfToken, `${CF_API}/zones/${cfZoneId}/custom_hostnames/${domainRecord.cloudflare_hostname_id}`, {
        method: "DELETE",
      });
    }
  }

  await admin.from("store_domains").update({ status: "removed", updated_at: new Date().toISOString() }).eq("id", domainId);
  return jsonOk({ removed: true });
}

// ── Action: resolve-hostname (public, no auth) ──
async function resolveHostname(hostname: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("store_domains")
    .select("store_id, domain, domain_type, is_primary, stores!inner(slug, name, logo_url, accent_color, banner_url)")
    .eq("domain", hostname.toLowerCase())
    .eq("status", "active")
    .single();

  if (!data) return jsonError("Domain not found", 404);
  return jsonOk(data);
}

// ── Action: admin-fix-hostname (service role / admin — recreate custom hostname + fix seller DNS) ──
async function adminFixHostname(domainId: string) {
  const admin = getSupabaseAdmin();
  const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");
  if (!cfToken || !cfZoneId) return jsonError("Missing Cloudflare credentials", 500);

  const { data: domainRecord } = await admin.from("store_domains").select("*, stores!inner(id)").eq("id", domainId).single();
  if (!domainRecord) return jsonError("Domain not found", 404);

  const domain = domainRecord.domain;
  const storeId = (domainRecord as any).stores?.id;
  const fixes: string[] = [];
  const details: Record<string, unknown> = {};
  const errors: string[] = [];

  // ── Step A: Fix seller's DNS using their Cloudflare credentials (if available) ──
  if (storeId) {
    const { data: creds } = await admin
      .from("store_credentials")
      .select("cloudflare_api_token, cloudflare_zone_id")
      .eq("store_id", storeId)
      .single();

    if (creds?.cloudflare_api_token && creds?.cloudflare_zone_id) {
      const sellerToken = creds.cloudflare_api_token;
      const sellerZoneId = creds.cloudflare_zone_id;

      try {
        // Verify seller token works
        const { data: verifyData } = await cfFetch<any>(sellerToken, `${CF_API}/zones/${sellerZoneId}`);
        if (verifyData?.success) {
          fixes.push("Seller Cloudflare credentials verified");

          // Determine preferred record type using seller zone apex
          const sellerZoneName = (verifyData?.result?.name ?? "").toLowerCase();
          const preferredRecord = getPreferredDnsRecord(domain, sellerZoneName);

          // List existing DNS records
          const { data: dnsListData } = await cfFetch<any[]>(
            sellerToken,
            `${CF_API}/zones/${sellerZoneId}/dns_records?name=${encodeURIComponent(domain)}`
          );
          const existingRecords = dnsListData?.result ?? [];
          details.seller_dns_records = existingRecords.map((r: any) => ({
            type: r.type, name: r.name, content: r.content, proxied: r.proxied,
          }));

          const hasPreferredRecord = existingRecords.some((rec: any) => {
            if (preferredRecord.type === "A") {
              return rec.type === "A" && rec.content === preferredRecord.content && rec.proxied === false;
            }
            return rec.type === "CNAME" && rec.content === preferredRecord.content && rec.proxied === false;
          });

          // Delete conflicting records
          for (const rec of existingRecords) {
            const shouldDelete = preferredRecord.type === "A"
              ? (rec.type === "CNAME" || (rec.type === "A" && (rec.content !== preferredRecord.content || rec.proxied === true)))
              : (rec.type === "A" || (rec.type === "CNAME" && (rec.content !== preferredRecord.content || rec.proxied === true)));

            if (shouldDelete) {
              const { data: delData } = await cfFetch<any>(
                sellerToken,
                `${CF_API}/zones/${sellerZoneId}/dns_records/${rec.id}`,
                { method: "DELETE" }
              );
              if (delData?.success) {
                fixes.push(`Deleted ${rec.type} record: ${rec.name} → ${rec.content}${rec.proxied ? " (proxied)" : ""}`);
              } else {
                errors.push(`Failed to delete ${rec.type} record ${rec.name}: ${JSON.stringify(delData?.errors)}`);
              }
            }
          }

          // Create preferred record if needed
          if (!hasPreferredRecord) {
            const { data: createData } = await cfFetch<any>(
              sellerToken,
              `${CF_API}/zones/${sellerZoneId}/dns_records`,
              {
                method: "POST",
                body: JSON.stringify({
                  type: preferredRecord.type,
                  name: preferredRecord.name,
                  content: preferredRecord.content,
                  proxied: preferredRecord.proxied,
                  ttl: 1,
                }),
              }
            );
            if (createData?.success) {
              fixes.push(`Created ${preferredRecord.type}: ${preferredRecord.name} → ${preferredRecord.content} (DNS-only)`);
            } else {
              errors.push(`Failed to create ${preferredRecord.type}: ${JSON.stringify(createData?.errors)}`);
            }
          }
        } else {
          errors.push("Seller Cloudflare credentials are invalid");
        }
      } catch (e: any) {
        errors.push(`Seller DNS fix error: ${e.message}`);
      }
    } else {
      details.seller_dns = "No Cloudflare credentials stored for this store";
    }
  }

  // ── Step B: Fix custom hostname on OUR Cloudflare zone ──
  if (domainRecord.cloudflare_hostname_id) {
    const { data: chData } = await cfFetch<any>(cfToken, `${CF_API}/zones/${cfZoneId}/custom_hostnames/${domainRecord.cloudflare_hostname_id}`);
    if (chData?.success) {
      details.existing_hostname = {
        id: chData.result.id,
        hostname: chData.result.hostname,
        status: chData.result.status,
        ssl_status: chData.result.ssl?.status,
        ssl_validation_errors: chData.result.ssl?.validation_errors,
      };

      const sslStatus = chData.result.ssl?.status;
      if (sslStatus === "active") {
        await admin.from("store_domains").update({ ssl_status: "active" }).eq("id", domainId);
        fixes.push("SSL already active — updated database");
      } else {
        fixes.push(`Current SSL status: ${sslStatus} — deleting and recreating hostname`);
        await cfFetch<any>(cfToken, `${CF_API}/zones/${cfZoneId}/custom_hostnames/${domainRecord.cloudflare_hostname_id}`, { method: "DELETE" });
        fixes.push("Deleted old custom hostname");
      }
    } else {
      details.existing_hostname_error = chData?.errors;
      fixes.push("Old custom hostname not found or errored — will create new one");
    }
  }

  // Create new custom hostname if needed
  const needsNew = !domainRecord.cloudflare_hostname_id || 
    (details.existing_hostname && (details.existing_hostname as any).ssl_status !== "active");

  if (needsNew) {
    const { data: newCh } = await cfFetch<any>(cfToken, `${CF_API}/zones/${cfZoneId}/custom_hostnames`, {
      method: "POST",
      body: JSON.stringify({
        hostname: domain,
        ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
      }),
    });

    if (newCh?.success) {
      const newId = newCh.result.id;
      const newSslStatus = newCh.result.ssl?.status;
      await admin.from("store_domains").update({
        cloudflare_hostname_id: newId,
        ssl_status: newSslStatus === "active" ? "active" : "pending",
      }).eq("id", domainId);
      fixes.push(`Created new custom hostname: ${newId}, SSL: ${newSslStatus}`);
      details.new_hostname = { id: newId, ssl_status: newSslStatus };
    } else {
      details.create_error = newCh?.errors;
      // Try to find existing
      const { data: listCh } = await cfFetch<any[]>(cfToken, `${CF_API}/zones/${cfZoneId}/custom_hostnames?hostname=${encodeURIComponent(domain)}`);
      if (listCh?.success && listCh.result?.length > 0) {
        const existing = listCh.result[0];
        await admin.from("store_domains").update({
          cloudflare_hostname_id: existing.id,
          ssl_status: existing.ssl?.status === "active" ? "active" : "pending",
        }).eq("id", domainId);
        fixes.push(`Found existing hostname: ${existing.id}, SSL: ${existing.ssl?.status}`);
      } else {
        errors.push("Failed to create custom hostname");
      }
    }
  }

  // ── Step C: Re-run health check ──
  const healthResult = await performHealthCheck(domain);
  await admin.from("store_domains").update({
    last_health_check: healthResult,
    last_health_check_at: new Date().toISOString(),
    is_cloudflare_zone: healthResult.is_cloudflare_zone,
  }).eq("id", domainId);

  return jsonOk({
    domain,
    fixes,
    errors,
    details,
    health_check: healthResult,
    message: errors.length === 0
      ? `Fixed! ${fixes.length} change(s) applied. DNS may take 2-5 minutes to propagate.`
      : `Completed with ${errors.length} error(s). ${fixes.length} fix(es) applied.`,
  });
}

// ── Action: admin-verify-domain (service role only) ──
async function adminVerifyDomain(domainId: string) {
  const admin = getSupabaseAdmin();

  const { data: domainRecord } = await admin
    .from("store_domains")
    .select("*")
    .eq("id", domainId)
    .single();

  if (!domainRecord) return jsonError("Domain not found", 404);
  if (domainRecord.domain_type !== "custom") return jsonError("Only custom domains need verification", 400);

  const txtName = `_eclipsestore-verify.${domainRecord.domain}`;
  const dohResp = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtName)}&type=TXT`, {
    headers: { Accept: "application/dns-json" },
  });
  const dohData = await dohResp.json();
  
  const txtRecords: string[] = (dohData?.Answer ?? [])
    .filter((a: any) => a.type === 16)
    .map((a: any) => (a.data ?? "").replace(/"/g, ""));

  const tokenMatch = txtRecords.some((txt: string) => txt === domainRecord.verification_token);

  if (!tokenMatch) {
    return jsonOk({ verified: false, message: "TXT record not found", expected_token: domainRecord.verification_token, found_records: txtRecords });
  }

  const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");

  let sslStatus = "pending";
  let cfHostnameId = null;

  if (cfToken && cfZoneId) {
    try {
      const { data } = await cfFetch<any>(cfToken, `${CF_API}/zones/${cfZoneId}/custom_hostnames`, {
        method: "POST",
        body: JSON.stringify({
          hostname: domainRecord.domain,
          ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
        }),
      });

      if (data?.success) {
        cfHostnameId = data.result?.id;
        sslStatus = data.result?.ssl?.status === "active" ? "active" : "pending";
      } else {
        console.error("Cloudflare custom hostname error:", data?.errors);
        return jsonOk({ verified: true, cloudflare_error: data?.errors, message: "TXT verified but Cloudflare provisioning failed" });
      }
    } catch (e) {
      console.error("Cloudflare API error:", e);
      sslStatus = "failed";
    }
  }

  const isCloudflare = await detectCloudflareZone(domainRecord.domain);

  await admin.from("store_domains").update({
    status: "active",
    verified_at: new Date().toISOString(),
    ssl_status: sslStatus,
    cloudflare_hostname_id: cfHostnameId,
    is_cloudflare_zone: isCloudflare,
    updated_at: new Date().toISOString(),
  }).eq("id", domainId);

  // Auto-run health check
  const healthCheck = await performHealthCheck(domainRecord.domain);
  await admin.from("store_domains").update({
    last_health_check: healthCheck,
    last_health_check_at: new Date().toISOString(),
  }).eq("id", domainId);

  return jsonOk({ verified: true, ssl_status: sslStatus, cloudflare_hostname_id: cfHostnameId, is_cloudflare_zone: isCloudflare, health_check: healthCheck });
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // Public actions - no auth needed
    if (action === "resolve-hostname") {
      if (!body.hostname) return jsonError("hostname required", 400);
      return await resolveHostname(body.hostname);
    }

    // Admin health check / fix — requires service role OR authenticated admin/moderator
    if (action === "admin-health-check" || action === "admin-fix-hostname") {
      const apiKey = req.headers.get("apikey") ?? "";
      const authToken = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      let authorized = apiKey === serviceKey || authToken === serviceKey;
      
      if (!authorized) {
        const adminUser = await getAuthUser(req);
        if (adminUser) {
          const adminDb = getSupabaseAdmin();
          const { data: roles } = await adminDb.from("user_roles").select("role").eq("user_id", adminUser.id);
          authorized = roles?.some((r: any) => r.role === "admin" || r.role === "moderator") ?? false;
        }
      }
      
      if (authorized) {
        if (!body.domain_id) return jsonError("domain_id required", 400);
        if (action === "admin-health-check") return await adminHealthCheck(body.domain_id);
        if (action === "admin-fix-hostname") return await adminFixHostname(body.domain_id);
      }
    }

    // Admin actions (service role only or admin_secret)
    const isAdmin = isServiceRoleAuth(req) || body?.admin_secret === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (isAdmin) {
      if (action === "admin-verify-domain") {
        if (!body.domain_id) return jsonError("domain_id required", 400);
        return await adminVerifyDomain(body.domain_id);
      }
      if (action === "admin-health-check") {
        if (!body.domain_id) return jsonError("domain_id required", 400);
        return await adminHealthCheck(body.domain_id);
      }
      if (action === "admin-fix-hostname") {
        if (!body.domain_id) return jsonError("domain_id required", 400);
        return await adminFixHostname(body.domain_id);
      }
    }

    if (action === "admin-verify-domain") {
      const adminSecret = body?.admin_secret;
      if (adminSecret !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
        return unauthorized("Admin access required");
      }
      if (!body.domain_id) return jsonError("domain_id required", 400);
      return await adminVerifyDomain(body.domain_id);
    }

    // All other actions require auth
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    switch (action) {
      case "claim-subdomain":
        if (!body.store_id || !body.slug) return jsonError("store_id and slug required", 400);
        return await claimSubdomain(user.id, body.store_id, body.slug);

      case "request-custom-domain":
        if (!body.store_id || !body.domain) return jsonError("store_id and domain required", 400);
        return await requestCustomDomain(user.id, body.store_id, body.domain);

      case "verify-custom-domain":
        if (!body.domain_id) return jsonError("domain_id required", 400);
        return await verifyCustomDomain(user.id, body.domain_id);

      case "check-status":
        if (!body.domain_id) return jsonError("domain_id required", 400);
        return await checkStatus(user.id, body.domain_id);

      case "health-check":
        if (!body.domain_id) return jsonError("domain_id required", 400);
        return await healthCheckDomain(user.id, body.domain_id);

      case "remove-domain":
        if (!body.domain_id) return jsonError("domain_id required", 400);
        return await removeDomain(user.id, body.domain_id);

      case "auto-fix-dns":
        if (!body.domain_id) return jsonError("domain_id required", 400);
        return await autoFixDns(user.id, body.domain_id);

      default:
        return jsonError("Unknown action. Supported: claim-subdomain, request-custom-domain, verify-custom-domain, check-status, health-check, remove-domain, auto-fix-dns, resolve-hostname", 400);
    }
  } catch (e) {
    return internalError(e);
  }
});
