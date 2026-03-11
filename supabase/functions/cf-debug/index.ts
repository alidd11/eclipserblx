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

    const [pageRules, workerRoutes, zone] = await Promise.all([
      cfFetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/pagerules`),
      cfFetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes`),
      cfFetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}`),
    ]);

    const accountId = zone.result?.account?.id;
    let workerInfo = null;
    let deployments = null;
    if (accountId) {
      [workerInfo, deployments] = await Promise.all([
        cfFetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy`),
        cfFetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy/deployments`),
      ]);
    }

    return new Response(JSON.stringify({
      pageRules: pageRules.result || [],
      workerRoutes: workerRoutes.result || [],
      workerExists: !!workerInfo?.result,
      deployments: deployments?.result || null,
      accountId,
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
