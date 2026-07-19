import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReplyWithDM, publicReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';
import { config } from '../config.js';

export async function handleGetRole(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    const channelEmbed = { color: 0xef4444, description: `<@${discordUserId}>\n❌ Your account isn't linked yet. Run \`/link\` to get started!`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } };
    const dmEmbed = { color: 0xef4444, title: '❌ Account Not Linked', description: "Your Discord isn't linked to an Eclipse account yet.", fields: [{ name: 'How to Link', value: 'Run `/link` to get started!' }], footer: { text: branding.footer }, timestamp: new Date().toISOString() };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  if (!serverContext.guildId) {
    return publicReplyWithDM(interaction,
      { color: 0xef4444, description: `<@${discordUserId}>\n❌ Bot configuration error.`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } },
      [{ color: 0xef4444, title: '❌ Configuration Error', description: 'Bot configuration error. Please contact support.', footer: { text: branding.footer }, timestamp: new Date().toISOString() }]
    );
  }

  const rolesToAssign = [];
  const rolesToRemove = [];

  if (serverContext.isMainServer) {
    const [ordersResult, storeResult] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', profile.user_id).in('status', ['paid', 'completed']),
      supabase.from('stores').select('id').eq('owner_id', profile.user_id).eq('status', 'approved').maybeSingle(),
    ]);

    const purchaseCount = ordersResult.count || 0;
    if (purchaseCount >= 5 && config.loyalCustomerRoleId) {
      rolesToAssign.push({ id: config.loyalCustomerRoleId, name: 'Loyal Customer' });
      if (config.customerRoleId) rolesToRemove.push({ id: config.customerRoleId, name: 'Customer' });
    } else if (purchaseCount >= 1 && config.customerRoleId) {
      rolesToAssign.push({ id: config.customerRoleId, name: 'Customer' });
    }
    if (storeResult.data && config.storeCreatorRoleId) rolesToAssign.push({ id: config.storeCreatorRoleId, name: 'Store Creator' });
  } else if (serverContext.store) {
    const [roleConfigsResult, ordersResult] = await Promise.all([
      supabase.from('discord_role_configs').select('*').eq('store_id', serverContext.store.id).eq('auto_assign_on_purchase', true),
      supabase.from('orders').select('id').eq('user_id', profile.user_id).in('status', ['paid', 'completed']).limit(200),
    ]);
    const roleConfigs = roleConfigsResult.data || [];
    const orderIds = (ordersResult.data || []).map(o => o.id);
    let orderCount = 0, totalSpent = 0;

    if (orderIds.length > 0) {
      const { data: orderItems } = await supabase.from('order_items').select('product_id, price, order_id').in('order_id', orderIds);
      if (orderItems?.length) {
        const productIds = [...new Set(orderItems.map(i => i.product_id).filter(Boolean))];
        const { data: products } = await supabase.from('products').select('id, store_id').in('id', productIds);
        const storeProductSet = new Set((products || []).filter(p => p.store_id === serverContext.store.id).map(p => p.id));
        const storeItems = (orderItems || []).filter(i => storeProductSet.has(i.product_id));
        orderCount = storeItems.length;
        totalSpent = storeItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
      }
    }

    for (const cfg of roleConfigs) {
      let eligible = true;
      if (cfg.min_order_count && orderCount < cfg.min_order_count) eligible = false;
      if (cfg.min_order_amount && totalSpent < cfg.min_order_amount) eligible = false;
      if (eligible) rolesToAssign.push({ id: cfg.role_id, name: cfg.role_name });
    }
  } else {
    return publicReplyWithDM(interaction,
      { color: 0xef4444, description: `<@${discordUserId}>\n❌ This server isn't configured for automatic roles.`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } },
      [{ color: 0xef4444, title: '❌ Server Not Configured', description: "This Discord server isn't linked to the main Eclipse server or a creator store.", footer: { text: branding.footer }, timestamp: new Date().toISOString() }]
    );
  }

  // Fetch member ONCE before role operations
  const guild = interaction.guild;
  let member;
  try {
    member = await guild.members.fetch(discordUserId);
  } catch (e) {
    console.error('[getrole] Failed to fetch member:', e.message);
    return publicReply(interaction, [{ color: 0xef4444, title: '❌ Error', description: 'Could not fetch your server membership. Please try again.', footer: { text: branding.footer } }]);
  }

  const rolesAssigned = [];
  const rolesFailed = [];

  await Promise.all([
    ...rolesToAssign.map(async role => {
      try {
        await member.roles.add(role.id);
        rolesAssigned.push(role.name);
      } catch (e) {
        console.error(`[getrole] Failed ${role.name}:`, e.message);
        rolesFailed.push(role.name);
      }
    }),
    ...rolesToRemove.map(async role => {
      try {
        await member.roles.remove(role.id);
      } catch {}
    }),
  ]);

  const fields = [];
  if (rolesAssigned.length > 0) {
    fields.push({ name: '✅ Roles Synced', value: rolesToAssign.filter(r => rolesAssigned.includes(r.name)).map(r => `<@&${r.id}>`).join('\n'), inline: true });
  }
  if (rolesFailed.length > 0) {
    fields.push({ name: '❌ Failed', value: rolesFailed.map(r => `• ${r}`).join('\n'), inline: true });
  }

  // Build eligibility hints
  if (serverContext.isMainServer && rolesAssigned.length === 0) {
    const [ordersRes, storeRes] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', profile.user_id).in('status', ['paid', 'completed']),
      supabase.from('stores').select('id').eq('owner_id', profile.user_id).eq('status', 'approved').maybeSingle(),
    ]);
    const eligibility = [];
    const count = ordersRes.count || 0;
    if (count === 0) eligibility.push('• Make a purchase → **Customer**');
    if (count > 0 && count < 5) eligibility.push(`• ${5 - count} more purchases → **Loyal Customer**`);
    if (!storeRes.data) eligibility.push('• Create a store → **Store Creator**');
    if (eligibility.length > 0) fields.push({ name: '📋 How to Earn Roles', value: eligibility.join('\n') });
  }

  const publicEmbed = {
    color: rolesAssigned.length > 0 ? 0x22c55e : 0xf59e0b,
    title: rolesAssigned.length > 0 ? '🎉 Roles Synced!' : '📋 Role Status',
    description: rolesAssigned.length > 0
      ? `<@${discordUserId}>\n\nYour roles have been updated!`
      : `<@${discordUserId}>\n\nHere's what you need to earn roles:`,
    thumbnail: { url: avatarUrl },
    fields,
    footer: { text: branding.footer },
    timestamp: new Date().toISOString(),
  };
  return publicReply(interaction, [publicEmbed]);
}
