import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReplyWithDM } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handleUnlink(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    return publicReplyWithDM(interaction,
      { color: 0xef4444, description: `<@${discordUserId}>\n❌ Your Discord isn't linked to any account.`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } },
      [{ color: 0xef4444, title: '❌ No Linked Account', description: "Your Discord isn't linked to any Eclipse account.", fields: [{ name: 'Want to link?', value: 'Use `/link` to connect your Discord to your Eclipse account.' }], footer: { text: branding.footer }, timestamp: new Date().toISOString() }]
    );
  }

  // Check if locked
  const [storeResult, roleResult] = await Promise.all([
    supabase.from('stores').select('id, name').eq('owner_id', profile.user_id).eq('is_active', true).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', profile.user_id),
  ]);
  const store = storeResult.data;
  const userRoles = roleResult.data || [];
  const hasStoreCreatorRole = userRoles.some(r => r.role?.toLowerCase().includes('store') || r.role?.toLowerCase().includes('seller'));

  if (store || hasStoreCreatorRole) {
    const reasons = [];
    if (store) reasons.push(`\u2022 You own an active store (**${store.name || 'Unknown'}**)`);
    if (hasStoreCreatorRole) reasons.push('\u2022 You have the **Store Creator** role');
    return publicReplyWithDM(interaction,
      { color: 0xef4444, description: `<@${discordUserId}>\n🔒 Your account is locked. Check your DMs for details.`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } },
      [{ color: 0xef4444, title: '🔒 Account Locked', description: 'Your Discord account cannot be unlinked for the following reasons:', thumbnail: { url: avatarUrl }, fields: [{ name: 'Reasons', value: reasons.join('\n') }, { name: 'Need Help?', value: 'Contact support if you need to make changes to your linked accounts.' }], footer: { text: branding.footer }, timestamp: new Date().toISOString() }]
    );
  }

  const { error: updateError } = await supabase
    .from('profiles').update({ discord_id: null, discord_username: null }).eq('user_id', profile.user_id);

  if (updateError) {
    return publicReplyWithDM(interaction,
      { color: 0xef4444, description: `<@${discordUserId}>\n❌ Something went wrong. Please try again.`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } },
      [{ color: 0xef4444, title: '❌ Error', description: 'Failed to unlink your account. Please try again later.', thumbnail: { url: avatarUrl }, footer: { text: branding.footer }, timestamp: new Date().toISOString() }]
    );
  }

  return publicReplyWithDM(interaction,
    { color: 0x22c55e, description: `<@${discordUserId}>\n✅ Your Discord has been unlinked from your Eclipse account.`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } },
    [{ color: 0x22c55e, title: '✅ Account Unlinked', description: `Your Discord has been disconnected from **@${profile.username}**.`, thumbnail: { url: avatarUrl }, fields: [{ name: 'Want to re-link?', value: 'Use `/link` anytime to reconnect your Discord.' }], footer: { text: branding.footer }, timestamp: new Date().toISOString() }]
  );
}
