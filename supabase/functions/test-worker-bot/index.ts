const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let targetUrl: string;
  try {
    const body = await req.json();
    targetUrl = body.url || "https://eclipserblx.com/products/13";
  } catch {
    targetUrl = "https://eclipserblx.com/products/13";
  }

  const ua = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
  
  const res = await fetch(targetUrl, {
    headers: { "User-Agent": ua },
    redirect: "manual",
  });
  
  const body = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { headers[k] = v; });

  return new Response(JSON.stringify({
    testedUrl: targetUrl,
    status: res.status,
    redirected: res.redirected,
    finalUrl: res.url,
    xWorker: headers['x-eclipse-worker'] || null,
    cfRay: headers['cf-ray'] || null,
    server: headers['server'] || null,
    via: headers['via'] || null,
    xPoweredBy: headers['x-powered-by'] || null,
    contentType: headers['content-type'] || null,
    location: headers['location'] || null,
    allHeaderKeys: Object.keys(headers),
    hasProductOg: body.includes('og:title') && !body.includes('Eclipse | Roblox Marketplace'),
    bodyLen: body.length,
    first200: body.slice(0, 200),
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
