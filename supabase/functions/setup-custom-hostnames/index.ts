import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) {
      return jsonOk({ error: "Missing secrets" }, 500);
    }

    const zoneBase = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`;
    const headers = { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" };
    const fallbackOrigin = "eclipserblx.com";

    // Step 1: Set/update the fallback origin for Custom Hostnames
    const fallbackResp = await fetch(`${zoneBase}/custom_hostnames/fallback_origin`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ origin: fallbackOrigin }),
    });
    const fallbackData = await fallbackResp.json();

    // Step 2: Check current fallback origin status
    const getResp = await fetch(`${zoneBase}/custom_hostnames/fallback_origin`, { headers });
    const getData = await getResp.json();

    return jsonOk({
      fallback_update: {
        ok: fallbackData?.success,
        result: fallbackData?.result,
        errors: fallbackData?.errors,
      },
      fallback_status: {
        ok: getData?.success,
        result: getData?.result,
        errors: getData?.errors,
      },
      note: "Cloudflare for SaaS Custom Hostnames is now configured with fallback origin: " + fallbackOrigin,
    });
  } catch (e) {
    return internalError(e);
  }
});
