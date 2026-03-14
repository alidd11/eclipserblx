const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function cfGet(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; } 
  catch { return { status: res.status, raw: text.slice(0, 500) }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
  const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID")!;
  const results: Record<string, any> = {};

  // Get account ID
  const zone = await cfGet(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}`, cfToken);
  const accountId = zone.data?.result?.account?.id;
  results.zone = { plan: zone.data?.result?.plan, status: zone.data?.result?.status, accountId };

  // Check ALL rulesets (transform rules, redirect rules, etc.)
  const rulesets = await cfGet(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets`, cfToken);
  if (rulesets.data?.result) {
    results.rulesets = [];
    for (const rs of rulesets.data.result) {
      // Fetch full ruleset with rules
      const full = await cfGet(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/${rs.id}`, cfToken);
      results.rulesets.push({
        phase: rs.phase,
        name: rs.name,
        rules: full.data?.result?.rules?.map((r: any) => ({
          description: r.description,
          expression: r.expression,
          action: r.action,
          enabled: r.enabled,
          action_parameters: r.action_parameters,
        })) || [],
      });
    }
  }

  // Check Pages projects (try both account-level endpoints)
  if (accountId) {
    const pages1 = await cfGet(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`, cfToken);
    results.pagesProjects = pages1.data?.result || pages1;

    // Check worker custom domains
    const domains = await cfGet(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains`, cfToken);
    results.workerDomains = domains.data?.result || domains;

    // Check if worker is enabled/has any issues
    const workerSettings = await cfGet(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy/settings`, cfToken);
    results.workerSettings = workerSettings;

    // Check account-level workers settings
    const accountSettings = await cfGet(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/account-settings`, cfToken);
    results.accountWorkerSettings = accountSettings.data?.result || accountSettings;
  }

  // Check zone-level settings that might affect workers
  const zoneSettings = await cfGet(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/settings`, cfToken);
  if (zoneSettings.data?.result) {
    // Filter for relevant settings
    const relevant = zoneSettings.data.result.filter((s: any) => 
      ['always_use_https', 'ssl', 'automatic_https_rewrites', 'minify', 'rocket_loader'].includes(s.id)
    );
    results.zoneSettings = relevant;
  }

  // Check for any origin rules or config rules
  const configRules = await cfGet(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/rulesets/phases/http_config_settings/entrypoint`, cfToken);
  results.configRules = configRules.data?.result?.rules || configRules;

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
