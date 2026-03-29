import { EmbedBuilder } from 'discord.js';
import { supabase } from '../supabase.js';
import { ECLIPSE_COLOR } from '../config.js';

export async function handleAfk(interaction, serverContext) {
  const reason = interaction.options.getString('reason') || 'AFK';

  try {
    // Upsert AFK status
    const { error } = await supabase
      .from('bot_afk_status')
      .upsert({
        discord_user_id: interaction.user.id,
        guild_id: interaction.guildId,
        reason,
        set_at: new Date().toISOString(),
      }, { onConflict: 'discord_user_id,guild_id' });

    if (error) throw error;

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(ECLIPSE_COLOR)
        .setDescription(`💤 **${interaction.user.username}** is now AFK: ${reason}`)
        .setTimestamp()],
    });
  } catch (error) {
    console.error('[AFK] Error:', error);
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xef4444).setDescription('❌ Failed to set AFK status.')],
    });
  }
}
