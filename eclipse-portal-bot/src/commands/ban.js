import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { supabase } from '../supabase.js';
import { ECLIPSE_COLOR } from '../config.js';

export async function handleBan(interaction, serverContext) {
  const member = interaction.options.getMember('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const deleteMessages = interaction.options.getInteger('delete_messages') || 0;

  if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('⛔ You need **Ban Members** permission.')],
    });
  }

  if (!member) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('❌ User not found in this server.')],
    });
  }

  if (!member.bannable) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('❌ I cannot ban this user. They may have a higher role than me.')],
    });
  }

  try {
    await member.ban({ reason, deleteMessageSeconds: deleteMessages * 86400 });

    // Log to DB
    await supabase.from('bot_mod_actions').insert({
      guild_id: interaction.guildId,
      moderator_id: interaction.user.id,
      moderator_username: interaction.user.tag,
      target_user_id: member.user.id,
      target_username: member.user.tag,
      action_type: 'ban',
      reason,
    });

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('🔨 User Banned')
        .addFields(
          { name: 'User', value: `${member.user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
        )
        .setTimestamp()],
    });
  } catch (error) {
    console.error('[BAN] Error:', error);
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xef4444).setDescription('❌ Failed to ban user.')],
    });
  }
}
