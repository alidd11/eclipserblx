import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendBotMessage } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MESSAGE_LOG_CHANNEL_ID = "1461353093542445253";
const DELETE_COLOR = 0xEF4444; // Red
const EDIT_COLOR = 0xF59E0B; // Amber

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      action, // "deleted" or "edited"
      discord_id,
      discord_username,
      discord_avatar_url,
      channel_id,
      message_content,
      new_content, // only for edited
      performed_by_id,
      performed_by_is_bot,
    } = await req.json();

    if (!discord_id || !discord_username || !action || !message_content) {
      return new Response(
        JSON.stringify({ error: "discord_id, discord_username, action (deleted/edited), and message_content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const avatarUrl = discord_avatar_url ||
      `https://cdn.discordapp.com/embed/avatars/${parseInt(discord_id) % 5}.png`;

    const isDeleted = action === "deleted";

    // Build "performed by" field
    let performedByValue = "";
    if (performed_by_id) {
      performedByValue = performed_by_is_bot
        ? `🤖 <@${performed_by_id}>`
        : `👤 <@${performed_by_id}>`;
    }

    const channelMention = channel_id ? `<#${channel_id}>` : "Unknown channel";

    const fields = [
      {
        name: "User ID",
        value: `\`${discord_id}\``,
        inline: true,
      },
      {
        name: "Channel",
        value: channelMention,
        inline: true,
      },
    ];

    if (isDeleted) {
      fields.push({
        name: "Deleted Message",
        value: message_content.substring(0, 1024) || "*Empty message*",
        inline: false,
      });
    } else {
      fields.push({
        name: "Before",
        value: message_content.substring(0, 1024) || "*Empty*",
        inline: false,
      });
      fields.push({
        name: "After",
        value: (new_content || "").substring(0, 1024) || "*Empty*",
        inline: false,
      });
    }

    // Add "Performed By" if someone else deleted the message
    if (performed_by_id && performed_by_id !== discord_id) {
      fields.push({
        name: "Performed By",
        value: performedByValue,
        inline: true,
      });
    }

    const description = isDeleted
      ? `A message by <@${discord_id}> was deleted in ${channelMention}.`
      : `<@${discord_id}> edited a message in ${channelMention}.`;

    const result = await sendBotMessage(MESSAGE_LOG_CHANNEL_ID, {
      embeds: [
        {
          author: {
            name: discord_username,
            icon_url: avatarUrl,
          },
          description,
          color: isDeleted ? DELETE_COLOR : EDIT_COLOR,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send message log");
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[MESSAGE-LOG] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
