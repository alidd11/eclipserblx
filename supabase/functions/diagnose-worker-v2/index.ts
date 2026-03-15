import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) return jsonOk({ error: "Missing secrets" }, 500);

    const headers: Record<string, string> = { 
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json"
    };

    // 1. Create a simple response header transform rule to test if rules execute
    const phase = "http_response_headers_transform";
    const testRuleName = "Eclipse Test Header Rule";
    
    // Check if entrypoint exists
    const epResp = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets/phases/${phase}/entrypoint`,
      { headers }
    );
    const epData = await epResp.json();
    
    let rulesetResult: any;
    const testRule = {
      action: "rewrite",
      action_parameters: {
        headers: {
          "X-Eclipse-Test-Rule": {
            operation: "set",
            value: "rules-working-" + Date.now()
          }
        }
      },
      expression: "true", // matches ALL requests
      description: testRuleName,
      enabled: true,
    };

    if (epData.success && epData.result?.id) {
      // Update existing ruleset
      const existingRules = epData.result.rules || [];
      const otherRules = existingRules.filter((r: any) => r.description !== testRuleName);
      const allRules = [testRule, ...otherRules];
      
      const updateResp = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets/${epData.result.id}`,
        { 
          method: "PUT",
          headers,
          body: JSON.stringify({
            rules: allRules.map((r: any) => ({
              action: r.action,
              action_parameters: r.action_parameters,
              expression: r.expression,
              description: r.description,
              enabled: r.enabled,
            })),
          }),
        }
      );
      rulesetResult = await updateResp.json();
    } else {
      // Create new ruleset
      const createResp = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: "Eclipse Response Header Rules",
            kind: "zone",
            phase,
            rules: [testRule],
          }),
        }
      );
      rulesetResult = await createResp.json();
    }

    // 2. Wait a moment then test
    await new Promise(r => setTimeout(r, 2000));

    // 3. Make a test request to see if the header appears
    let testResult: any = null;
    try {
      const testResp = await fetch("https://eclipserblx.com/", {
        headers: { "User-Agent": "Mozilla/5.0 Test" },
        redirect: "manual"
      });
      const allHeaders = Object.fromEntries([...testResp.headers.entries()]);
      testResult = {
        status: testResp.status,
        hasTestHeader: !!allHeaders["x-eclipse-test-rule"],
        testHeaderValue: allHeaders["x-eclipse-test-rule"] || null,
        hasWorkerHeader: !!allHeaders["x-eclipse-worker"],
        workerHeaderValue: allHeaders["x-eclipse-worker"] || null,
        cfRay: allHeaders["cf-ray"] || null,
        server: allHeaders["server"] || null,
        // Show all x- headers for debugging
        xHeaders: Object.fromEntries(
          Object.entries(allHeaders).filter(([k]) => k.startsWith("x-"))
        ),
      };
    } catch (e) {
      testResult = { error: (e as Error).message };
    }

    // 4. Check zone plan
    const zoneResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`, { headers });
    const zoneData = await zoneResp.json();

    return jsonOk({
      ruleCreated: rulesetResult?.success,
      ruleErrors: rulesetResult?.errors,
      testResult,
      zonePlan: zoneData.result?.plan?.name,
      zoneStatus: zoneData.result?.status,
      zonePaused: zoneData.result?.paused,
    });
  } catch (e) {
    return internalError(e);
  }
});
