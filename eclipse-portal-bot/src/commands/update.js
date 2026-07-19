import { PermissionsBitField } from 'discord.js';
import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply } from '../utils/responses.js';
import { supabase } from '../supabase.js';
import { config } from '../config.js';

export async function handleUpdate(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);

  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) {
    return ephemeralReply(interaction, [{ color: 0xef4444, title: '❌ Permission Denied', description: 'You need the **Manage Roles** permission to use this command.', footer: { text: branding.footer } }]);
  }

  const targetUser = interaction.options.getUser('user');
  if (!targetUser) return ephemeralReply(interaction, [{ color: 0xef4444, title: '❌ Missing User', description: 'Please provide a **user** to sync roles for.', footer: { text: branding.footer } }]);

  const { data: profile } = await supabase.from('profiles').select('user_id, username, discord_id').eq('discord_id', targetUser.id).maybeSingle();
  if (!profile) return ephemeralReply(interaction, [{ color: 0xef4444, title: '❌ Account Not Linked', description: `<@${targetUser.id}> doesn't have a linked Eclipse account.`, footer: { text: branding.footer } }]);

  try {
    const rolesToAssign = [];
    const rolesToRemove = [];

    if (serverContext.isMainServer) {
      const [ordersResult, storeResult] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', profile.user_id).in('status', ['paid', 'completed']),
        supabase.from('stores').select('id, is_verified').eq('owner_id', profile.user_id).eq('status', 'approved').maybeSingle(),
      ]);
      const purchaseCount = ordersResult.count || 0;
      const hasStore = !!storeResult.data;
      const isVerified = storeResult.data?.is_verified === true;

      if (purchaseCount >= 5 && config.loyalCustomerRoleId) {
        rolesToAssign.push({ id: config.loyalCustomerRoleId, name: 'Loyal Customer' });
        if (config.customerRoleId) rolesToRemove.push({ id: config.customerRoleId, name: 'Customer' });
      } else if (purchaseCount >= 1 && config.customerRoleId) {
        rolesToAssign.push({ id: config.customerRoleId, name: 'Customer' });
        if (config.loyalCustomerRoleId) rolesToRemove.push({ id: config.loyalCustomerRoleId, name: 'Loyal Customer' });
      } else {
        if (config.customerRoleId) rolesToRemove.push({ id: config.customerRoleId, name: 'Customer' });
        if (config.loyalCustomerRoleId) rolesToRemove.push({ id: config.loyalCustomerRoleId, name: 'Loyal Customer' });
      }
      if (hasStore && config.storeCreatorRoleId) rolesToAssign.push({ id: config.storeCreatorRoleId, name: 'Store Creator' });
      else if (config.storeCreatorRoleId) rolesToRemove.push({ id: config.storeCreatorRoleId, name: 'Store Creator' });
      if (isVerified && config.verifiedSellerRoleId) rolesToAssign.push({ id: config.verifiedSellerRoleId, name: 'Verified Seller' });
      else if (config.verifiedSellerRoleId) rolesToRemove.push({ id: config.verifiedSellerRoleId, name: 'Verified Seller' });
    } else if (serverContext.store) {
      const [roleConfigsResult, ordersResult] = await Promise.all([
        supabase.from('discord_role_configs').select('*').eq('store_id', serverContext.store.id).eq('auto_assign_on_purchase', true),
        supabase.from('orders').select('id').eq('user_id', profile.user_id).in('status', ['paid', 'completed']).limit(200),
      ]);
      const roleConfigs = roleConfigsResult.data || [];
      const orderIds = (ordersResult.data || []).map(o => o.id);
      if (orderIds.length > 0 && roleConfigs.length > 0) {
        const { data: orderItems } = await supabase.from('order_items').select('store_id').in('order_id', orderIds).eq('store_id', serverContext.store.id);
        const storeOrderCount = orderItems?.length || 0;
        for (const cfg of roleConfigs) {
          if (!cfg.min_order_count || storeOrderCount >= cfg.min_order_count) {
            rolesToAssign.push({ id: cfg.role_id, name: cfg.role_name });
          }
        }
      }
    }

    const member = await interaction.guild.members.fetch(targetUser.id);
    const assigned = [], removed = [], errors = [];

    await Promise.all([
      ...rolesToAssign.map(async role => {
        try { await member.roles.add(role.id); assigned.push(role.name); } catch { errors.push(`Failed to assign ${role.name}`); }
      }),
      ...rolesToRemove.map(async role => {
        try { await member.roles.remove(role.id); removed.push(role.name); } catch {}
      }),
    ]);

    await supabase.from('audit_logs').insert({
      action: 'discord_role_sync_manual', resource: 'discord_roles', user_id: null,
      details: { admin_discord_id: discordUserId, target_discord_id: targetUser.id, target_eclipse_user: profile.username, assigned, removed, errors, guild_id: serverContext.guildId },
    });

    const fields = [];
    if (assigned.length > 0) fields.push({ name: '✅ Assigned', value: assigned.map(r => `\`${r}\``).join(', '), inline: true });
    if (removed.length > 0) fields.push({ name: '🔄 Removed', value: removed.map(r => `\`${r}\``).join(', '), inline: true });
    if (errors.length > 0) fields.push({ name: '⚠️ Errors', value: errors.join('\n') });
    if (!assigned.length && !removed.length && !errors.length) fields.push({ name: 'ℹ️ No Changes', value: 'No roles needed updating for this user.' });

    return ephemeralReply(interaction, [{ color: errors.length > 0 ? 0xf59e0b : 0x22c55e, title: `🔄 Role Sync — ${profile.username}`, description: `Synced Eclipse roles for <@${targetUser.id}>.`, fields, footer: { text: branding.footer } }]);
  } catch (error) {
    console.error('[update] Error:', error);
    return ephemeralReply(interaction, [{ color: 0xef4444, title: '❌ Error', description: 'An unexpected error occurred. Please try again.', footer: { text: branding.footer } }]);
  }
}
