import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendBotMessage } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_LOG_CHANNEL_ID = "1461353092380491786";
const ROLE_ADD_COLOR = 0x22C55E; // Green
const ROLE_REMOVE_COLOR = 0xEF4444; // Red

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { discord_id, discord_username, discord_avatar_url, role_name, action } = await req.json();

    if (!discord_id || !discord_username || !role_name || !action) {
      return new Response(
        JSON.stringify({ error: "discord_id, discord_username, role_name, and action (added/removed) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const avatarUrl = discord_avatar_url ||
      `https://cdn.discordapp.com/embed/avatars/${parseInt(discord_id) % 5}.png`;

    const isAdded = action === "added";

    const result = await sendBotMessage(ROLE_LOG_CHANNEL_ID, {
      embeds: [
        {
          author: {
            name: discord_username,
            icon_url: avatarUrl,
          },
          description: `<@${discord_id}> was ${isAdded ? "given" : "removed from"} the **${role_name}** role.`,
          color: isAdded ? ROLE_ADD_COLOR : ROLE_REMOVE_COLOR,
          fields: [
            {
              name: "User ID",
              value: `\`${discord_id}\``,
              inline: true,
            },
            {
              name: "Role",
              value: role_name,
              inline: true,
            },
            {
              name: "Action",
              value: isAdded ? "✅ Added" : "❌ Removed",
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send role update log");
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[ROLE-LOG] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
