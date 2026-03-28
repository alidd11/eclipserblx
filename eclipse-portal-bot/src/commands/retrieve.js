import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handleRetrieve(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Account Not Linked',
      description: "Your Discord isn't linked to an Eclipse account yet.",
      fields: [{ name: 'How to Link', value: 'Run `/link` to get started!' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  const productSearch = interaction.options.getString('product');
  const userEmail = profile.email;
  let allOrderIds = [];

  const { data: userIdOrders } = await supabase
    .from('orders').select('id').eq('user_id', profile.user_id).in('status', ['paid', 'completed']);
  if (userIdOrders) allOrderIds = userIdOrders.map(o => o.id);

  if (userEmail) {
    const { data: emailOrders } = await supabase
      .from('orders').select('id').eq('customer_email', userEmail).is('user_id', null).in('status', ['paid', 'completed']);
    if (emailOrders) allOrderIds = [...new Set([...allOrderIds, ...emailOrders.map(o => o.id)])];
  }

  if (allOrderIds.length === 0) {
    return ephemeralReply(interaction, [{
      color: 0x3b82f6, title: '📁 No Downloads Available',
      description: "You haven't purchased any downloadable products yet.",
      fields: [{ name: 'Browse Products', value: 'Visit [Eclipse Marketplace](https://eclipserblx.com) to find products!' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  const { data: orderItems } = await supabase
    .from('order_items').select('product_id').in('order_id', allOrderIds).not('product_id', 'is', null);

  const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const productIds = [...new Set((orderItems?.map(i => i.product_id) || []).filter(isUuid))];

  if (productIds.length === 0) {
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Downloads Unavailable',
      description: "We found your orders, but they don't include valid product IDs for downloads.",
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  let productsQuery = supabase
    .from('products').select('id, name, asset_file_url, store_id')
    .in('id', productIds).not('asset_file_url', 'is', null);
  if (serverContext.store) productsQuery = productsQuery.eq('store_id', serverContext.store.id);
  const { data: products } = await productsQuery;

  if (!products || products.length === 0) {
    return ephemeralReply(interaction, [{
      color: 0x3b82f6, title: '📁 No Downloads Available',
      description: 'None of your purchased products have downloadable files.',
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  if (!productSearch) {
    const productList = products.map((p, i) => `**${i + 1}.** ${p.name}`).join('\n');
    return ephemeralReply(interaction, [{
      color: 0x3b82f6,
      title: serverContext.store ? `📁 Your ${serverContext.store.name} Downloads` : '📁 Your Downloadable Products',
      description: productList,
      thumbnail: { url: avatarUrl },
      footer: { text: `${branding.footer} \u2022 Use /retrieve product:NAME to download` },
      timestamp: new Date().toISOString(),
    }]);
  }

  // Fuzzy match
  const searchTerm = productSearch.toLowerCase().trim();
  const matchedProduct = products.find(p =>
    p.name.toLowerCase().includes(searchTerm) ||
    searchTerm.includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().split(' ').some(word => searchTerm.includes(word) && word.length > 3)
  );

  if (!matchedProduct) {
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Product Not Found',
      description: `Couldn't find a downloadable product matching "${productSearch}".`,
      fields: [{
        name: 'Available Products',
        value: products.length ? products.map(p => `\u2022 ${p.name}`).join('\n').slice(0, 1000) : 'No downloadable products found',
      }],
      footer: { text: `${branding.footer} \u2022 Try typing the exact product name` },
    }]);
  }

  // Generate signed URL & log download
  const [signedUrlResult] = await Promise.all([
    supabase.storage.from('product-assets').createSignedUrl(matchedProduct.asset_file_url, 3600),
    supabase.from('download_logs').insert({ user_id: profile.user_id, product_id: matchedProduct.id }),
    supabase.rpc('increment_download_count', { product_id: matchedProduct.id }).then(() => {}).catch(() => {}),
  ]);

  if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Download Failed',
      description: "Couldn't generate download link. Please try again or use the website.",
      fields: [{ name: 'Alternative', value: 'Visit [Eclipse Marketplace](https://eclipserblx.com) to download your products.' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  const embed = {
    color: 0x3b82f6,
    title: `📥 ${matchedProduct.name}`,
    description: "Your download link is ready! Click the button below to download.\n\n⚠️ This link expires in **1 hour**.",
    thumbnail: { url: avatarUrl },
    footer: { text: `${branding.footer} \u2022 Do not share this link` },
    timestamp: new Date().toISOString(),
  };
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('📥 Download File').setStyle(ButtonStyle.Link).setURL(signedUrlResult.data.signedUrl)
  );

  // Send DM with download (best-effort)
  try { await interaction.user.send({ embeds: [embed], components: [row] }); } catch {}

  // Also reply ephemerally
  return ephemeralReply(interaction, [embed], [row]);
}
