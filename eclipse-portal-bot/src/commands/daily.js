import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

// Daily XP rewards by streak day (cycles every 7 days)
const STREAK_REWARDS = [10, 15, 20, 25, 30, 40, 75];

export async function handleDaily(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    return interaction.editReply({
      embeds: [{
        color: 0xef4444,
        description: "\u274C Your Discord isn't linked to an Eclipse account. Use `/link` first.",
      }],
    });
  }

  // Check last claim
  const { data: lastClaim } = await supabase
    .from('discord_daily_claims')
    .select('*')
    .eq('discord_id', discordUserId)
    .order('claimed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  // Already claimed today?
  if (lastClaim) {
    const lastClaimDate = new Date(lastClaim.claimed_at);
    if (lastClaimDate >= todayStart) {
      const tomorrow = new Date(todayStart);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const hoursLeft = Math.ceil((tomorrow - now) / (1000 * 60 * 60));

      return interaction.editReply({
        embeds: [{
          color: 0xf59e0b,
          title: '\u23F0 Already Claimed!',
          description: `You've already claimed your daily reward today.\nCome back in **${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}**!`,
          fields: [
            { name: '\uD83D\uDD25 Current Streak', value: `${lastClaim.streak_day} day${lastClaim.streak_day === 1 ? '' : 's'}`, inline: true },
          ],
          thumbnail: { url: avatarUrl },
          footer: { text: branding.footer },
        }],
      });
    }
  }

  // Calculate streak
  let streakDay = 1;
  if (lastClaim) {
    const lastClaimDate = new Date(lastClaim.claimed_at);
    const yesterday = new Date(todayStart);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    if (lastClaimDate >= yesterday) {
      // Continued streak
      streakDay = (lastClaim.streak_day % 7) + 1;
    }
    // Otherwise streak resets to 1
  }

  const xpReward = STREAK_REWARDS[streakDay - 1] || 10;

  // Insert claim record
  const { error: claimError } = await supabase
    .from('discord_daily_claims')
    .insert({
      discord_id: discordUserId,
      streak_day: streakDay,
      xp_earned: xpReward,
      bonus_earned: 0,
    });

  if (claimError) {
    console.error('[daily] Claim insert error:', claimError);
    return interaction.editReply({
      embeds: [{ color: 0xef4444, description: '\u274C Failed to claim daily reward. Try again later.' }],
    });
  }

  // Update XP in discord_xp table (upsert)
  const { data: existingXp } = await supabase
    .from('discord_xp')
    .select('xp, level')
    .eq('discord_id', discordUserId)
    .maybeSingle();

  if (existingXp) {
    const newXp = (existingXp.xp || 0) + xpReward;
    const newLevel = Math.floor(newXp / 100); // Simple leveling: 100 XP per level
    await supabase
      .from('discord_xp')
      .update({ xp: newXp, level: newLevel })
      .eq('discord_id', discordUserId);
  } else {
    await supabase
      .from('discord_xp')
      .insert({
        discord_id: discordUserId,
        user_id: profile.user_id,
        xp: xpReward,
        level: 0,
        username: interaction.user.username,
      });
  }

  // Build streak progress bar
  const progressBar = STREAK_REWARDS.map((_, i) => (i < streakDay ? '\u2B50' : '\u2B1C')).join('');

  return publicReply(interaction, [{
    color: branding.color,
    title: '\uD83C\uDF81 Daily Reward Claimed!',
    description: `You earned **${xpReward} XP** today!`,
    fields: [
      { name: '\uD83D\uDD25 Streak', value: `Day ${streakDay}/7`, inline: true },
      { name: '\u2728 XP Earned', value: `+${xpReward} XP`, inline: true },
      { name: '\uD83D\uDCC5 Progress', value: progressBar, inline: false },
    ],
    thumbnail: { url: avatarUrl },
    footer: { text: `${branding.footer} \u2022 Come back tomorrow to keep your streak!` },
    timestamp: new Date().toISOString(),
  }]);
}
