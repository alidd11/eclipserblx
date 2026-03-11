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

  async function cfGet(path: string) {
    const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
    });
    return res.json();
  }

  // Check routes
  const routes = await cfGet(`/zones/${cfZoneId}/workers/routes`);
  
  // Check worker script info
  const zone = await cfGet(`/zones/${cfZoneId}`);
  const accountId = zone.result?.account?.id;
  
  let workerInfo = null;
  let workerSubdomains = null;
  if (accountId) {
    workerInfo = await cfGet(`/accounts/${accountId}/workers/scripts/eclipse-og-proxy`);
    workerSubdomains = await cfGet(`/accounts/${accountId}/workers/subdomain`);
  }

  // Check redirect rules
  const redirectRules = await cfGet(`/zones/${cfZoneId}/rulesets/phases/http_request_dynamic_redirect/entrypoint`);
  
  // Check WAF rules
  const wafRulesets = await cfGet(`/zones/${cfZoneId}/rulesets`);
  const wafPhase = wafRulesets.result?.find((r: any) => r.phase === "http_request_firewall_custom");
  let wafRules = null;
  if (wafPhase) {
    wafRules = await cfGet(`/zones/${cfZoneId}/rulesets/${wafPhase.id}`);
  }

  // Check bot management
  const botMgmt = await cfGet(`/zones/${cfZoneId}/bot_management`);

  return new Response(JSON.stringify({
    routes: routes.result?.map((r: any) => ({ pattern: r.pattern, script: r.script, id: r.id })),
    workerExists: workerInfo?.success,
    workerErrors: workerInfo?.errors,
    redirectRules: redirectRules.result?.rules?.map((r: any) => ({ 
      description: r.description, 
      expression: r.expression, 
      enabled: r.enabled,
      action: r.action 
    })),
    wafRules: wafRules?.result?.rules?.map((r: any) => ({
      description: r.description,
      action: r.action,
      enabled: r.enabled,
    })),
    botManagement: {
      success: botMgmt.success,
      sbfm_definitely_automated: botMgmt.result?.sbfm_definitely_automated,
      sbfm_verified_bots: botMgmt.result?.sbfm_verified_bots,
      fight_mode: botMgmt.result?.fight_mode,
    },
    zoneName: zone.result?.name,
    zoneStatus: zone.result?.status,
    zonePlan: zone.result?.plan?.name,
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
