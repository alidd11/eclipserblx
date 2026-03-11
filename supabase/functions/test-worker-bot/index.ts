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

  // Use the Cloudflare Worker subdomain directly to bypass SBFM
  const workerUrl = targetUrl.replace("https://eclipserblx.com", "https://eclipse-og-proxy.mqddfqd5gs.workers.dev");

  const res = await fetch(workerUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" },
    redirect: "manual",
  });
  const body = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { headers[k] = v; });

  const ogTitle = body.match(/<meta\s+property="og:title"\s+content="([^"]*)"/)?.[1] || null;
  const ogImage = body.match(/<meta\s+property="og:image"\s+content="([^"]*)"/)?.[1] || null;
  const ogUrl = body.match(/<meta\s+property="og:url"\s+content="([^"]*)"/)?.[1] || null;

  return new Response(JSON.stringify({
    status: res.status,
    eclipseHeaders: Object.fromEntries(Object.entries(headers).filter(([k]) => k.startsWith('x-eclipse'))),
    ogTitle,
    ogImage: ogImage ? ogImage.slice(0, 120) + '...' : null,
    ogUrl,
    hasProductOg: !!ogTitle && ogTitle !== 'Eclipse' && !ogTitle.startsWith('Eclipse |'),
    bodyLen: body.length,
    bodyPreview: body.slice(0, 500),
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
