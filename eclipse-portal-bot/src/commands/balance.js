import { getAvatarUrl } from '../utils/embeds.js';
import { publicReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handleBalance(interaction, serverContext) {
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    return interaction.editReply({
      embeds: [{ color: 0xef4444, description: "\u274C Your Discord isn't linked. Use `/link` first." }],
    });
  }

  // Fetch credit balance and XP in parallel
  const [creditResult, xpResult] = await Promise.all([
    supabase
      .from('credit_balances')
      .select('balance, total_purchased, total_gifted, total_spent')
      .eq('user_id', profile.user_id)
      .maybeSingle(),
    supabase
      .from('discord_xp')
      .select('xp, level')
      .eq('discord_id', discordUserId)
      .maybeSingle(),
  ]);

  const credits = creditResult.data || { balance: 0, total_purchased: 0, total_gifted: 0, total_spent: 0 };
  const xp = xpResult.data || { xp: 0, level: 0 };

  const nextLevelXp = ((xp.level || 0) + 1) * 100;
  const progressPct = Math.min(100, Math.round(((xp.xp || 0) % 100) / 100 * 100));
  const progressBar = '\u2588'.repeat(Math.round(progressPct / 10)) + '\u2591'.repeat(10 - Math.round(progressPct / 10));

  return publicReply(interaction, [{
    color: 0x7c3aed,
    title: '\uD83D\uDCB0 Your Eclipse Balance',
    thumbnail: { url: avatarUrl },
    fields: [
      { name: '\uD83D\uDCB3 Credits', value: `\u00A3${Number(credits.balance).toFixed(2)}`, inline: true },
      { name: '\u2B50 Level', value: `${xp.level || 0}`, inline: true },
      { name: '\u2728 XP', value: `${(xp.xp || 0).toLocaleString()}`, inline: true },
      { name: '\uD83D\uDCC8 Level Progress', value: `${progressBar} ${progressPct}%\n${xp.xp || 0} / ${nextLevelXp} XP`, inline: false },
      { name: '\uD83D\uDED2 Total Spent', value: `\u00A3${Number(credits.total_spent).toFixed(2)}`, inline: true },
      { name: '\uD83C\uDF81 Total Gifted', value: `\u00A3${Number(credits.total_gifted).toFixed(2)}`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}
