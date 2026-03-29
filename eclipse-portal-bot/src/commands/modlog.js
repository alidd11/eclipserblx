import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { supabase } from '../supabase.js';
import { ECLIPSE_COLOR } from '../config.js';

const ACTION_EMOJIS = { ban: '🔨', kick: '👢', timeout: '⏱️', unban: '✅' };

export async function handleModlog(interaction, serverContext) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription('⛔ You need **Moderate Members** permission.')],
    });
  }

  const count = interaction.options.getInteger('count') || 10;

  try {
    const { data: actions, error } = await supabase
      .from('bot_mod_actions')
      .select('*')
      .eq('guild_id', interaction.guildId)
      .order('created_at', { ascending: false })
      .limit(Math.min(count, 25));

    if (error) throw error;

    if (!actions || actions.length === 0) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(ECLIPSE_COLOR)
          .setDescription('📋 No moderation actions recorded for this server.')],
      });
    }

    const lines = actions.map((a, i) => {
      const emoji = ACTION_EMOJIS[a.action_type] || '📋';
      const date = new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return `${emoji} **${a.action_type.toUpperCase()}** — ${a.target_username || a.target_user_id}\n` +
        `   ${a.reason || 'No reason'} · by ${a.moderator_username || a.moderator_id} · ${date}`;
    });

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(ECLIPSE_COLOR)
        .setTitle('📋 Moderation Log')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `Showing ${actions.length} most recent actions` })
        .setTimestamp()],
    });
  } catch (error) {
    console.error('[MODLOG] Error:', error);
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xef4444).setDescription('❌ Failed to fetch mod log.')],
    });
  }
}
