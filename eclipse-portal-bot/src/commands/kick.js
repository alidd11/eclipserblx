import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { supabase } from '../supabase.js';

export async function handleKick(interaction, serverContext) {
  const member = interaction.options.getMember('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('⛔ You need **Kick Members** permission.')],
    });
  }

  if (!member) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('❌ User not found in this server.')],
    });
  }

  if (!member.kickable) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('❌ I cannot kick this user.')],
    });
  }

  try {
    await member.kick(reason);

    await supabase.from('bot_mod_actions').insert({
      guild_id: interaction.guildId,
      moderator_id: interaction.user.id,
      moderator_username: interaction.user.tag,
      target_user_id: member.user.id,
      target_username: member.user.tag,
      action_type: 'kick',
      reason,
    });

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0xf97316)
        .setTitle('👢 User Kicked')
        .addFields(
          { name: 'User', value: member.user.tag, inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
        )
        .setTimestamp()],
    });
  } catch (error) {
    console.error('[KICK] Error:', error);
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xef4444).setDescription('❌ Failed to kick user.')],
    });
  }
}
