import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReply, ephemeralReply } from '../utils/responses.js';
import { supabase } from '../supabase.js';

export async function handleStore(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);

  if (serverContext.isMainServer) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL('https://eclipserblx.com'),
      new ButtonBuilder().setLabel('Browse Marketplace').setStyle(ButtonStyle.Link).setURL('https://eclipserblx.com/marketplace'),
    );
    return publicReply(interaction, [{
      color: 0x8b5cf6,
      title: '🛒 Eclipse Marketplace',
      description: 'The premier Roblox asset marketplace featuring scripts, UI kits, games, and more from verified creators.',
      thumbnail: { url: 'https://eclipserblx.com/logo.png' },
      footer: { text: 'Eclipse Marketplace' },
      timestamp: new Date().toISOString(),
    }], [row]);
  }

  if (!serverContext.store) {
    return publicReply(interaction, [{
      color: 0xef4444,
      description: `<@${discordUserId}>\n\n❌ This server isn't linked to a store.`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer },
    }]);
  }

  const [storeResult, productResult] = await Promise.all([
    supabase.from('stores').select('id, name, slug, description, logo_url, banner_url, follower_count, is_verified').eq('id', serverContext.store.id).single(),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', serverContext.store.id).eq('is_active', true),
  ]);

  const store = storeResult.data;
  if (!store) return ephemeralReply(interaction, [{ color: 0xef4444, description: 'Failed to fetch store information.' }]);

  const storeUrl = `https://eclipserblx.com/store/${store.slug}`;
  const fields = [];
  if (store.description) fields.push({ name: '📝 About', value: store.description.length > 200 ? store.description.substring(0, 200) + '...' : store.description });
  fields.push({ name: '📦 Products', value: `${productResult.count || 0}`, inline: true });
  fields.push({ name: '👥 Followers', value: `${store.follower_count || 0}`, inline: true });
  if (store.is_verified) fields.push({ name: '✅ Status', value: 'Verified Store', inline: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Browse Store').setStyle(ButtonStyle.Link).setURL(storeUrl)
  );

  return publicReply(interaction, [{
    color: 0x8b5cf6,
    title: `🏪 ${store.name}`,
    thumbnail: store.logo_url ? { url: store.logo_url } : undefined,
    image: store.banner_url ? { url: store.banner_url } : undefined,
    fields,
    footer: { text: `${store.name} \u2022 Powered by Eclipse` },
    timestamp: new Date().toISOString(),
  }], [row]);
}
