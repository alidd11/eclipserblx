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

// ── Action: claim-subdomain ──
async function claimSubdomain(userId: string, storeId: string, slug: string) {
  const admin = getSupabaseAdmin();
  const domain = `${slug.toLowerCase()}.eclipserblx.com`;

  // Verify store ownership
  const { data: store } = await admin.from("stores").select("id, slug, owner_id").eq("id", storeId).single();
  if (!store || store.owner_id !== userId) return jsonError("Not your store", 403);

  // Check if domain already taken
  const { data: existing } = await admin.from("store_domains").select("id").eq("domain", domain).single();
  if (existing) return jsonError("Subdomain already claimed", 409);

  // Check if store already has a subdomain
  const { data: storeExisting } = await admin
    .from("store_domains")
    .select("id")
    .eq("store_id", storeId)
    .eq("domain_type", "subdomain")
    .limit(1);
  if (storeExisting && storeExisting.length > 0) return jsonError("Store already has a subdomain", 409);

  // Wildcard DNS handles *.eclipserblx.com, just register in DB as active
  const { data: record, error } = await admin.from("store_domains").insert({
    store_id: storeId,
    domain,
    domain_type: "subdomain",
    status: "active",
    ssl_status: "active", // Wildcard SSL covers it
    verified_at: new Date().toISOString(),
    is_primary: true,
  }).select().single();

  if (error) return jsonError(error.message, 500);
  return jsonOk({ domain: record });
}

// ── Action: request-custom-domain ──
async function requestCustomDomain(userId: string, storeId: string, domain: string) {
  const admin = getSupabaseAdmin();

  // Normalize domain
  domain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Validate
  if (domain.endsWith(".eclipserblx.com")) return jsonError("Use claim-subdomain for eclipserblx.com subdomains", 400);
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    return jsonError("Invalid domain format", 400);
  }

  // Verify store ownership
  const { data: store } = await admin.from("stores").select("id, owner_id").eq("id", storeId).single();
  if (!store || store.owner_id !== userId) return jsonError("Not your store", 403);

  // Check if domain already registered
  const { data: existing } = await admin.from("store_domains").select("id").eq("domain", domain).single();
  if (existing) return jsonError("Domain already registered", 409);

  const { data: record, error } = await admin.from("store_domains").insert({
    store_id: storeId,
    domain,
    domain_type: "custom",
    status: "pending",
    ssl_status: "pending",
    is_primary: false,
  }).select().single();

  if (error) return jsonError(error.message, 500);

  return jsonOk({
    domain: record,
    instructions: {
      step1: `Add a CNAME record: ${domain} → stores.eclipserblx.com`,
      step2: `Add a TXT record: _eclipsestore-verify.${domain} → ${record.verification_token}`,
      step3: "Click 'Verify DNS' once records are set up",
    },
  });
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

  // Check TXT record via DNS over HTTPS (Cloudflare DoH)
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
    await admin.from("store_domains").update({ status: "verifying" }).eq("id", domainId);
    return jsonOk({ verified: false, message: "TXT record not found yet. DNS may still be propagating.", expected_token: domainRecord.verification_token });
  }

  // Verified! Now provision SSL via Cloudflare Custom Hostnames
  const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");

  let sslStatus = "pending";
  let cfHostnameId = null;

  if (cfToken && cfZoneId) {
    try {
      const { resp, data } = await cfFetch<any>(cfToken, `${CF_API}/zones/${cfZoneId}/custom_hostnames`, {
        method: "POST",
        body: JSON.stringify({
          hostname: domainRecord.domain,
          ssl: {
            method: "http",
            type: "dv",
            settings: { min_tls_version: "1.2" },
          },
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

  await admin.from("store_domains").update({
    status: "active",
    verified_at: new Date().toISOString(),
    ssl_status: sslStatus,
    cloudflare_hostname_id: cfHostnameId,
    updated_at: new Date().toISOString(),
  }).eq("id", domainId);

  return jsonOk({ verified: true, ssl_status: sslStatus });
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

  // If SSL pending and has cloudflare hostname ID, check status
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

  // Clean up Cloudflare custom hostname if exists
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

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // Public action - no auth needed
    if (action === "resolve-hostname") {
      if (!body.hostname) return jsonError("hostname required", 400);
      return await resolveHostname(body.hostname);
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

      case "remove-domain":
        if (!body.domain_id) return jsonError("domain_id required", 400);
        return await removeDomain(user.id, body.domain_id);

      default:
        return jsonError("Unknown action. Supported: claim-subdomain, request-custom-domain, verify-custom-domain, check-status, remove-domain, resolve-hostname", 400);
    }
  } catch (e) {
    return internalError(e);
  }
});
