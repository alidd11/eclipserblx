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
      headers: { Authorization: `Bearer ${cfToken}` },
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { raw: text.slice(0, 200), status: res.status }; }
  }

  const zone = await cfGet(`/zones/${cfZoneId}`);
  const accountId = zone.result?.account?.id;
  const routes = await cfGet(`/zones/${cfZoneId}/workers/routes`);
  const redirectRules = await cfGet(`/zones/${cfZoneId}/rulesets/phases/http_request_dynamic_redirect/entrypoint`);
  const botMgmt = await cfGet(`/zones/${cfZoneId}/bot_management`);

  let workerSettings = null;
  if (accountId) {
    workerSettings = await cfGet(`/accounts/${accountId}/workers/scripts/eclipse-og-proxy/settings`);
  }

  return new Response(JSON.stringify({
    zone: { name: zone.result?.name, status: zone.result?.status, plan: zone.result?.plan?.name },
    routes: routes.result?.map((r: any) => ({ pattern: r.pattern, script: r.script })),
    workerSettings: workerSettings?.result || workerSettings,
    redirectRules: redirectRules.result?.rules?.map((r: any) => ({ 
      desc: r.description, expr: r.expression, enabled: r.enabled 
    })),
    botMgmt: {
      sbfm_da: botMgmt.result?.sbfm_definitely_automated,
      sbfm_vb: botMgmt.result?.sbfm_verified_bots,
      fight_mode: botMgmt.result?.fight_mode,
    },
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
