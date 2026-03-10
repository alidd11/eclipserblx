const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const testUrl = "https://eclipserblx.com/products/battle-of-ypres-1917";
  const botUA = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";

  try {
    const res = await fetch(testUrl, {
      headers: { "User-Agent": botUA },
      redirect: "manual",
    });
    const body = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });

    // Check if we got OG tags or SPA
    const hasOgTitle = body.includes('og:title');
    const hasProductTitle = body.includes('Battle of Ypres');
    const hasWorkerHeader = !!headers['x-eclipse-worker'];
    const titleMatch = body.match(/<title>(.*?)<\/title>/);

    return new Response(JSON.stringify({
      status: res.status,
      title: titleMatch?.[1] || "not found",
      hasOgTitle,
      hasProductTitle,
      workerHeader: headers['x-eclipse-worker'] || "missing",
      contentType: headers['content-type'],
      bodyLength: body.length,
      bodyPreview: body.slice(0, 500),
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
