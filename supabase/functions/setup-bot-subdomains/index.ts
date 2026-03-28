import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

const BOT_SUBDOMAINS = [
  { name: "staff", target: "proxy-eu.apollopanel.com" },
  { name: "tracker", target: "proxy-eu.apollopanel.com" },
  { name: "forms", target: "proxy-eu.apollopanel.com" },
];

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) {
      return jsonOk({ error: "Missing Cloudflare secrets" }, 500);
    }

    const zoneBase = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`;
    const headers = { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" };
    const results: Record<string, unknown>[] = [];

    for (const sub of BOT_SUBDOMAINS) {
      const fqdn = `${sub.name}.eclipserblx.com`;

      // Check for existing records with this name
      const listRes = await fetch(
        `${zoneBase}/dns_records?name=${encodeURIComponent(fqdn)}`,
        { headers }
      );
      const listData = await listRes.json();

      // Delete any existing A/AAAA/CNAME records for this subdomain
      if (listData?.result?.length) {
        for (const rec of listData.result) {
          if (["A", "AAAA", "CNAME"].includes(rec.type)) {
            await fetch(`${zoneBase}/dns_records/${rec.id}`, {
              method: "DELETE",
              headers,
            });
          }
        }
      }

      // Create CNAME record with proxied: false (DNS-only / grey cloud)
      const createRes = await fetch(`${zoneBase}/dns_records`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "CNAME",
          name: sub.name,
          content: sub.target,
          proxied: false,
          ttl: 1, // auto
          comment: "Apollo Panel bot subdomain - DNS only",
        }),
      });
      const createData = await createRes.json();

      results.push({
        subdomain: fqdn,
        target: sub.target,
        success: createData?.success,
        id: createData?.result?.id,
        errors: createData?.errors,
      });
    }

    return jsonOk({
      message: "Bot subdomain CNAME records created (DNS-only mode)",
      results,
    });
  } catch (e) {
    return internalError(e);
  }
});
