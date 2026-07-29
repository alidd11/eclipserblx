import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function chunk(arr, size = 50) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/**
 * Resolve the downloadable products this linked user has purchased (paid/completed
 * orders by user_id, plus guest orders matched on email). Scoped to the current
 * store when the command runs in a store server.
 */
export async function getPurchasedDownloadableProducts(profile, serverContext) {
  let allOrderIds = [];

  const { data: userIdOrders } = await supabase
    .from('orders').select('id').eq('user_id', profile.user_id).in('status', ['paid', 'completed']);
  if (userIdOrders) allOrderIds = userIdOrders.map(o => o.id);

  if (profile.email) {
    const { data: emailOrders } = await supabase
      .from('orders').select('id').eq('customer_email', profile.email).is('user_id', null).in('status', ['paid', 'completed']);
    if (emailOrders) allOrderIds = [...new Set([...allOrderIds, ...emailOrders.map(o => o.id)])];
  }

  if (allOrderIds.length === 0) return [];

  const allOrderItems = [];
  for (const ids of chunk(allOrderIds, 50)) {
    const { data: orderItems } = await supabase
      .from('order_items').select('product_id').in('order_id', ids).not('product_id', 'is', null);
    if (orderItems) allOrderItems.push(...orderItems);
  }

  const productIds = [...new Set(allOrderItems.map(i => i.product_id).filter(v => typeof v === 'string' && UUID_RE.test(v)))];
  if (productIds.length === 0) return [];

  const products = [];
  for (const ids of chunk(productIds, 50)) {
    let query = supabase.from('products').select('id, name, asset_file_url, store_id').in('id', ids).not('asset_file_url', 'is', null);
    if (serverContext.store) query = query.eq('store_id', serverContext.store.id);
    const { data } = await query;
    if (data) products.push(...data);
  }
  return products;
}

/**
 * Generate a signed download link for one owned product, log it, and deliver via
 * DM (best-effort) + an ephemeral reply. `interaction` must already be deferred
 * or repliable ephemerally.
 */
export async function deliverDownload(interaction, profile, product, branding, avatarUrl) {
  const [signedUrlResult] = await Promise.all([
    supabase.storage.from('product-assets').createSignedUrl(product.asset_file_url, 3600),
    supabase.from('download_logs').insert({ user_id: profile.user_id, product_id: product.id }),
    supabase.rpc('increment_download_count', { p_product_id: product.id }).then(() => {}).catch(() => {}),
  ]);

  if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Download Failed',
      description: "Couldn't generate a download link. Please try again or use the website.",
      fields: [{ name: 'Alternative', value: 'Visit [Eclipse Marketplace](https://eclipserblx.com) to download your products.' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  const embed = {
    color: 0x3b82f6,
    title: `📥 ${product.name}`,
    description: 'Your download link is ready! Click the button below.\n\n⚠️ This link expires in **1 hour**. Do not share it.',
    thumbnail: { url: avatarUrl },
    footer: { text: branding.footer },
    timestamp: new Date().toISOString(),
  };
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('📥 Download File').setStyle(ButtonStyle.Link).setURL(signedUrlResult.data.signedUrl),
  );

  try { await interaction.user.send({ embeds: [embed], components: [row] }); } catch { /* DMs closed */ }
  return ephemeralReply(interaction, [embed], [row]);
}

export async function handleRetrieve(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(interaction.user.id);

  if (!profile) {
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Account Not Linked',
      description: "Your Discord isn't linked to an Eclipse account yet.",
      fields: [{ name: 'How to Link', value: 'Run `/link` to get started!' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  const products = await getPurchasedDownloadableProducts(profile, serverContext);

  if (products.length === 0) {
    return ephemeralReply(interaction, [{
      color: 0x3b82f6, title: '📁 No Downloads Available',
      description: "You don't have any downloadable products yet.",
      fields: [{ name: 'Browse Products', value: 'Visit [Eclipse Marketplace](https://eclipserblx.com) to find products!' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  const productSearch = interaction.options.getString('product');

  // No search term → show a click-to-download dropdown (fast, no typing).
  if (!productSearch) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('retrieve_dl')
      .setPlaceholder('Select a product to download')
      .addOptions(products.slice(0, 25).map(p => ({ label: p.name.slice(0, 100), value: p.id })));
    const extra = products.length > 25
      ? `\n\nShowing 25 of ${products.length}. For others, use \`/retrieve product:NAME\`.` : '';
    return ephemeralReply(interaction, [{
      color: 0x3b82f6,
      title: serverContext.store ? `📁 Your ${serverContext.store.name} Downloads` : '📁 Your Downloadable Products',
      description: `Pick a product below to get your download link.${extra}`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }], [new ActionRowBuilder().addComponents(menu)]);
  }

  // Search term → fuzzy match then deliver directly.
  const term = productSearch.toLowerCase().trim();
  const matched = products.find(p =>
    p.name.toLowerCase().includes(term) ||
    term.includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().split(' ').some(w => term.includes(w) && w.length > 3),
  );

  if (!matched) {
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Product Not Found',
      description: `Couldn't find a downloadable product matching "${productSearch}".`,
      fields: [{ name: 'Your Products', value: products.map(p => `• ${p.name}`).join('\n').slice(0, 1000) }],
      footer: { text: `${branding.footer} • Or run /retrieve with no name to pick from a menu` },
    }]);
  }

  return deliverDownload(interaction, profile, matched, branding, avatarUrl);
}

/**
 * Handle the click-to-download dropdown selection from /retrieve.
 */
export async function handleRetrieveSelect(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(interaction.user.id);
  if (!profile) {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Your account is no longer linked. Run `/link` again.' }]);
  }

  const selectedId = interaction.values?.[0];
  // Re-verify ownership before generating a link (never trust the client-sent value).
  const products = await getPurchasedDownloadableProducts(profile, serverContext);
  const product = products.find(p => p.id === selectedId);
  if (!product) {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ That product is no longer available for download on your account.' }]);
  }

  return deliverDownload(interaction, profile, product, branding, avatarUrl);
}
