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

  const tests: Record<string, unknown> = {};

  // Test 1: Direct product URL with Discord bot UA
  const ua = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
  const res1 = await fetch(targetUrl, { headers: { "User-Agent": ua }, redirect: "manual" });
  const body1 = await res1.text();
  const h1: Record<string, string> = {};
  res1.headers.forEach((v, k) => { h1[k] = v; });
  tests["directBot"] = {
    url: targetUrl,
    status: res1.status,
    location: h1["location"] || null,
    xWorker: h1["x-eclipse-worker"] || null,
    server: h1["server"] || null,
    cfRay: h1["cf-ray"] || null,
    hasOg: body1.includes("og:title"),
    first200: body1.slice(0, 200),
  };

  // Test 2: /share/ URL (should trigger Cloudflare Redirect Rule)
  const shareUrl = targetUrl.replace("eclipserblx.com/", "eclipserblx.com/share/");
  const res2 = await fetch(shareUrl, { headers: { "User-Agent": ua }, redirect: "manual" });
  const body2 = await res2.text();
  tests["shareRedirect"] = {
    url: shareUrl,
    status: res2.status,
    location: res2.headers.get("location"),
    hasOg: body2.includes("og:title"),
    first300: body2.slice(0, 300),
  };

  // Test 3: If /share/ redirected, follow it
  if (res2.status >= 300 && res2.status < 400 && res2.headers.get("location")) {
    const redirectTarget = res2.headers.get("location")!;
    const res3 = await fetch(redirectTarget, { headers: { "User-Agent": ua }, redirect: "manual" });
    const body3 = await res3.text();
    tests["shareFollowed"] = {
      url: redirectTarget,
      status: res3.status,
      hasOg: body3.includes("og:title"),
      ogTitle: body3.match(/og:title[^>]*content="([^"]+)"/)?.[1] || null,
      first300: body3.slice(0, 300),
    };
  }

  return new Response(JSON.stringify(tests, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
