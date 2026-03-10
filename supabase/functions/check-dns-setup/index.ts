const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
  if (!CF_TOKEN || !CF_ZONE_ID) {
    return new Response(JSON.stringify({ error: "Missing credentials" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`, {
    headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
  });
  const data = await res.json();
  const zone = data.result;

  return new Response(JSON.stringify({
    name: zone.name,
    status: zone.status,
    name_servers: zone.name_servers,
    original_name_servers: zone.original_name_servers,
    type: zone.type,
    paused: zone.paused,
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
