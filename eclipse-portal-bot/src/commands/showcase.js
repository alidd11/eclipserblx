import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { getBranding } from '../utils/embeds.js';
import { ephemeralReply, publicReply } from '../utils/responses.js';
import { supabase } from '../supabase.js';

const ALLOWED_HOSTS = ['eclipserblx.com', 'www.eclipserblx.com', 'roleplay-hub-shop.lovable.app'];

export async function handleShowcaseCommand(interaction, serverContext) {
  // Verify seller before showing modal
  const { data: profile } = await supabase
    .from('profiles').select('user_id').eq('discord_id', interaction.user.id).maybeSingle();

  if (!profile?.user_id) {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: 'Link your Discord account first with `/link` to showcase your store or products.' }]);
  }

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', profile.user_id).eq('is_active', true).is('deleted_at', null).maybeSingle();

  if (!store) {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: "You don't have an active store on Eclipse. Create one at https://eclipserblx.com/seller" }]);
  }

  // Show modal
  const modal = new ModalBuilder().setCustomId('showcase_modal').setTitle('Showcase Your Store or Product');
  const urlInput = new TextInputBuilder().setCustomId('showcase_url').setLabel('Eclipse URL').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(200).setPlaceholder('eclipserblx.com/products/123 or eclipserblx.com/store/my-store');
  const messageInput = new TextInputBuilder().setCustomId('showcase_message').setLabel('Message (optional)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500).setPlaceholder('Tell people about your product or store...');
  modal.addComponents(new ActionRowBuilder().addComponents(urlInput), new ActionRowBuilder().addComponents(messageInput));
  return interaction.showModal(modal);
}

export async function handleShowcaseModal(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const urlValue = interaction.fields.getTextInputValue('showcase_url');
  const messageValue = interaction.fields.getTextInputValue('showcase_message') || null;

  // Parse URL
  let normalised = urlValue.trim();
  if (!/^https?:\/\//i.test(normalised)) normalised = 'https://' + normalised;

  let hostname, pathname;
  try {
    const parsed = new URL(normalised);
    hostname = parsed.hostname.toLowerCase();
    pathname = parsed.pathname;
  } catch {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: "That doesn't look like a valid URL. Example: `eclipserblx.com/products/123`" }]);
  }

  let isAllowed = ALLOWED_HOSTS.includes(hostname);
  if (!isAllowed) {
    const { data: customDomain } = await supabase.from('store_domains').select('id').eq('domain', hostname).eq('status', 'active').maybeSingle();
    isAllowed = !!customDomain;
  }
  if (!isAllowed) return ephemeralReply(interaction, [{ color: 0xef4444, description: 'Only Eclipse URLs or verified custom store domains are accepted.' }]);

  const productMatch = pathname.match(/\/products\/(\d+)/);
  const storeMatch = pathname.match(/\/store\/([^\/\?\#]+)/);
  if (!productMatch && !storeMatch) return ephemeralReply(interaction, [{ color: 0xef4444, description: 'Please provide a valid Eclipse product or store URL.' }]);

  const { data: profile } = await supabase.from('profiles').select('user_id, display_name').eq('discord_id', discordUserId).maybeSingle();
  if (!profile?.user_id) return ephemeralReply(interaction, [{ color: 0xef4444, description: 'Link your Discord account first with `/link`.' }]);

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, slug, description, logo_url, banner_url, average_rating, total_sales, product_count, follower_count, discord_url, website_url, twitter_url, youtube_url, tiktok_url, roblox_url, is_verified, is_trusted')
    .eq('owner_id', profile.user_id).eq('is_active', true).is('deleted_at', null).maybeSingle();

  if (!store) return ephemeralReply(interaction, [{ color: 0xef4444, description: "You don't have an active store on Eclipse." }]);

  // Cooldown
  const { data: recent } = await supabase.from('audit_logs').select('id').eq('action', 'discord_showcase').eq('resource', store.id)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).limit(1);
  if (recent?.length > 0) return ephemeralReply(interaction, [{ color: 0xef4444, description: 'You can only showcase once every 24 hours. Try again later!' }]);

  await supabase.from('audit_logs').insert({ action: 'discord_showcase', resource: store.id, user_id: profile.user_id, details: { discord_id: discordUserId, url: urlValue } });

  const customMessage = messageValue?.replace(/<[^>]*>/g, '').replace(/@(everyone|here)/gi, '@\u200B$1').substring(0, 500).trim() || null;

  if (productMatch) {
    return handleProductShowcase(interaction, store, productMatch[1], branding, customMessage);
  }
  return handleStoreShowcase(interaction, store, branding, customMessage);
}

async function handleStoreShowcase(interaction, store, branding, customMessage) {
  const storeUrl = `https://eclipserblx.com/store/${encodeURIComponent(store.slug)}`;
  let desc = store.description ? store.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : 'Check out this store on Eclipse!';
  if (desc.length > 300) desc = desc.substring(0, 297) + '...';

  const badges = [];
  if (store.is_trusted) badges.push('\u2B50 Trusted');
  if (store.is_verified) badges.push('\u2705 Verified');
  const links = [`\uD83C\uDF10 [Visit Store](${storeUrl})`];
  if (store.discord_url) links.push(`\uD83D\uDCAC [Discord](${store.discord_url})`);
  if (store.website_url) links.push(`\uD83D\uDD17 [Website](${store.website_url})`);
  if (store.roblox_url) links.push(`\uD83C\uDFAE [Roblox](${store.roblox_url})`);

  const { data: products } = await supabase.from('products').select('name, slug, product_number, price')
    .eq('store_id', store.id).eq('is_active', true).eq('moderation_status', 'approved').order('created_at', { ascending: false }).limit(5);

  const productList = products?.length
    ? products.map(p => `\u2022 [${p.name}](https://eclipserblx.com/products/${p.product_number || encodeURIComponent(p.slug)}) \u2014 ${p.price === 0 ? 'FREE' : `\u00A3${Number(p.price).toFixed(2)}`}`).join('\n')
    : null;

  const rating = store.average_rating ? `${'⭐'.repeat(Math.round(store.average_rating))} ${Number(store.average_rating).toFixed(1)}/5` : 'No ratings yet';
  const fields = [];
  if (customMessage) fields.push({ name: '\uD83D\uDCAC From the Seller', value: customMessage });
  fields.push({ name: '\u2B50 Rating', value: rating, inline: true });
  fields.push({ name: '\uD83D\uDCE6 Products', value: '' + (store.product_count || 0), inline: true });
  fields.push({ name: '\uD83D\uDC65 Followers', value: '' + (store.follower_count || 0), inline: true });
  fields.push({ name: '\uD83D\uDD17 Links', value: links.join(' \u2022 ') });
  if (productList) fields.push({ name: '🛍️ Featured Products', value: productList });
  if (badges.length > 0) fields.push({ name: '🏆 Badges', value: badges.join(' \u2022 ') });

  const embeds = [{
    color: branding.color, title: `🏪 ${store.name}`, url: storeUrl, description: desc,
    thumbnail: store.logo_url ? { url: store.logo_url } : undefined, fields,
    footer: { text: `${branding.footer} \u2022 Creator Showcase`, icon_url: branding.icon }, timestamp: new Date().toISOString(),
  }];
  if (store.banner_url) embeds.push({ color: branding.color, image: { url: store.banner_url } });
  return publicReply(interaction, embeds);
}

async function handleProductShowcase(interaction, store, productNumber, branding, customMessage) {
  const { data: product } = await supabase.from('products')
    .select('id, name, slug, product_number, price, images, description, download_count')
    .eq('store_id', store.id).eq('is_active', true).eq('moderation_status', 'approved').eq('product_number', productNumber).maybeSingle();

  if (!product) return ephemeralReply(interaction, [{ color: 0xef4444, description: `No product found with number #${productNumber} in your store.` }]);

  const productUrl = `https://eclipserblx.com/products/${product.product_number || encodeURIComponent(product.slug)}`;
  const storeUrl = `https://eclipserblx.com/store/${encodeURIComponent(store.slug)}`;
  let productDesc = (product.description || 'A premium product from Eclipse.').replace(/<[^>]*>/g, '').trim();
  if (productDesc.length > 250) productDesc = productDesc.substring(0, 247) + '...';

  const fields = [];
  if (customMessage) fields.push({ name: '💬 From the Seller', value: customMessage });
  fields.push({ name: '💰 Price', value: product.price === 0 ? '**FREE**' : `**£${Number(product.price).toFixed(2)}**`, inline: true });
  fields.push({ name: '🏪 Store', value: `[${store.name}](${storeUrl})`, inline: true });
  if (product.download_count > 0) fields.push({ name: '📥 Downloads', value: `${product.download_count}`, inline: true });

  const embeds = [{
    color: branding.color, title: `🌟 ${product.name}`, url: productUrl,
    description: `${productDesc}\n\n**[View Product](${productUrl})**`,
    thumbnail: store.logo_url ? { url: store.logo_url } : undefined,
    image: product.images?.[0] ? { url: product.images[0] } : undefined,
    fields, footer: { text: `${branding.footer} \u2022 Creator Showcase`, icon_url: branding.icon }, timestamp: new Date().toISOString(),
  }];
  if (product.images?.length > 1) {
    for (let i = 1; i < Math.min(product.images.length, 4); i++) {
      embeds.push({ color: branding.color, image: { url: product.images[i] } });
    }
  }
  return publicReply(interaction, embeds);
}
