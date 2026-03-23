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

    // Purge everything for the zone
    const purgeResp = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ purge_everything: true }),
      }
    );
    const purgeData = await purgeResp.json();

    return jsonOk({
      success: purgeData?.success,
      message: purgeData?.success
        ? "Full cache purge completed"
        : "Purge may have failed",
      result: purgeData?.result,
      errors: purgeData?.errors,
    });
  } catch (e) {
    return internalError(e);
  }
});
