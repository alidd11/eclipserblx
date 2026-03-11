const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");
  if (!cfToken || !cfZoneId) {
    return new Response(JSON.stringify({ error: "Missing CF creds" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cfApi = async (url: string) => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${cfToken}` },
    });
    return res.json();
  };

  // Check page rules (these can override/disable workers)
  const pageRules = await cfApi(
    `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/pagerules`
  );

  // Check worker routes
  const workerRoutes = await cfApi(
    `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes`
  );

  // Check worker script details
  const zone = await cfApi(
    `https://api.cloudflare.com/client/v4/zones/${cfZoneId}`
  );
  const accountId = zone.result?.account?.id;

  let workerDetails = null;
  let workerSubdomainEnabled = null;
  if (accountId) {
    workerDetails = await cfApi(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy`
    );
    // Check if worker has any deployment issues
    const deployments = await cfApi(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy/deployments`
    );
    workerSubdomainEnabled = deployments;
  }

  // Check configuration rules that might affect worker execution
  const configRules = await cfApi(
    `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/phases/http_config_settings/entrypoint`
  );

  return new Response(JSON.stringify({
    pageRules: pageRules.result || [],
    workerRoutes: workerRoutes.result || [],
    workerExists: !!workerDetails?.result,
    workerId: workerDetails?.result?.id || null,
    workerModifiedOn: workerDetails?.result?.modified_on || null,
    deployments: workerSubdomainEnabled?.result || null,
    configRules: configRules.result?.rules || [],
    pageRuleCount: (pageRules.result || []).length,
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
