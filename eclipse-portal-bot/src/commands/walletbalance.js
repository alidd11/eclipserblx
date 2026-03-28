import { getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handleWalletBalance(interaction) {
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: "❌ Your Discord isn't linked to an Eclipse account. Use `/link` first." }]);
  }

  const { data: balance } = await supabase
    .from('credit_balances').select('balance, total_purchased, total_gifted, total_spent').eq('user_id', profile.user_id).maybeSingle();

  const bal = balance || { balance: 0, total_purchased: 0, total_gifted: 0, total_spent: 0 };
  const embed = {
    title: '💰 Your Eclipse Wallet',
    color: 0x7c3aed,
    fields: [
      { name: 'Current Balance', value: `£${Number(bal.balance).toFixed(2)}`, inline: true },
      { name: 'Total Purchased', value: `£${Number(bal.total_purchased).toFixed(2)}`, inline: true },
      { name: 'Total Gifted', value: `£${Number(bal.total_gifted).toFixed(2)}`, inline: true },
      { name: 'Total Spent', value: `£${Number(bal.total_spent).toFixed(2)}`, inline: true },
    ],
    thumbnail: { url: avatarUrl },
  };

  // Send via DM
  try {
    await interaction.user.send({ embeds: [embed] });
    return ephemeralReply(interaction, [{ color: 0x22c55e, description: '💰 Your wallet balance has been sent to your DMs!' }]);
  } catch {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: "❌ I couldn't send you a DM. Please make sure your DMs are open and try again." }]);
  }
}
