const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ogUrl = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy?path=/products/battle-of-ypres-1917";

  // Test 1: No auth (how Worker calls it)
  const res1 = await fetch(ogUrl, {
    headers: { "User-Agent": "Discordbot/2.0" },
    redirect: "manual",
  });
  const body1 = await res1.text();
  const h1: Record<string, string> = {};
  res1.headers.forEach((v, k) => { h1[k] = v; });

  // Test 2: With anon key
  const res2 = await fetch(ogUrl, {
    headers: {
      "User-Agent": "Discordbot/2.0",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbmJlcmd3amZybWdramhyYmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDY1NjIsImV4cCI6MjA4MzIyMjU2Mn0.4jHxaV7Mjlw2RbjDz9W8B07-SR_8Z7IeTTXMu8RUZ20",
    },
    redirect: "manual",
  });
  const body2 = await res2.text();

  return new Response(JSON.stringify({
    noAuth: {
      status: res1.status,
      title: body1.match(/<title>(.*?)<\/title>/)?.[1] || null,
      hasProduct: body1.includes("Battle of Ypres"),
      bodyLen: body1.length,
      bodyPreview: body1.slice(0, 300),
      location: h1['location'] || null,
    },
    withKey: {
      status: res2.status,
      title: body2.match(/<title>(.*?)<\/title>/)?.[1] || null,
      hasProduct: body2.includes("Battle of Ypres"),
      bodyLen: body2.length,
      bodyPreview: body2.slice(0, 300),
    },
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
