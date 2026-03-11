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

  // Test 1: Direct URL with Discord bot UA
  const botUa = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";
  const res1 = await fetch(targetUrl, { headers: { "User-Agent": botUa }, redirect: "manual" });
  const body1 = await res1.text();
  const h1: Record<string, string> = {};
  res1.headers.forEach((v, k) => { h1[k] = v; });
  tests["directBot"] = {
    url: targetUrl,
    status: res1.status,
    location: h1["location"] || null,
    xWorker: h1["x-eclipse-worker"] || null,
    hasOg: body1.includes("og:title"),
    first200: body1.slice(0, 200),
  };

  // Test 2: Same URL with HUMAN UA (Chrome)
  const humanUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const res2 = await fetch(targetUrl, { headers: { "User-Agent": humanUa }, redirect: "manual" });
  const body2 = await res2.text();
  const h2: Record<string, string> = {};
  res2.headers.forEach((v, k) => { h2[k] = v; });
  tests["directHuman"] = {
    url: targetUrl,
    status: res2.status,
    location: h2["location"] || null,
    xWorker: h2["x-eclipse-worker"] || null,
    hasOg: body2.includes("og:title"),
    first200: body2.slice(0, 200),
  };

  // Test 3: If human got a redirect, follow it once
  if (res2.status >= 300 && res2.status < 400 && h2["location"]) {
    const res3 = await fetch(h2["location"], { headers: { "User-Agent": humanUa }, redirect: "manual" });
    const h3: Record<string, string> = {};
    res3.headers.forEach((v, k) => { h3[k] = v; });
    tests["humanRedirectFollowed"] = {
      url: h2["location"],
      status: res3.status,
      location: h3["location"] || null,
      xWorker: h3["x-eclipse-worker"] || null,
    };
  }

  // Test 4: Direct origin fetch (bypass Worker) to see if origin redirects
  const originUrl = "https://roleplay-hub-shop.lovable.app/";
  const res4 = await fetch(originUrl, { headers: { "User-Agent": humanUa }, redirect: "manual" });
  const h4: Record<string, string> = {};
  res4.headers.forEach((v, k) => { h4[k] = v; });
  tests["originDirect"] = {
    url: originUrl,
    status: res4.status,
    location: h4["location"] || null,
    first200: (await res4.text()).slice(0, 200),
  };

  return new Response(JSON.stringify(tests, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
