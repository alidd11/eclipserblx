const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID")!;

    const cfFetch = async (url: string) => {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${cfToken}` } });
      return r.json();
    };

    // Get account ID
    const zone = await cfFetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}`);
    const accountId = zone.result?.account?.id;

    // Get worker script metadata
    const workerSettings = await cfFetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy/settings`
    );
    
    // Get worker deployments
    const deployments = await cfFetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy/deployments`
    );

    // Get worker tail (recent invocations)
    const usage = await cfFetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy/usage-model`
    );

    // Get subdomain  
    const subdomain = await cfFetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`
    );

    // Check if there's a workers.dev route enabled
    const workerScript = await cfFetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy`
    );

    // Also check if there are Configuration Rules that might disable features
    const configRulesPhases = [
      "http_config_settings",
      "http_request_cache_settings", 
    ];
    const configResults: Record<string, unknown> = {};
    for (const phase of configRulesPhases) {
      try {
        const r = await cfFetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/phases/${phase}/entrypoint`
        );
        configResults[phase] = r.result?.rules?.map((rule: any) => ({
          description: rule.description,
          expression: rule.expression,
          action: rule.action,
          enabled: rule.enabled,
        })) || [];
      } catch {
        configResults[phase] = "not found";
      }
    }

    return new Response(JSON.stringify({
      accountId,
      workerSettings: workerSettings.result || workerSettings.errors,
      deployments: deployments.result || deployments.errors,
      usage: usage.result || usage.errors,
      subdomain: subdomain.result || subdomain.errors,
      workerModifiedOn: workerScript.result?.modified_on,
      workerCompatDate: workerScript.result?.compatibility_date,
      configRules: configResults,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
