import { getBranding } from '../utils/embeds.js';
import { publicReply } from '../utils/responses.js';
import { supabase } from '../supabase.js';

export async function handleLeaderboard(interaction, serverContext) {
  const branding = getBranding(serverContext);

  // Fetch top 10 users by XP
  const { data: topUsers, error } = await supabase
    .from('discord_xp')
    .select('discord_id, username, xp, level')
    .order('xp', { ascending: false })
    .limit(10);

  if (error || !topUsers?.length) {
    return interaction.editReply({
      embeds: [{
        color: 0xf59e0b,
        title: '\uD83C\uDFC6 Leaderboard',
        description: 'No XP data yet! Use commands, claim `/daily`, and be active to earn XP.',
        footer: { text: branding.footer },
      }],
    });
  }

  // Find the caller's rank
  const callerDiscordId = interaction.user.id;
  const { count: callerRank } = await supabase
    .from('discord_xp')
    .select('id', { count: 'exact', head: true })
    .gt('xp', topUsers.find(u => u.discord_id === callerDiscordId)?.xp ?? 0);

  const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
  const leaderboardLines = topUsers.map((user, i) => {
    const prefix = medals[i] || `**${i + 1}.**`;
    const highlight = user.discord_id === callerDiscordId ? ' \u2B05\uFE0F' : '';
    return `${prefix} <@${user.discord_id}> — Level ${user.level || 0} \u2022 ${user.xp?.toLocaleString() || 0} XP${highlight}`;
  });

  const fields = [
    { name: '\uD83D\uDCCA Top 10', value: leaderboardLines.join('\n'), inline: false },
  ];

  // Show caller's position if not in top 10
  const callerInTop10 = topUsers.some(u => u.discord_id === callerDiscordId);
  if (!callerInTop10 && callerRank !== null) {
    const { data: callerData } = await supabase
      .from('discord_xp')
      .select('xp, level')
      .eq('discord_id', callerDiscordId)
      .maybeSingle();

    if (callerData) {
      fields.push({
        name: '\uD83D\uDCCD Your Position',
        value: `#${(callerRank || 0) + 1} — Level ${callerData.level || 0} \u2022 ${callerData.xp?.toLocaleString() || 0} XP`,
        inline: false,
      });
    }
  }

  return publicReply(interaction, [{
    color: branding.color,
    title: '\uD83C\uDFC6 Eclipse XP Leaderboard',
    fields,
    footer: { text: `${branding.footer} \u2022 Earn XP with /daily, commands & activity` },
    timestamp: new Date().toISOString(),
  }]);
}
