import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) {
      return jsonOk({ error: "Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID" }, 500);
    }

    const zoneBase = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`;
    const targetIp = "185.158.133.1";
    const wildcardName = "*.eclipserblx.com";

    // Check if wildcard A record already exists
    const listResp = await fetch(`${zoneBase}/dns_records?type=A&name=${encodeURIComponent(wildcardName)}&per_page=10`, {
      headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
    });
    const listData = await listResp.json();

    if (listData?.result?.length > 0) {
      const existing = listData.result[0];
      if (existing.content === targetIp && existing.proxied === true) {
        return jsonOk({ action: "already_exists", record: existing });
      }
      // Update existing record
      const updateResp = await fetch(`${zoneBase}/dns_records/${existing.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "A", name: wildcardName, content: targetIp, proxied: true, ttl: 1 }),
      });
      const updateData = await updateResp.json();
      return jsonOk({ action: "updated", ok: updateData?.success, record: updateData?.result });
    }

    // Create new wildcard A record
    const createResp = await fetch(`${zoneBase}/dns_records`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "A", name: wildcardName, content: targetIp, proxied: true, ttl: 1 }),
    });
    const createData = await createResp.json();
    return jsonOk({ action: "created", ok: createData?.success, record: createData?.result, errors: createData?.errors });
  } catch (e) {
    return internalError(e);
  }
});
