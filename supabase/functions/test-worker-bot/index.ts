const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function cfGet(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 300), status: res.status }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
  const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID")!;

  const zone = await cfGet(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`, CF_TOKEN);
  const accountId = zone.result?.account?.id;
  const routes = await cfGet(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/workers/routes`, CF_TOKEN);
  const subdomain = await cfGet(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`, CF_TOKEN);
  const redirect = await cfGet(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets/phases/http_request_dynamic_redirect/entrypoint`, CF_TOKEN);
  const devMode = await cfGet(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/development_mode`, CF_TOKEN);

  // Check script settings (not the script content)
  const scriptSettings = await cfGet(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy/settings`, CF_TOKEN);

  return new Response(JSON.stringify({
    zone: {
      status: zone.result?.status,
      paused: zone.result?.paused,
      type: zone.result?.type,
      plan: zone.result?.plan?.name,
    },
    devMode: devMode.result,
    routes: routes.result?.map((r: any) => ({ pattern: r.pattern, script: r.script })),
    scriptSettings,
    subdomain: subdomain.result,
    redirectRules: redirect.result?.rules?.map((r: any) => ({
      description: r.description,
      enabled: r.enabled,
      expression: r.expression,
    })),
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
