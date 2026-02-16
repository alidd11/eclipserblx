import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendBotMessage } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Discord Audit Log Action Types
const MEMBER_KICK = 20;
const MEMBER_BAN_ADD = 22;
const MEMBER_ROLE_UPDATE = 25;
const MESSAGE_DELETE = 72;
const MEMBER_UPDATE = 24;

// Logging channel IDs (matching existing edge functions)
const LEAVE_LOG_CHANNEL_ID = "1461353098248196197";
const ROLE_LOG_CHANNEL_ID = "1461353092380491786";
const MESSAGE_LOG_CHANNEL_ID = "1461353093542445253";

const LEAVE_COLOR = 0xEF4444;
const ROLE_ADD_COLOR = 0x22C55E;
const ROLE_REMOVE_COLOR = 0xEF4444;
const DELETE_COLOR = 0xEF4444;
const KICK_COLOR = 0xF97316;
const BAN_COLOR = 0xDC2626;

interface AuditLogEntry {
  id: string;
  action_type: number;
  user_id?: string; // The user who performed the action
  target_id?: string; // The target of the action
  reason?: string;
  changes?: Array<{
    key: string;
    new_value?: unknown;
    old_value?: unknown;
  }>;
  options?: {
    count?: string;
    channel_id?: string;
  };
}

interface DiscordUser {
  id: string;
  username: string;
  global_name?: string;
  avatar?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
  const guildId = Deno.env.get("DISCORD_GUILD_ID");

  if (!botToken || !guildId) {
    console.error("[poll-audit-log] Missing DISCORD_CUSTOMER_BOT_TOKEN or DISCORD_GUILD_ID");
    return new Response(JSON.stringify({ error: "Missing config" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get the last processed audit log ID for this guild
    const { data: cursor } = await supabase
      .from("discord_audit_log_cursor")
      .select("last_audit_log_id")
      .eq("guild_id", guildId)
      .maybeSingle();

    const lastProcessedId = cursor?.last_audit_log_id;

    // Fetch audit log from Discord
    const auditLogUrl = new URL(`https://discord.com/api/v10/guilds/${guildId}/audit-logs`);
    auditLogUrl.searchParams.set("limit", "50");

    const auditResponse = await fetch(auditLogUrl.toString(), {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!auditResponse.ok) {
      const errorText = await auditResponse.text();
      console.error("[poll-audit-log] Discord API error:", auditResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Discord API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auditData = await auditResponse.json();
    const entries: AuditLogEntry[] = auditData.audit_log_entries || [];
    const users: DiscordUser[] = auditData.users || [];

    if (entries.length === 0) {
      console.log("[poll-audit-log] No audit log entries found");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user lookup map
    const userMap = new Map<string, DiscordUser>();
    for (const user of users) {
      userMap.set(user.id, user);
    }

    // Filter to only new entries (entries are returned newest first)
    let newEntries = entries;
    if (lastProcessedId) {
      const cutoffIndex = entries.findIndex((e) => e.id === lastProcessedId);
      if (cutoffIndex === 0) {
        // No new entries
        console.log("[poll-audit-log] No new entries since last poll");
        // Update polled timestamp
        await supabase
          .from("discord_audit_log_cursor")
          .upsert({ guild_id: guildId, last_polled_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_audit_log_id: lastProcessedId });
        return new Response(JSON.stringify({ processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (cutoffIndex > 0) {
        newEntries = entries.slice(0, cutoffIndex);
      }
      // If cutoffIndex === -1, the old ID is no longer in the batch, process all
    }

    // Process entries oldest-first
    newEntries.reverse();

    let processed = 0;

    for (const entry of newEntries) {
      try {
        const performer = entry.user_id ? userMap.get(entry.user_id) : undefined;
        const target = entry.target_id ? userMap.get(entry.target_id) : undefined;

        switch (entry.action_type) {
          case MEMBER_KICK:
            await handleKick(entry, performer, target);
            processed++;
            break;

          case MEMBER_BAN_ADD:
            await handleBan(entry, performer, target);
            processed++;
            break;

          case MEMBER_ROLE_UPDATE:
            await handleRoleUpdate(entry, performer, target);
            processed++;
            break;

          case MESSAGE_DELETE:
            await handleMessageDelete(entry, performer, target);
            processed++;
            break;

          default:
            // Skip unhandled action types
            break;
        }
      } catch (entryError) {
        console.error(`[poll-audit-log] Error processing entry ${entry.id}:`, entryError);
      }
    }

    // Update cursor with the newest entry ID
    const newestId = entries[0].id;
    await supabase
      .from("discord_audit_log_cursor")
      .upsert({
        guild_id: guildId,
        last_audit_log_id: newestId,
        last_polled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    console.log(`[poll-audit-log] Processed ${processed} new entries`);
    return new Response(JSON.stringify({ processed, total: newEntries.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[poll-audit-log] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getAvatarUrl(user?: DiscordUser): string {
  if (!user) return "https://cdn.discordapp.com/embed/avatars/0.png";
  if (user.avatar) {
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
  }
  const defaultIndex = Number(BigInt(user.id) >> BigInt(22) & BigInt(5));
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

function getDisplayName(user?: DiscordUser): string {
  if (!user) return "Unknown User";
  return user.global_name || user.username;
}

async function handleKick(entry: AuditLogEntry, performer?: DiscordUser, target?: DiscordUser) {
  const targetName = getDisplayName(target);
  const targetId = entry.target_id || "Unknown";
  const avatarUrl = getAvatarUrl(target);

  const fields = [
    { name: "User ID", value: `\`${targetId}\``, inline: true },
    { name: "Action", value: "👢 Kicked", inline: true },
  ];

  if (performer) {
    fields.push({
      name: "Kicked By",
      value: `👤 <@${performer.id}>`,
      inline: true,
    });
  }

  if (entry.reason) {
    fields.push({ name: "Reason", value: entry.reason, inline: false });
  }

  await sendBotMessage(LEAVE_LOG_CHANNEL_ID, {
    embeds: [{
      author: { name: targetName, icon_url: avatarUrl },
      description: `<@${targetId}> was kicked from the server.`,
      color: KICK_COLOR,
      fields,
      timestamp: new Date().toISOString(),
    }],
  });
}

async function handleBan(entry: AuditLogEntry, performer?: DiscordUser, target?: DiscordUser) {
  const targetName = getDisplayName(target);
  const targetId = entry.target_id || "Unknown";
  const avatarUrl = getAvatarUrl(target);

  const fields = [
    { name: "User ID", value: `\`${targetId}\``, inline: true },
    { name: "Action", value: "🔨 Banned", inline: true },
  ];

  if (performer) {
    fields.push({
      name: "Banned By",
      value: `👤 <@${performer.id}>`,
      inline: true,
    });
  }

  if (entry.reason) {
    fields.push({ name: "Reason", value: entry.reason, inline: false });
  }

  await sendBotMessage(LEAVE_LOG_CHANNEL_ID, {
    embeds: [{
      author: { name: targetName, icon_url: avatarUrl },
      description: `<@${targetId}> was banned from the server.`,
      color: BAN_COLOR,
      fields,
      timestamp: new Date().toISOString(),
    }],
  });
}

async function handleRoleUpdate(entry: AuditLogEntry, performer?: DiscordUser, target?: DiscordUser) {
  const targetName = getDisplayName(target);
  const targetId = entry.target_id || "Unknown";
  const avatarUrl = getAvatarUrl(target);

  if (!entry.changes) return;

  for (const change of entry.changes) {
    if (change.key === "$add" && Array.isArray(change.new_value)) {
      for (const role of change.new_value as Array<{ id: string; name: string }>) {
        const fields = [
          { name: "User ID", value: `\`${targetId}\``, inline: true },
          { name: "Role", value: `<@&${role.id}>`, inline: true },
          { name: "Action", value: "✅ Added", inline: true },
        ];

        if (performer) {
          fields.push({
            name: "Performed By",
            value: `👤 <@${performer.id}>`,
            inline: true,
          });
        }

        await sendBotMessage(ROLE_LOG_CHANNEL_ID, {
          embeds: [{
            author: { name: targetName, icon_url: avatarUrl },
            description: `<@${targetId}> was given the <@&${role.id}> role.`,
            color: ROLE_ADD_COLOR,
            fields,
            timestamp: new Date().toISOString(),
          }],
        });
      }
    }

    if (change.key === "$remove" && Array.isArray(change.new_value)) {
      for (const role of change.new_value as Array<{ id: string; name: string }>) {
        const fields = [
          { name: "User ID", value: `\`${targetId}\``, inline: true },
          { name: "Role", value: `<@&${role.id}>`, inline: true },
          { name: "Action", value: "❌ Removed", inline: true },
        ];

        if (performer) {
          fields.push({
            name: "Performed By",
            value: `👤 <@${performer.id}>`,
            inline: true,
          });
        }

        await sendBotMessage(ROLE_LOG_CHANNEL_ID, {
          embeds: [{
            author: { name: targetName, icon_url: avatarUrl },
            description: `<@${targetId}> was removed from the <@&${role.id}> role.`,
            color: ROLE_REMOVE_COLOR,
            fields,
            timestamp: new Date().toISOString(),
          }],
        });
      }
    }
  }
}

async function handleMessageDelete(entry: AuditLogEntry, performer?: DiscordUser, target?: DiscordUser) {
  // Note: Discord audit logs only capture mod-deleted messages, not self-deletes
  // The message content is NOT available in audit logs
  const targetName = getDisplayName(target);
  const targetId = entry.target_id || "Unknown";
  const avatarUrl = getAvatarUrl(target);
  const channelId = entry.options?.channel_id;
  const count = entry.options?.count || "1";

  const channelMention = channelId ? `<#${channelId}>` : "Unknown channel";

  const fields = [
    { name: "User ID", value: `\`${targetId}\``, inline: true },
    { name: "Channel", value: channelMention, inline: true },
    { name: "Messages Deleted", value: count, inline: true },
  ];

  if (performer && performer.id !== targetId) {
    fields.push({
      name: "Deleted By",
      value: `👤 <@${performer.id}>`,
      inline: true,
    });
  }

  await sendBotMessage(MESSAGE_LOG_CHANNEL_ID, {
    embeds: [{
      author: { name: targetName, icon_url: avatarUrl },
      description: `${count} message(s) by <@${targetId}> were deleted in ${channelMention}.`,
      color: DELETE_COLOR,
      fields,
      timestamp: new Date().toISOString(),
    }],
  });
}
