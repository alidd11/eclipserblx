const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");
  if (!cfToken || !cfZoneId) {
    return new Response(JSON.stringify({ error: "Missing CF creds" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const zone = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}`, {
    headers: { Authorization: `Bearer ${cfToken}` },
  }).then(r => r.json());
  
  const accountId = zone.result?.account?.id;
  if (!accountId) {
    return new Response(JSON.stringify({ error: "No account ID" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch the actual deployed worker script content
  const scriptRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy/content`,
    { headers: { Authorization: `Bearer ${cfToken}` } }
  );
  
  const scriptText = await scriptRes.text();
  
  return new Response(JSON.stringify({
    status: scriptRes.status,
    contentType: scriptRes.headers.get("content-type"),
    scriptLength: scriptText.length,
    // Show first 3000 chars to inspect for syntax errors
    scriptPreview: scriptText.slice(0, 3000),
    scriptEnd: scriptText.slice(-500),
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
