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

  async function cfApi(path: string, opts: RequestInit = {}) {
    const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json", ...(opts.headers || {}) },
    });
    const text = await res.text();
    try { return { status: res.status, data: JSON.parse(text) }; } catch { return { status: res.status, raw: text.slice(0, 500) }; }
  }

  const zone = await cfApi(`/zones/${cfZoneId}`);
  const accountId = (zone as any).data?.result?.account?.id;

  // 1. Check worker deployments for errors
  const deployments = await cfApi(`/accounts/${accountId}/workers/scripts/eclipse-og-proxy/deployments`);
  
  // 2. Enable workers.dev subdomain for testing
  const enableSubdomain = await cfApi(`/accounts/${accountId}/workers/scripts/eclipse-og-proxy/subdomain`, {
    method: "POST",
    body: JSON.stringify({ enabled: true }),
  });

  // 3. Get the workers subdomain
  const subdomain = await cfApi(`/accounts/${accountId}/workers/subdomain`);
  
  // 4. Check for script tails/errors
  const scriptSettings = await cfApi(`/accounts/${accountId}/workers/scripts/eclipse-og-proxy/settings`);

  return new Response(JSON.stringify({
    deployments: (deployments as any).data?.result || deployments,
    enableSubdomain: (enableSubdomain as any).data || enableSubdomain,
    subdomain: (subdomain as any).data?.result || subdomain,
    scriptSettings: (scriptSettings as any).data?.result || scriptSettings,
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
