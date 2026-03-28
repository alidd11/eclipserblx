import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReplyWithDM } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handlePurchases(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    const channelEmbed = {
      color: 0xef4444,
      description: `<@${discordUserId}>\n❌ Your Discord isn't linked yet. Run \`/link\` to get started!`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0xef4444, title: '❌ Account Not Linked',
      description: "Your Discord isn't linked to an Eclipse account yet.",
      fields: [{ name: 'How to Link', value: 'Run `/link` to get started!' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  const { data: orders } = await supabase
    .from('orders').select('id, created_at, status, total')
    .eq('user_id', profile.user_id).in('status', ['paid', 'completed'])
    .order('created_at', { ascending: false }).limit(20);

  if (!orders || orders.length === 0) {
    const msg = serverContext.store
      ? `You haven't purchased anything from ${serverContext.store.name} yet.`
      : "You haven't made any purchases yet.";
    const channelEmbed = { color: 0x3b82f6, description: `<@${discordUserId}>\n📦 ${msg}`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } };
    const dmEmbed = { color: 0x3b82f6, title: '📦 No Purchases Found', description: msg, footer: { text: branding.footer }, timestamp: new Date().toISOString() };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  const orderIds = orders.map(o => o.id);
  const orderCreatedAt = new Map(orderIds.map(id => [id, orders.find(o => o.id === id)?.created_at]));

  const { data: orderItems } = await supabase
    .from('order_items').select('order_id, product_id, product_name, price').in('order_id', orderIds);

  if (!orderItems || orderItems.length === 0) {
    const channelEmbed = { color: 0x3b82f6, title: '📦 No Purchases Found', description: `<@${discordUserId}>\nI couldn't find any purchasable items.`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } };
    const dmEmbed = { color: 0x3b82f6, title: '📦 No Purchases Found', description: "I couldn't find any purchasable items for your recent orders.", footer: { text: branding.footer }, timestamp: new Date().toISOString() };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  let filteredItems = orderItems;

  if (serverContext.store) {
    const productIds = [...new Set(filteredItems.map(i => i.product_id).filter(Boolean))];
    const { data: products } = await supabase.from('products').select('id, store_id').in('id', productIds);
    const storeProductSet = new Set((products || []).filter(p => p.store_id === serverContext.store.id).map(p => p.id));
    filteredItems = filteredItems.filter(i => storeProductSet.has(i.product_id));

    if (!filteredItems.length) {
      const channelEmbed = { color: 0x3b82f6, title: '📦 No Purchases Found', description: `<@${discordUserId}>\nYou haven't purchased anything from ${serverContext.store.name} yet.`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } };
      const dmEmbed = { color: 0x3b82f6, title: '📦 No Purchases Found', description: `You haven't purchased anything from ${serverContext.store.name} yet.`, footer: { text: branding.footer }, timestamp: new Date().toISOString() };
      return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
    }
  }

  const productList = filteredItems
    .map(item => ({
      name: item.product_name,
      date: orderCreatedAt.get(item.order_id) ? new Date(orderCreatedAt.get(item.order_id)).toLocaleDateString('en-GB') : '',
      price: Number(item.price || 0),
      orderId: item.order_id,
    }))
    .sort((a, b) => {
      const aTime = orderCreatedAt.get(a.orderId) ? new Date(orderCreatedAt.get(a.orderId)).getTime() : 0;
      const bTime = orderCreatedAt.get(b.orderId) ? new Date(orderCreatedAt.get(b.orderId)).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 15);

  const embed = {
    color: 0x22c55e,
    title: serverContext.store ? `📦 Your ${serverContext.store.name} Purchases` : '📦 Your Purchases',
    description: 'Here are your most recent purchases:',
    thumbnail: { url: avatarUrl },
    fields: productList.map((p, i) => ({
      name: `${i + 1}. ${p.name}`,
      value: `£${p.price.toFixed(2)}${p.date ? ` \u2022 ${p.date}` : ''}`,
    })),
    footer: { text: `${branding.footer} \u2022 Use /retrieve to get files` },
    timestamp: new Date().toISOString(),
  };
  const channelEmbed = {
    color: 0x22c55e,
    description: `<@${discordUserId}>\n📦 Check your DMs for your purchase list.`,
    thumbnail: { url: avatarUrl },
    footer: { text: branding.footer },
  };
  return publicReplyWithDM(interaction, channelEmbed, [embed]);
}
