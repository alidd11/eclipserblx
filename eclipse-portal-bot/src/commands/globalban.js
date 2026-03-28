import { getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply, publicReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';
import { config } from '../config.js';

export async function handleGlobalBan(interaction) {
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const userOption = interaction.options.getString('user') || '';
  const reason = interaction.options.getString('reason') || null;
  const duration = interaction.options.getString('duration') || null;

  const targetDiscordId = userOption.replace(/<@!?(\d+)>/, '$1').trim();
  if (!targetDiscordId || !/^\d{17,20}$/.test(targetDiscordId)) {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Please provide a valid Discord user ID or @mention.' }]);
  }

  const profile = await getLinkedAccount(discordUserId);
  if (!profile) return ephemeralReply(interaction, [{ color: 0xef4444, description: "❌ You must link your Discord account to Eclipse to use Global Guard.\nUse `/link` to get started." }]);

  const { data: licenses } = await supabase.from('bot_installation_codes').select('id').eq('user_id', profile.user_id).eq('license_status', 'active').not('guild_id', 'is', null).limit(1);
  if (!licenses?.length) return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Global Guard requires an active bot license.' }]);

  let expiresAt = null, banType = 'permanent';
  if (duration) {
    banType = 'temporary';
    const durationMap = { '1h': 3600000, '12h': 43200000, '1d': 86400000, '7d': 604800000, '30d': 2592000000, '90d': 7776000000 };
    expiresAt = new Date(Date.now() + (durationMap[duration] || 0)).toISOString();
  }

  const { data: existingBan } = await supabase.from('global_bans').select('id').eq('owner_user_id', profile.user_id).eq('banned_discord_id', targetDiscordId).eq('is_active', true).maybeSingle();
  if (existingBan) return ephemeralReply(interaction, [{ color: 0xf59e0b, description: '⚠️ This user is already globally banned. Use `/globalunban` first.' }]);

  let targetUsername = 'Unknown User', targetAvatarUrl = null;
  try {
    const client = interaction.client;
    const user = await client.users.fetch(targetDiscordId);
    targetUsername = user.globalName || user.username;
    targetAvatarUrl = user.displayAvatarURL({ extension: 'png', size: 128 });
  } catch {}

  const { data: ban, error: banError } = await supabase.from('global_bans').insert({
    owner_user_id: profile.user_id, banned_discord_id: targetDiscordId, banned_username: targetUsername,
    banned_avatar_url: targetAvatarUrl, reason, ban_type: banType, expires_at: expiresAt, created_via: 'discord_command', is_active: true,
  }).select().single();

  if (banError) return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Failed to create global ban. Please try again.' }]);

  await supabase.from('global_ban_logs').insert({ ban_id: ban.id, action: 'created', performed_by: profile.user_id, details: { via: 'discord_command', ban_type: banType } });

  // Trigger sync
  fetch(`${config.supabaseUrl}/functions/v1/sync-global-bans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.supabaseServiceKey}` },
    body: JSON.stringify({ banId: ban.id, action: 'ban' }),
  }).catch(console.error);

  const durationText = duration ? `for **${duration.replace('h', ' hour').replace('d', ' day')}**` : '**permanently**';
  return publicReply(interaction, [{
    color: 0xef4444, title: '🛡️ Global Ban Created',
    description: `**${targetUsername}** has been banned ${durationText} across all your servers.`,
    thumbnail: targetAvatarUrl ? { url: targetAvatarUrl } : undefined,
    fields: [
      { name: '🆔 Discord ID', value: targetDiscordId, inline: true },
      { name: '📝 Reason', value: reason || 'No reason provided', inline: true },
      { name: '⏱️ Status', value: 'Syncing to servers...', inline: false },
    ],
    footer: { text: 'Global Guard \u2022 Eclipse Marketplace', icon_url: avatarUrl },
    timestamp: new Date().toISOString(),
  }]);
}
