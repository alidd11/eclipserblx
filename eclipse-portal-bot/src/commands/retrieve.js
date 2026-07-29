import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';
import { requestDownload } from '../download.js';
import { chunk, assetFilename, extractProductIds, matchProduct } from './retrieve-helpers.js';

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

  const productIds = extractProductIds(allOrderItems);
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
 * Deliver an ownership-checked, buyer-specific download via DM (best-effort) and an
 * ephemeral reply. The edge function performs watermarking/fingerprinting and records
 * the download once.
 * `interaction` must already be deferred or repliable ephemerally.
 */
export async function deliverDownload(interaction, profile, product, branding, avatarUrl) {
  let resp;
  try {
    resp = await requestDownload({ productId: product.id, userId: profile.user_id });
  } catch (err) {
    console.error('[retrieve] download request failed:', err?.message || err);
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Download Failed',
      description: "Couldn't prepare your protected download. Please try again or use the website.",
      fields: [{ name: 'Alternative', value: 'Visit [Eclipse Marketplace](https://eclipserblx.com) to download your products.' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  if (resp.fileBase64) {
    const buffer = Buffer.from(resp.fileBase64, 'base64');
    const filename = resp.fileName || assetFilename(product);
    const sizeLabel = `\`${filename}\` • ${(buffer.length / 1024 / 1024).toFixed(2)} MB`;

    let dmDelivered = false;
    try {
      await interaction.user.send({
        embeds: [{
          color: 0x3b82f6, title: `📥 ${product.name}`,
          description: `Here's your download — the file is attached below.\n\n${sizeLabel}`,
          thumbnail: { url: avatarUrl }, footer: { text: branding.footer }, timestamp: new Date().toISOString(),
        }],
        files: [new AttachmentBuilder(buffer, { name: filename })],
      });
      dmDelivered = true;
    } catch { /* DMs closed */ }

    // Ephemeral reply: confirm the DM and always include the file as a backup, so
    // delivery still succeeds even when the customer has DMs from the server off.
    try {
      const res = await ephemeralReply(interaction, [{
        color: 0x3b82f6, title: `📥 ${product.name}`,
        description: dmDelivered
          ? `📬 I've also sent this to your **DMs**. The file is attached here as a backup too.\n\n${sizeLabel}`
          : `Your file is attached below — save it now. 💡 Turn on **Direct Messages** from server members to also get downloads sent privately to your DMs.\n\n${sizeLabel}`,
        thumbnail: { url: avatarUrl }, footer: { text: branding.footer }, timestamp: new Date().toISOString(),
      }], undefined, [new AttachmentBuilder(buffer, { name: filename })]);
      return res;
    } catch (err) {
      console.error('[retrieve] protected attachment delivery failed:', err?.message || err);
    }
  }

  if (!resp.signedUrl) {
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Download Failed',
      description: "Couldn't deliver your protected download. Please try again or use the website.",
      fields: [{ name: 'Alternative', value: 'Visit [Eclipse Marketplace](https://eclipserblx.com) to download your products.' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  const signedUrl = resp.signedUrl;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('📥 Download File').setStyle(ButtonStyle.Link).setURL(signedUrl),
  );

  let dmDelivered = false;
  try {
    await interaction.user.send({
      embeds: [{
        color: 0x3b82f6, title: `📥 ${product.name}`,
        description: 'Here’s your secure download link.\n\n⚠️ This link expires in **5 minutes**. Do not share it.',
        thumbnail: { url: avatarUrl }, footer: { text: branding.footer }, timestamp: new Date().toISOString(),
      }],
      components: [row],
    });
    dmDelivered = true;
  } catch { /* DMs closed */ }

  const res = await ephemeralReply(interaction, [{
    color: 0x3b82f6, title: `📥 ${product.name}`,
    description: dmDelivered
      ? '📬 I\'ve also sent this to your **DMs**. Use the secure link below (expires in **5 minutes**).'
      : 'Here’s your secure download link — use it now (expires in **5 minutes**).\n\n💡 Turn on **Direct Messages** from server members to also get downloads sent privately to your DMs.',
    thumbnail: { url: avatarUrl }, footer: { text: branding.footer }, timestamp: new Date().toISOString(),
  }], [row]);
  return res;
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
  const matched = matchProduct(products, productSearch);

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
