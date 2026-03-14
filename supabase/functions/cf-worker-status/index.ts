const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
  const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID")!;
  const accountId = "01db536699f78a0bde1b3355a3e6dab0";
  const results: Record<string, any> = {};

  // Check ALL workers in the account
  const workers = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`, {
    headers: { Authorization: `Bearer ${cfToken}` },
  });
  const workersText = await workers.text();
  try {
    const data = JSON.parse(workersText);
    results.allWorkers = data.result?.map((w: any) => ({
      id: w.id,
      created: w.created_on,
      modified: w.modified_on,
      handlers: w.handlers,
      routes: w.routes,
    }));
  } catch { results.allWorkers = { status: workers.status, raw: workersText.slice(0, 500) }; }

  // Check worker custom domains  
  const domains = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains`, {
    headers: { Authorization: `Bearer ${cfToken}` },
  });
  const domainsText = await domains.text();
  try { results.workerDomains = JSON.parse(domainsText).result; } 
  catch { results.workerDomains = { status: domains.status }; }

  // Check if there are any Workers for Platforms namespaces
  const namespaces = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/dispatch/namespaces`, {
    headers: { Authorization: `Bearer ${cfToken}` },
  });
  const nsText = await namespaces.text();
  try { results.namespaces = JSON.parse(nsText); } 
  catch { results.namespaces = { status: namespaces.status }; }

  // Check token permissions
  const verify = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
    headers: { Authorization: `Bearer ${cfToken}` },
  });
  const verifyText = await verify.text();
  try { results.tokenVerify = JSON.parse(verifyText); } 
  catch { results.tokenVerify = { status: verify.status }; }

  // Try to get zone Workers configuration
  const zoneWorkers = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/filters`, {
    headers: { Authorization: `Bearer ${cfToken}` },
  });
  const zwText = await zoneWorkers.text();
  try { results.workerFilters = JSON.parse(zwText); } 
  catch { results.workerFilters = { status: zoneWorkers.status, raw: zwText.slice(0, 300) }; }

  // Check if the zone has Workers enabled
  const zoneFeatures = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/available_plans`, {
    headers: { Authorization: `Bearer ${cfToken}` },
  });
  const zfText = await zoneFeatures.text();
  try { 
    const plans = JSON.parse(zfText);
    results.currentPlan = plans.result?.find((p: any) => p.is_subscribed); 
  } catch { results.currentPlan = { status: zoneFeatures.status }; }

  // Test the Worker directly via workers.dev with the /products/13 path 
  // to confirm it works  
  const wdRes = await fetch("https://eclipse-og-proxy.mqddfqd5gs.workers.dev/products/13", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" },
    redirect: "manual",
  });
  const wdBody = await wdRes.text();
  const wdHeaders: Record<string, string> = {};
  wdRes.headers.forEach((v, k) => { wdHeaders[k] = v; });
  results.workersDevTest = {
    status: wdRes.status,
    xWorker: wdHeaders["x-eclipse-worker"] || null,
    hasVolvo: wdBody.includes("Volvo"),
    contentType: wdHeaders["content-type"],
    first400: wdBody.slice(0, 400),
  };

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
