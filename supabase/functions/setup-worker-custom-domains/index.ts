import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

const WORKER_NAME = "eclipse-og-proxy";
const DOMAINS = ["eclipserblx.com", "www.eclipserblx.com"];

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) {
      return jsonOk({ error: "Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID" }, 500);
    }

    const headers = {
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json",
    };

    // First, get the account ID from the zone
    const zoneResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`, { headers });
    const zoneData = await zoneResp.json();
    if (!zoneData?.success) {
      return jsonOk({ error: "Failed to fetch zone", details: zoneData?.errors }, 500);
    }
    const accountId = zoneData.result.account.id;

    // Check existing custom domains for this worker
    const existingResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains?zone_id=${CF_ZONE_ID}&service=${WORKER_NAME}`,
      { headers }
    );
    const existingData = await existingResp.json();
    const existingDomains = (existingData?.result || []).map((d: any) => d.hostname);

    const results: any[] = [];

    for (const domain of DOMAINS) {
      if (existingDomains.includes(domain)) {
        results.push({ domain, action: "already_exists" });
        continue;
      }

      // Add custom domain binding
      const addResp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            hostname: domain,
            zone_id: CF_ZONE_ID,
            service: WORKER_NAME,
            environment: "production",
          }),
        }
      );
      const addData = await addResp.json();
      results.push({
        domain,
        action: addData?.success ? "added" : "failed",
        result: addData?.result,
        errors: addData?.errors,
      });
    }

    // Now list existing Worker Routes so user knows which to clean up
    const routesResp = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/workers/routes`,
      { headers }
    );
    const routesData = await routesResp.json();
    const oldRoutes = (routesData?.result || []).filter(
      (r: any) =>
        r.script === WORKER_NAME &&
        (r.pattern === "eclipserblx.com/*" || r.pattern === "www.eclipserblx.com/*")
    );

    // Auto-delete the old routes
    const deletedRoutes: any[] = [];
    for (const route of oldRoutes) {
      const delResp = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/workers/routes/${route.id}`,
        { method: "DELETE", headers }
      );
      const delData = await delResp.json();
      deletedRoutes.push({
        pattern: route.pattern,
        id: route.id,
        deleted: delData?.success,
      });
    }

    return jsonOk({
      custom_domains: results,
      deleted_old_routes: deletedRoutes,
      note: "Custom domain bindings added. Old route-based entries cleaned up. The *.eclipserblx.com/* wildcard route is preserved for store subdomains.",
    });
  } catch (e) {
    return internalError(e);
  }
});
