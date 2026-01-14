import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { discord_id } = await req.json();

    if (!discord_id) {
      return new Response(
        JSON.stringify({ error: "discord_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    
    if (!botToken) {
      console.log("[get-discord-avatar] No bot token configured");
      return new Response(
        JSON.stringify({ avatar_url: null, error: "Discord not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user info from Discord API
    const response = await fetch(`https://discord.com/api/v10/users/${discord_id}`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
    });

    if (!response.ok) {
      console.log(`[get-discord-avatar] Discord API error: ${response.status}`);
      return new Response(
        JSON.stringify({ avatar_url: null, error: "Failed to fetch Discord user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await response.json();
    
    let avatarUrl = null;
    if (userData.avatar) {
      // Animated avatars start with "a_"
      const extension = userData.avatar.startsWith('a_') ? 'gif' : 'png';
      avatarUrl = `https://cdn.discordapp.com/avatars/${discord_id}/${userData.avatar}.${extension}?size=128`;
    } else {
      // Default avatar based on discriminator or user ID
      const defaultIndex = userData.discriminator === '0' 
        ? (BigInt(discord_id) >> BigInt(22)) % BigInt(6)
        : parseInt(userData.discriminator) % 5;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    }

    console.log(`[get-discord-avatar] Fetched avatar for ${discord_id}: ${avatarUrl}`);

    return new Response(
      JSON.stringify({ 
        avatar_url: avatarUrl,
        username: userData.username,
        global_name: userData.global_name,
        discriminator: userData.discriminator
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[get-discord-avatar] Error:", errorMessage);
    return new Response(
      JSON.stringify({ avatar_url: null, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
