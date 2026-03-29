import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { supabase } from '../supabase.js';

export async function handleUnban(interaction, serverContext) {
  const userId = interaction.options.getString('user_id');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('⛔ You need **Ban Members** permission.')],
    });
  }

  if (!userId) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('❌ Please provide a user ID.')],
    });
  }

  try {
    await interaction.guild.members.unban(userId, reason);

    await supabase.from('bot_mod_actions').insert({
      guild_id: interaction.guildId,
      moderator_id: interaction.user.id,
      moderator_username: interaction.user.tag,
      target_user_id: userId,
      target_username: null,
      action_type: 'unban',
      reason,
    });

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('✅ User Unbanned')
        .addFields(
          { name: 'User ID', value: userId, inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
        )
        .setTimestamp()],
    });
  } catch (error) {
    if (error.code === 10026) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('❌ User is not banned.')],
      });
    }
    console.error('[UNBAN] Error:', error);
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xef4444).setDescription('❌ Failed to unban user.')],
    });
  }
}
