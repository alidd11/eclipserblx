import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { supabase } from '../supabase.js';

const DURATION_MAP = {
  '60s': 60, '5m': 300, '10m': 600, '30m': 1800,
  '1h': 3600, '6h': 21600, '12h': 43200,
  '1d': 86400, '7d': 604800, '28d': 2419200,
};

export async function handleTimeout(interaction, serverContext) {
  const member = interaction.options.getMember('user');
  const durationStr = interaction.options.getString('duration') || '10m';
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('⛔ You need **Moderate Members** permission.')],
    });
  }

  if (!member) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('❌ User not found in this server.')],
    });
  }

  if (!member.moderatable) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('❌ I cannot timeout this user.')],
    });
  }

  const seconds = DURATION_MAP[durationStr];
  if (!seconds) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('❌ Invalid duration.')],
    });
  }

  try {
    await member.timeout(seconds * 1000, reason);

    await supabase.from('bot_mod_actions').insert({
      guild_id: interaction.guildId,
      moderator_id: interaction.user.id,
      moderator_username: interaction.user.tag,
      target_user_id: member.user.id,
      target_username: member.user.tag,
      action_type: 'timeout',
      reason,
      duration: durationStr,
    });

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0xeab308)
        .setTitle('⏱️ User Timed Out')
        .addFields(
          { name: 'User', value: member.user.tag, inline: true },
          { name: 'Duration', value: durationStr, inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
        )
        .setTimestamp()],
    });
  } catch (error) {
    console.error('[TIMEOUT] Error:', error);
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xef4444).setDescription('❌ Failed to timeout user.')],
    });
  }
}
