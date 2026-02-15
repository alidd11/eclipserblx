import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendBotMessage } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VOICE_LOG_CHANNEL_ID = "1461353095186354383";
const JOIN_COLOR = 0x22C55E;    // Green
const LEAVE_COLOR = 0xEF4444;   // Red
const MOVE_COLOR = 0x3B82F6;    // Blue
const MUTE_COLOR = 0xF59E0B;    // Amber
const DEAFEN_COLOR = 0x8B5CF6;  // Purple

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      action, // "joined", "left", "moved", "muted", "unmuted", "deafened", "undeafened", "server_muted", "server_deafened"
      discord_id,
      discord_username,
      discord_avatar_url,
      channel_id,
      channel_name,
      old_channel_id,
      old_channel_name,
      performed_by_id,
      performed_by_is_bot,
    } = await req.json();

    if (!discord_id || !discord_username || !action) {
      return new Response(
        JSON.stringify({ error: "discord_id, discord_username, and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const avatarUrl = discord_avatar_url ||
      `https://cdn.discordapp.com/embed/avatars/${parseInt(discord_id) % 5}.png`;

    let color: number;
    let description: string;
    let emoji: string;

    const channelMention = channel_id ? `<#${channel_id}>` : (channel_name || "Unknown");
    const oldChannelMention = old_channel_id ? `<#${old_channel_id}>` : (old_channel_name || "Unknown");

    switch (action) {
      case "joined":
        color = JOIN_COLOR;
        emoji = "🔊";
        description = `<@${discord_id}> joined voice channel ${channelMention}.`;
        break;
      case "left":
        color = LEAVE_COLOR;
        emoji = "🔇";
        description = `<@${discord_id}> left voice channel ${channelMention}.`;
        break;
      case "moved":
        color = MOVE_COLOR;
        emoji = "🔀";
        description = `<@${discord_id}> moved from ${oldChannelMention} to ${channelMention}.`;
        break;
      case "server_muted":
        color = MUTE_COLOR;
        emoji = "🔇";
        description = `<@${discord_id}> was server muted in ${channelMention}.`;
        break;
      case "server_unmuted":
        color = MUTE_COLOR;
        emoji = "🔊";
        description = `<@${discord_id}> was server unmuted in ${channelMention}.`;
        break;
      case "server_deafened":
        color = DEAFEN_COLOR;
        emoji = "🔕";
        description = `<@${discord_id}> was server deafened in ${channelMention}.`;
        break;
      case "server_undeafened":
        color = DEAFEN_COLOR;
        emoji = "🔔";
        description = `<@${discord_id}> was server undeafened in ${channelMention}.`;
        break;
      default:
        color = MOVE_COLOR;
        emoji = "🎙️";
        description = `<@${discord_id}> voice state updated in ${channelMention}.`;
    }

    const fields = [
      { name: "User ID", value: `\`${discord_id}\``, inline: true },
      { name: "Action", value: `${emoji} ${action.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}`, inline: true },
    ];

    if (channel_id) {
      fields.push({ name: "Channel", value: channelMention, inline: true });
    }

    if (action === "moved" && old_channel_id) {
      fields.push({ name: "From", value: oldChannelMention, inline: true });
      fields.push({ name: "To", value: channelMention, inline: true });
    }

    if (performed_by_id && performed_by_id !== discord_id) {
      fields.push({
        name: "Performed By",
        value: performed_by_is_bot ? `🤖 <@${performed_by_id}>` : `👤 <@${performed_by_id}>`,
        inline: true,
      });
    }

    const result = await sendBotMessage(VOICE_LOG_CHANNEL_ID, {
      embeds: [
        {
          author: { name: discord_username, icon_url: avatarUrl },
          description,
          color,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send voice log");
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[VOICE-LOG] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
