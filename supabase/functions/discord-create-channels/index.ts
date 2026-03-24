import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = "1485822444404080831";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const tokens: Record<string, string | undefined> = {
    DISCORD_BOT_TOKEN: Deno.env.get("DISCORD_BOT_TOKEN"),
    DISCORD_CUSTOMER_BOT_TOKEN: Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN"),
    DISCORD_FUN_BOT_TOKEN: Deno.env.get("DISCORD_FUN_BOT_TOKEN"),
    DISCORD_GLOBAL_GUARD_BOT_TOKEN: Deno.env.get("DISCORD_GLOBAL_GUARD_BOT_TOKEN"),
  };

  const results: Record<string, any> = {};

  for (const [name, token] of Object.entries(tokens)) {
    if (!token) {
      results[name] = "not set";
      continue;
    }

    try {
      const res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}`, {
        headers: { Authorization: `Bot ${token}` },
      });
      const data = await res.json();
      results[name] = res.ok
        ? { status: "OK", guild_name: data.name }
        : { status: res.status, error: data.message };
    } catch (e) {
      results[name] = { status: "error", error: e.message };
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
