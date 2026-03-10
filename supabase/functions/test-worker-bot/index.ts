const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const tests = [
    { name: "share_redirect", url: "https://eclipserblx.com/share/products/battle-of-ypres-1917", ua: "Mozilla/5.0 (compatible; Discordbot/2.0)" },
    { name: "direct_bot", url: "https://eclipserblx.com/products/battle-of-ypres-1917", ua: "Mozilla/5.0 (compatible; Discordbot/2.0)" },
    { name: "direct_human", url: "https://eclipserblx.com/products/battle-of-ypres-1917", ua: "Mozilla/5.0 Chrome/120" },
  ];

  const results: any[] = [];
  for (const test of tests) {
    try {
      const res = await fetch(test.url, {
        headers: { "User-Agent": test.ua },
        redirect: "manual",
      });
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { headers[k] = v; });
      const body = await res.text();
      
      results.push({
        name: test.name,
        status: res.status,
        location: headers['location'] || null,
        workerHeader: headers['x-eclipse-worker'] || null,
        title: body.match(/<title>(.*?)<\/title>/)?.[1] || null,
        hasProductOg: body.includes('Battle of Ypres'),
        bodyLen: body.length,
      });
    } catch (e) {
      results.push({ name: test.name, error: (e as Error).message });
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
