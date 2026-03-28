import { getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handleGlobalBans(interaction) {
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) return ephemeralReply(interaction, [{ color: 0xef4444, description: "❌ You must link your Discord account to Eclipse.\nUse `/link` to get started." }]);

  const { data: bans, error } = await supabase.from('global_bans').select('*').eq('owner_user_id', profile.user_id).eq('is_active', true).order('created_at', { ascending: false }).limit(10);

  if (error) return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Failed to fetch your bans. Please try again.' }]);

  if (!bans?.length) {
    return ephemeralReply(interaction, [{
      color: 0x3b82f6, title: '🛡️ Global Guard - Active Bans',
      description: 'You have no active global bans.\n\nUse `/globalban` to ban a user across all your servers.',
      footer: { text: 'Global Guard \u2022 Eclipse Marketplace', icon_url: avatarUrl },
      timestamp: new Date().toISOString(),
    }]);
  }

  const banList = bans.map(ban => {
    const typeEmoji = ban.ban_type === 'permanent' ? '🔴' : '🟡';
    const expiryText = ban.expires_at ? `Expires: <t:${Math.floor(new Date(ban.expires_at).getTime() / 1000)}:R>` : 'Permanent';
    return `${typeEmoji} **${ban.banned_username || ban.banned_discord_id}**\n└ ID: \`${ban.banned_discord_id}\` \u2022 ${expiryText}`;
  }).join('\n\n');

  return ephemeralReply(interaction, [{
    color: 0x3b82f6, title: '🛡️ Global Guard - Active Bans',
    description: `You have **${bans.length}** active global ban${bans.length === 1 ? '' : 's'}:\n\n${banList}`,
    fields: [{ name: '📊 Manage Bans', value: 'Visit [guard.eclipserblx.com](https://guard.eclipserblx.com) for full management.' }],
    footer: { text: 'Global Guard \u2022 Eclipse Marketplace', icon_url: avatarUrl },
    timestamp: new Date().toISOString(),
  }]);
}
