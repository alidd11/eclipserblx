import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { handleCors, jsonOk, jsonError, internalError } from "../_shared/edge-response.ts";

const CF_API = "https://api.cloudflare.com/client/v4";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const body = await req.json().catch(() => ({}));
    const domainId = body?.domain_id;
    if (!domainId) return jsonError("domain_id required", 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: domainRecord } = await admin
      .from("store_domains")
      .select("*")
      .eq("id", domainId)
      .single();

    if (!domainRecord) return jsonError("Domain not found", 404);

    // Check TXT record via DNS over HTTPS
    const txtName = `_eclipsestore-verify.${domainRecord.domain}`;
    const dohResp = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtName)}&type=TXT`, {
      headers: { Accept: "application/dns-json" },
    });
    const dohData = await dohResp.json();
    
    const txtRecords: string[] = (dohData?.Answer ?? [])
      .filter((a: any) => a.type === 16)
      .map((a: any) => (a.data ?? "").replace(/"/g, ""));

    const tokenMatch = txtRecords.some((txt: string) => txt === domainRecord.verification_token);

    // Provision Cloudflare Custom Hostname regardless of TXT (admin override)
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");

    let sslStatus = "pending";
    let cfHostnameId = null;
    let cfErrors = null;

    if (cfToken && cfZoneId) {
      const resp = await fetch(`${CF_API}/zones/${cfZoneId}/custom_hostnames`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostname: domainRecord.domain,
          ssl: {
            method: "http",
            type: "dv",
            settings: { min_tls_version: "1.2" },
          },
        }),
      });
      const data = await resp.json();

      if (data?.success) {
        cfHostnameId = data.result?.id;
        sslStatus = data.result?.ssl?.status === "active" ? "active" : "pending";
      } else {
        cfErrors = data?.errors;
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

    return jsonOk({
      domain: domainRecord.domain,
      txt_verified: tokenMatch,
      txt_records_found: txtRecords,
      ssl_status: sslStatus,
      cloudflare_hostname_id: cfHostnameId,
      cloudflare_errors: cfErrors,
    });
  } catch (e) {
    return internalError(e);
  }
});
