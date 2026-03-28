import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReplyWithDM } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';

export async function handleLink(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (profile) {
    const channelEmbed = {
      color: 0x22c55e,
      description: `<@${discordUserId}>\n✅ Your account is already linked! Check your DMs for details.`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0x22c55e,
      title: '✅ Account Linked',
      description: `Your Discord is connected to **@${profile.username}**`,
      thumbnail: { url: avatarUrl },
      fields: [{ name: '🆔 Customer ID', value: profile.customer_id || 'N/A', inline: true }],
      footer: { text: `${branding.footer} \u2022 Use /profile, /purchases, or /retrieve` },
      timestamp: new Date().toISOString(),
    };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  // Not linked — send DM with button
  const channelEmbed = {
    color: branding.color,
    description: `<@${discordUserId}>\n🔗 Check your DMs for a quick link to connect your Eclipse account!`,
    thumbnail: { url: avatarUrl },
    footer: { text: branding.footer },
  };
  const dmEmbed = {
    color: branding.color,
    title: '🔗 Link Your Eclipse Account',
    description: "Connect your Discord to access your purchases and downloads.\n\nClick the button below to link your account instantly!",
    thumbnail: { url: avatarUrl },
    fields: [{
      name: '💡 How it works',
      value: "1. Click **Link Account** below\n2. Log in to Eclipse (if needed)\n3. Authorize Discord - that's it!",
    }],
    footer: { text: branding.footer },
    timestamp: new Date().toISOString(),
  };
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('🔗 Link Account').setStyle(ButtonStyle.Link).setURL('https://eclipserblx.com/account?action=link-discord')
  );
  return publicReplyWithDM(interaction, channelEmbed, [dmEmbed], [row]);
}
