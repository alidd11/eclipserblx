import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
  const res = await fetch(`https://discord.com/api/v10/guilds/1485822444404080831/channels`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  const channels = await res.json();
  const eclipse = channels.filter((c: any) => {
    const eclipseCat = channels.find((x: any) => x.type === 4 && x.name?.toUpperCase() === "ECLIPSE");
    return eclipseCat && c.parent_id === eclipseCat.id;
  }).map((c: any) => ({ id: c.id, name: c.name, type: c.type }));
  return new Response(JSON.stringify(eclipse), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
