import { getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply, publicReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';
import { config } from '../config.js';

export async function handleGlobalUnban(interaction) {
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const userOption = interaction.options.getString('user') || '';
  const targetDiscordId = userOption.replace(/<@!?(\d+)>/, '$1').trim();

  if (!targetDiscordId || !/^\d{17,20}$/.test(targetDiscordId)) {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Please provide a valid Discord user ID or @mention.' }]);
  }

  const profile = await getLinkedAccount(discordUserId);
  if (!profile) return ephemeralReply(interaction, [{ color: 0xef4444, description: "❌ You must link your Discord account to Eclipse.\nUse `/link` to get started." }]);

  const { data: ban } = await supabase.from('global_bans').select('*').eq('owner_user_id', profile.user_id).eq('banned_discord_id', targetDiscordId).eq('is_active', true).maybeSingle();
  if (!ban) return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ No active global ban found for this user.' }]);

  const { error } = await supabase.from('global_bans').update({ is_active: false }).eq('id', ban.id);
  if (error) return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Failed to revoke ban. Please try again.' }]);

  await supabase.from('global_ban_logs').insert({ ban_id: ban.id, action: 'revoked', performed_by: profile.user_id, details: { via: 'discord_command' } });

  fetch(`${config.supabaseUrl}/functions/v1/sync-global-bans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.supabaseServiceKey}` },
    body: JSON.stringify({ banId: ban.id, action: 'unban' }),
  }).catch(console.error);

  return publicReply(interaction, [{
    color: 0x22c55e, title: '🛡️ Global Ban Removed',
    description: `**${ban.banned_username || targetDiscordId}** has been unbanned from all your servers.`,
    thumbnail: ban.banned_avatar_url ? { url: ban.banned_avatar_url } : undefined,
    fields: [
      { name: '🆔 Discord ID', value: targetDiscordId, inline: true },
      { name: '⏱️ Status', value: 'Syncing to servers...', inline: true },
    ],
    footer: { text: 'Global Guard \u2022 Eclipse Marketplace', icon_url: avatarUrl },
    timestamp: new Date().toISOString(),
  }]);
}
