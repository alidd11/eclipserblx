import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReplyWithDM } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handleProfile(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    const channelEmbed = {
      color: 0xef4444,
      title: '❌ Account Not Linked',
      description: `<@${discordUserId}>\nYour Discord isn't linked yet. Run \`/link\` to get started!`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0xef4444,
      title: '❌ Account Not Linked',
      description: "Your Discord isn't linked to an Eclipse account yet.",
      fields: [{ name: 'How to Link', value: 'Run `/link` to get started!' }],
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  let orderCount = 0;
  let totalSpent = 0;

  if (serverContext.store) {
    // Store server: only count purchases for this store
    const { data: orders } = await supabase
      .from('orders').select('id')
      .eq('user_id', profile.user_id)
      .in('status', ['paid', 'completed']).limit(200);

    const orderIds = (orders || []).map(o => o.id);
    if (orderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from('order_items').select('product_id').in('order_id', orderIds);
      const productIds = [...new Set((orderItems || []).map(i => i.product_id).filter(Boolean))];
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products').select('id, store_id').in('id', productIds);
        const storeProductSet = new Set(
          (products || []).filter(p => p.store_id === serverContext.store.id).map(p => p.id)
        );
        orderCount = (orderItems || []).filter(i => storeProductSet.has(i.product_id)).length;
      }
    }
  } else {
    const [orderCountResult, ordersTotalsResult] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('user_id', profile.user_id).in('status', ['paid', 'completed']),
      supabase.from('orders').select('total')
        .eq('user_id', profile.user_id).in('status', ['paid', 'completed']),
    ]);
    orderCount = orderCountResult.count || 0;
    totalSpent = ordersTotalsResult.data?.reduce((sum, o) => sum + Number(o.total || 0), 0) || 0;
  }

  const fields = [
    { name: '👤 Username', value: `@${profile.username}`, inline: true },
    { name: '🆔 Customer ID', value: profile.customer_id || 'N/A', inline: true },
  ];
  if (!serverContext.store) {
    fields.push({ name: '💷 Total Spent', value: `£${totalSpent.toFixed(2)}`, inline: true });
  }
  fields.push({
    name: serverContext.store ? `🛒 Orders from ${serverContext.store.name}` : '🛒 Total Orders',
    value: `${orderCount} purchases`, inline: true,
  });

  const embed = {
    color: branding.color,
    author: { name: profile.display_name || profile.username, icon_url: profile.avatar_url || undefined },
    title: serverContext.store ? `${serverContext.store.name} Profile` : 'Eclipse Profile',
    thumbnail: { url: avatarUrl },
    fields,
    footer: { text: branding.footer },
    timestamp: new Date().toISOString(),
  };
  const channelEmbed = {
    color: branding.color,
    description: `<@${discordUserId}>\n👤 Profile sent! Check your DMs.`,
    thumbnail: { url: avatarUrl },
    footer: { text: branding.footer },
  };
  return publicReplyWithDM(interaction, channelEmbed, [embed]);
}
