const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
  const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID")!;
  const headers = { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" };

  // Check zone details
  const zoneRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`, { headers });
  const zone = await zoneRes.json();
  const accountId = zone.result?.account?.id;

  // Check worker routes
  const routesRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/workers/routes`, { headers });
  const routes = await routesRes.json();

  // Check worker script details
  const scriptRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy`, { headers });
  const script = await scriptRes.json();

  // Check worker subdomain (is workers.dev enabled?)
  const subdomainRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`, { headers });
  const subdomain = await subdomainRes.json();

  // Check redirect rules phase
  const redirectRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets/phases/http_request_dynamic_redirect/entrypoint`, { headers });
  const redirect = await redirectRes.json();

  // Check if zone is paused or development mode
  const devModeRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/development_mode`, { headers });
  const devMode = await devModeRes.json();

  return new Response(JSON.stringify({
    zone: {
      status: zone.result?.status,
      paused: zone.result?.paused,
      type: zone.result?.type,
      plan: zone.result?.plan?.name,
    },
    devMode: devMode.result,
    routes: routes.result?.map((r: any) => ({ pattern: r.pattern, script: r.script, id: r.id })),
    script: {
      exists: script.success,
      id: script.result?.id,
      etag: script.result?.etag,
      modified: script.result?.modified_on,
      handlers: script.result?.handlers,
      placement: script.result?.placement,
    },
    subdomain: subdomain.result,
    redirectRules: redirect.result?.rules?.map((r: any) => ({
      description: r.description,
      enabled: r.enabled,
      expression: r.expression,
      action: r.action,
    })),
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
