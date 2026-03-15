import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) return jsonOk({ error: "Missing secrets" }, 500);

    const headers = { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" };
    const zoneBase = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`;

    // 1. Get zone info + account ID
    const zoneResp = await fetch(`${zoneBase}`, { headers });
    const zoneData = await zoneResp.json();
    const accountId = zoneData.result?.account?.id;

    // 2. Get worker routes
    const routesResp = await fetch(`${zoneBase}/workers/routes`, { headers });
    const routesData = await routesResp.json();

    // 3. Get worker script info
    const scriptResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy`,
      { headers }
    );
    const scriptData = await scriptResp.json();

    // 4. Get worker custom domains
    const domainsResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains?service=eclipse-og-proxy`,
      { headers }
    );
    const domainsData = await domainsResp.json();

    // 5. Get redirect rules
    const redirectResp = await fetch(
      `${zoneBase}/rulesets/phases/http_request_dynamic_redirect/entrypoint`,
      { headers }
    );
    const redirectData = await redirectResp.json();

    // 6. Get page rules
    const pageRulesResp = await fetch(`${zoneBase}/pagerules`, { headers });
    const pageRulesData = await pageRulesResp.json();

    // 7. Test fetch to the actual site with headers inspection
    const testResp = await fetch("https://eclipserblx.com/share/products/10002", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" },
      redirect: "manual",
    });
    const testHeaders: Record<string, string> = {};
    testResp.headers.forEach((v, k) => { testHeaders[k] = v; });
    const testBody = await testResp.text();

    return jsonOk({
      zone: { name: zoneData.result?.name, status: zoneData.result?.status, paused: zoneData.result?.paused },
      routes: routesData.result,
      workerScript: { success: scriptData.success, id: scriptData.result?.id, modified: scriptData.result?.modified_on, errors: scriptData.errors },
      customDomains: domainsData.result,
      redirectRules: redirectData.result?.rules?.map((r: any) => ({ description: r.description, expression: r.expression, enabled: r.enabled })),
      pageRules: pageRulesData.result?.map((r: any) => ({ targets: r.targets, actions: r.actions, status: r.status })),
      liveTest: {
        url: "https://eclipserblx.com/share/products/10002",
        status: testResp.status,
        xWorker: testHeaders["x-eclipse-worker"] || null,
        cfRay: testHeaders["cf-ray"] || null,
        server: testHeaders["server"] || null,
        location: testHeaders["location"] || null,
        hasOgTitle: testBody.includes("og:title"),
        hasMetaRefresh: testBody.includes("meta http-equiv=\"refresh\""),
        first300: testBody.slice(0, 300),
      },
    });
  } catch (e) {
    return internalError(e);
  }
});
