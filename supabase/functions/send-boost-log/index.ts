import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendBotMessage } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOOST_LOG_CHANNEL_ID = "1461353041310781531";
const BOOST_COLOR = 0xFF73FA;   // Pink/Magenta
const UNBOOST_COLOR = 0x808080; // Grey

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { discord_id, discord_username, discord_avatar_url, action } = await req.json();

    if (!discord_id || !discord_username || !action) {
      return new Response(
        JSON.stringify({ error: "discord_id, discord_username, and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const avatarUrl = discord_avatar_url ||
      `https://cdn.discordapp.com/embed/avatars/${parseInt(discord_id) % 5}.png`;

    const isBoosted = action === "boosted";
    const color = isBoosted ? BOOST_COLOR : UNBOOST_COLOR;
    const emoji = isBoosted ? "🚀" : "📉";
    const description = isBoosted
      ? `🚀 Thank you for boosting the server! 🎉`
      : `No longer boosting the server.`;

    const result = await sendBotMessage(BOOST_LOG_CHANNEL_ID, {
      content: `<@${discord_id}>`,
      allowed_mentions: { users: [discord_id] },
      embeds: [
        {
          author: {
            name: discord_username,
            icon_url: avatarUrl,
          },
          description,
          color,
        },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send boost log");
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[BOOST-LOG] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
