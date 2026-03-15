import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

const WORKER_NAME = "eclipse-og-proxy";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) {
      return jsonOk({ error: "Missing secrets" }, 500);
    }

    const headers = {
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json",
    };

    const zoneBase = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`;

    // Re-add the worker routes we accidentally deleted
    const routes = ["eclipserblx.com/*", "www.eclipserblx.com/*"];
    const results: any[] = [];

    // First check existing routes
    const listResp = await fetch(`${zoneBase}/workers/routes`, { headers });
    const listData = await listResp.json();
    const existingPatterns = (listData?.result || []).map((r: any) => r.pattern);

    for (const pattern of routes) {
      if (existingPatterns.includes(pattern)) {
        results.push({ pattern, action: "already_exists" });
        continue;
      }

      const addResp = await fetch(`${zoneBase}/workers/routes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ pattern, script: WORKER_NAME }),
      });
      const addData = await addResp.json();
      results.push({
        pattern,
        action: addData?.success ? "added" : "failed",
        result: addData?.result,
        errors: addData?.errors,
      });
    }

    return jsonOk({ routes: results });
  } catch (e) {
    return internalError(e);
  }
});
