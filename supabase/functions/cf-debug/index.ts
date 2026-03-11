const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Test worker directly via workers.dev subdomain
  const workerUrl = "https://eclipse-og-proxy.mqddfqd5gs.workers.dev/products/13";
  const ua = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
  
  const res = await fetch(workerUrl, {
    headers: { "User-Agent": ua, "Host": "eclipserblx.com" },
    redirect: "manual",
  });
  
  const body = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { headers[k] = v; });

  return new Response(JSON.stringify({
    testedUrl: workerUrl,
    status: res.status,
    allHeaders: headers,
    xWorker: headers['x-eclipse-worker'] || null,
    hasProductOg: body.includes('og:title') && !body.includes('Eclipse | Roblox Marketplace'),
    bodyLen: body.length,
    first500: body.slice(0, 500),
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
