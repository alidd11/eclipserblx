const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const tests = [
    { 
      name: "workers_dev_bot",
      url: "https://eclipse-og-proxy.mqddfqd5gs.workers.dev/products/battle-of-ypres-1917",
      ua: "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"
    },
    { 
      name: "workers_dev_share",
      url: "https://eclipse-og-proxy.mqddfqd5gs.workers.dev/share/products/battle-of-ypres-1917",
      ua: "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"
    },
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
        workerHeader: headers['x-eclipse-worker'] || null,
        title: body.match(/<title>(.*?)<\/title>/)?.[1] || null,
        hasProductOg: body.includes('Battle of Ypres'),
        bodyPreview: body.slice(0, 300),
      });
    } catch (e) {
      results.push({ name: test.name, error: (e as Error).message });
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
