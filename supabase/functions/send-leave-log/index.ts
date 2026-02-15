import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendBotMessage } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEAVE_LOG_CHANNEL_ID = "1461353098248196197";
const LEAVE_COLOR = 0xEF4444; // Red

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { discord_id, discord_username, discord_avatar_url, member_count } = await req.json();

    if (!discord_id || !discord_username) {
      return new Response(
        JSON.stringify({ error: "discord_id and discord_username are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const avatarUrl = discord_avatar_url || 
      `https://cdn.discordapp.com/embed/avatars/${parseInt(discord_id) % 5}.png`;

    const result = await sendBotMessage(LEAVE_LOG_CHANNEL_ID, {
      embeds: [
        {
          author: {
            name: discord_username,
            icon_url: avatarUrl,
          },
          description: `<@${discord_id}> has left the server.`,
          color: LEAVE_COLOR,
          fields: [
            {
              name: "User ID",
              value: `\`${discord_id}\``,
              inline: true,
            },
            ...(member_count ? [{
              name: "Member Count",
              value: `${member_count}`,
              inline: true,
            }] : []),
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send leave log");
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[LEAVE-LOG] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
