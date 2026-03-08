import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendBotMessage, sendDirectMessage } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Channel IDs for each log type
const LOG_CHANNELS: Record<string, string> = {
  boost: "1461353041310781531",
  leave: "1461353098248196197",
  message: "1461353093542445253",
  voice: "1461353095186354383",
  role: "1461353092380491786",
};

// Colors
const COLORS = {
  boost: 0xFF73FA,
  leave: 0xEF4444,
  delete: 0xEF4444,
  edit: 0xF59E0B,
  voice_join: 0x22C55E,
  voice_leave: 0xEF4444,
  voice_move: 0x3B82F6,
  voice_mute: 0xF59E0B,
  voice_deafen: 0x8B5CF6,
  role_add: 0x22C55E,
  role_remove: 0xEF4444,
};

function getAvatarUrl(discord_id: string, discord_avatar_url?: string): string {
  return discord_avatar_url || `https://cdn.discordapp.com/embed/avatars/${parseInt(discord_id) % 5}.png`;
}

function generateBoostCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'BOOST-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ===== BOOST LOG =====
async function handleBoostLog(body: any) {
  const { discord_id, discord_username, discord_avatar_url, action } = body;
  if (!discord_id || !discord_username || !action) {
    return { status: 400, body: { error: "discord_id, discord_username, and action are required" } };
  }

  const avatarUrl = getAvatarUrl(discord_id, discord_avatar_url);
  const isBoosted = action === "boosted";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: profile } = await supabase
    .from("profiles").select("user_id").eq("discord_id", discord_id).single();

  let discountCode: string | null = null;
  let deactivatedCode: string | null = null;

  if (isBoosted) {
    const result = await sendBotMessage(LOG_CHANNELS.boost, {
      content: `<@${discord_id}>`,
      allowed_mentions: { users: [discord_id] },
      embeds: [{
        author: { name: discord_username, icon_url: avatarUrl },
        description: `🚀 Thank you for boosting the server! 🎉`,
        color: COLORS.boost,
        thumbnail: { url: avatarUrl },
      }],
    });

    if (!result.success) throw new Error(result.error || "Failed to send boost log");

    if (profile?.user_id) {
      try {
        let code = generateBoostCode();
        let attempts = 0;
        while (attempts < 5) {
          const { data: existing } = await supabase.from("discount_codes").select("id").eq("code", code).single();
          if (!existing) break;
          code = generateBoostCode();
          attempts++;
        }

        const { error: insertError } = await supabase.from("discount_codes").insert({
          code, discount_type: "percentage", discount_value: 50,
          max_uses: 1, current_uses: 0, is_active: true, restricted_to_user_id: profile.user_id,
        });

        if (!insertError) {
          discountCode = code;
          await sendDirectMessage(discord_id, {
            embeds: [{
              author: { name: "Eclipse Portal", icon_url: avatarUrl },
              title: "🚀 Thank You for Boosting!",
              description: "Here's your exclusive **50% discount code** as a thank you for boosting the server!",
              color: COLORS.boost,
              fields: [
                { name: "💎 Your Code", value: `\`\`\`${code}\`\`\``, inline: false },
                { name: "🔒 Usage", value: "Single use · Only for you", inline: true },
                { name: "⏳ Valid", value: "While you're boosting", inline: true },
              ],
              footer: { text: "This code is exclusive to your account and will be deactivated if you stop boosting." },
            }],
          });
        }
      } catch (e) { console.error("[BOOST-LOG] Discount error (non-fatal):", e); }
    }

    return { status: 200, body: { success: true, messageId: result.messageId, discountCode } };
  } else {
    if (profile?.user_id) {
      try {
        const { data: activeCodes } = await supabase
          .from("discount_codes").select("id, code")
          .eq("restricted_to_user_id", profile.user_id).eq("is_active", true)
          .eq("current_uses", 0).ilike("code", "BOOST-%");

        if (activeCodes && activeCodes.length > 0) {
          deactivatedCode = activeCodes[0].code;
          await supabase.from("discount_codes").update({ is_active: false }).in("id", activeCodes.map(c => c.id));
        }
      } catch (e) { console.error("[BOOST-LOG] Deactivation error:", e); }
    }
    return { status: 200, body: { success: true, deactivatedCode } };
  }
}

// ===== LEAVE LOG =====
async function handleLeaveLog(body: any) {
  const { discord_id, discord_username, discord_avatar_url, member_count } = body;
  if (!discord_id || !discord_username) {
    return { status: 400, body: { error: "discord_id and discord_username are required" } };
  }

  const avatarUrl = getAvatarUrl(discord_id, discord_avatar_url);
  const result = await sendBotMessage(LOG_CHANNELS.leave, {
    embeds: [{
      author: { name: discord_username, icon_url: avatarUrl },
      description: `<@${discord_id}> has left the server.`,
      color: COLORS.leave,
      fields: [
        { name: "User ID", value: `\`${discord_id}\``, inline: true },
        ...(member_count ? [{ name: "Member Count", value: `${member_count}`, inline: true }] : []),
      ],
      timestamp: new Date().toISOString(),
    }],
  });

  if (!result.success) throw new Error(result.error || "Failed to send leave log");
  return { status: 200, body: { success: true, messageId: result.messageId } };
}

// ===== MESSAGE LOG =====
async function handleMessageLog(body: any) {
  const { action, discord_id, discord_username, discord_avatar_url, channel_id, message_content, new_content, performed_by_id, performed_by_is_bot } = body;
  if (!discord_id || !discord_username || !action || !message_content) {
    return { status: 400, body: { error: "discord_id, discord_username, action, and message_content are required" } };
  }

  const avatarUrl = getAvatarUrl(discord_id, discord_avatar_url);
  const isDeleted = action === "deleted";
  const channelMention = channel_id ? `<#${channel_id}>` : "Unknown channel";

  const fields: any[] = [
    { name: "User ID", value: `\`${discord_id}\``, inline: true },
    { name: "Channel", value: channelMention, inline: true },
  ];

  if (isDeleted) {
    fields.push({ name: "Deleted Message", value: message_content.substring(0, 1024) || "*Empty message*", inline: false });
  } else {
    fields.push({ name: "Before", value: message_content.substring(0, 1024) || "*Empty*", inline: false });
    fields.push({ name: "After", value: (new_content || "").substring(0, 1024) || "*Empty*", inline: false });
  }

  if (performed_by_id && performed_by_id !== discord_id) {
    fields.push({ name: "Performed By", value: performed_by_is_bot ? `🤖 <@${performed_by_id}>` : `👤 <@${performed_by_id}>`, inline: true });
  }

  const result = await sendBotMessage(LOG_CHANNELS.message, {
    embeds: [{
      author: { name: discord_username, icon_url: avatarUrl },
      description: isDeleted
        ? `A message by <@${discord_id}> was deleted in ${channelMention}.`
        : `<@${discord_id}> edited a message in ${channelMention}.`,
      color: isDeleted ? COLORS.delete : COLORS.edit,
      fields,
      timestamp: new Date().toISOString(),
    }],
  });

  if (!result.success) throw new Error(result.error || "Failed to send message log");
  return { status: 200, body: { success: true, messageId: result.messageId } };
}

// ===== VOICE LOG =====
async function handleVoiceLog(body: any) {
  const { action, discord_id, discord_username, discord_avatar_url, channel_id, channel_name, old_channel_id, old_channel_name, performed_by_id, performed_by_is_bot } = body;
  if (!discord_id || !discord_username || !action) {
    return { status: 400, body: { error: "discord_id, discord_username, and action are required" } };
  }

  const avatarUrl = getAvatarUrl(discord_id, discord_avatar_url);
  const channelMention = channel_id ? `<#${channel_id}>` : (channel_name || "Unknown");
  const oldChannelMention = old_channel_id ? `<#${old_channel_id}>` : (old_channel_name || "Unknown");

  let color: number, description: string, emoji: string;
  switch (action) {
    case "joined": color = COLORS.voice_join; emoji = "🔊"; description = `<@${discord_id}> joined voice channel ${channelMention}.`; break;
    case "left": color = COLORS.voice_leave; emoji = "🔇"; description = `<@${discord_id}> left voice channel ${channelMention}.`; break;
    case "moved": color = COLORS.voice_move; emoji = "🔀"; description = `<@${discord_id}> moved from ${oldChannelMention} to ${channelMention}.`; break;
    case "server_muted": color = COLORS.voice_mute; emoji = "🔇"; description = `<@${discord_id}> was server muted in ${channelMention}.`; break;
    case "server_unmuted": color = COLORS.voice_mute; emoji = "🔊"; description = `<@${discord_id}> was server unmuted in ${channelMention}.`; break;
    case "server_deafened": color = COLORS.voice_deafen; emoji = "🔕"; description = `<@${discord_id}> was server deafened in ${channelMention}.`; break;
    case "server_undeafened": color = COLORS.voice_deafen; emoji = "🔔"; description = `<@${discord_id}> was server undeafened in ${channelMention}.`; break;
    default: color = COLORS.voice_move; emoji = "🎙️"; description = `<@${discord_id}> voice state updated in ${channelMention}.`;
  }

  const fields: any[] = [
    { name: "User ID", value: `\`${discord_id}\``, inline: true },
    { name: "Action", value: `${emoji} ${action.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}`, inline: true },
  ];
  if (channel_id) fields.push({ name: "Channel", value: channelMention, inline: true });
  if (action === "moved" && old_channel_id) {
    fields.push({ name: "From", value: oldChannelMention, inline: true });
    fields.push({ name: "To", value: channelMention, inline: true });
  }
  if (performed_by_id && performed_by_id !== discord_id) {
    fields.push({ name: "Performed By", value: performed_by_is_bot ? `🤖 <@${performed_by_id}>` : `👤 <@${performed_by_id}>`, inline: true });
  }

  const result = await sendBotMessage(LOG_CHANNELS.voice, {
    embeds: [{ author: { name: discord_username, icon_url: avatarUrl }, description, color, fields, timestamp: new Date().toISOString() }],
  });

  if (!result.success) throw new Error(result.error || "Failed to send voice log");
  return { status: 200, body: { success: true, messageId: result.messageId } };
}

// ===== ROLE LOG =====
async function handleRoleLog(body: any) {
  const { discord_id, discord_username, discord_avatar_url, role_name, role_id, action, performed_by_id, performed_by_is_bot } = body;
  if (!discord_id || !discord_username || !role_name || !action) {
    return { status: 400, body: { error: "discord_id, discord_username, role_name, and action are required" } };
  }

  const avatarUrl = getAvatarUrl(discord_id, discord_avatar_url);
  const isAdded = action === "added";
  const roleMention = role_id ? `<@&${role_id}>` : `**${role_name}**`;

  const fields: any[] = [
    { name: "User ID", value: `\`${discord_id}\``, inline: true },
    { name: "Role", value: roleMention, inline: true },
    { name: "Action", value: isAdded ? "✅ Added" : "❌ Removed", inline: true },
  ];
  if (performed_by_id) {
    fields.push({ name: "Performed By", value: performed_by_is_bot ? `🤖 <@${performed_by_id}>` : `👤 <@${performed_by_id}>`, inline: true });
  }

  const result = await sendBotMessage(LOG_CHANNELS.role, {
    embeds: [{
      author: { name: discord_username, icon_url: avatarUrl },
      description: `<@${discord_id}> was ${isAdded ? "given" : "removed from"} the ${roleMention} role.`,
      color: isAdded ? COLORS.role_add : COLORS.role_remove,
      fields,
      timestamp: new Date().toISOString(),
    }],
  });

  if (!result.success) throw new Error(result.error || "Failed to send role update log");
  return { status: 200, body: { success: true, messageId: result.messageId } };
}

// ===== MAIN HANDLER =====
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const logType: string = body.log_type;

    let result: { status: number; body: unknown };

    switch (logType) {
      case 'boost': result = await handleBoostLog(body); break;
      case 'leave': result = await handleLeaveLog(body); break;
      case 'message': result = await handleMessageLog(body); break;
      case 'voice': result = await handleVoiceLog(body); break;
      case 'role': result = await handleRoleLog(body); break;
      default:
        result = { status: 400, body: { error: `Invalid log_type: ${logType}. Use: boost, leave, message, voice, role` } };
    }

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[DISCORD-LOG] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
