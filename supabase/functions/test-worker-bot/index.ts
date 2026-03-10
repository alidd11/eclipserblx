const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = "https://eclipse-og-proxy.mqddfqd5gs.workers.dev/products/battle-of-ypres-1917";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" },
    redirect: "manual",
  });
  const body = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { headers[k] = v; });

  return new Response(JSON.stringify({
    status: res.status,
    eclipseHeaders: Object.fromEntries(Object.entries(headers).filter(([k]) => k.startsWith('x-eclipse'))),
    title: body.match(/<title>(.*?)<\/title>/)?.[1] || null,
    hasProductOg: body.includes('Battle of Ypres'),
    bodyLen: body.length,
    bodyPreview: body.slice(0, 400),
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
