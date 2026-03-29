import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getBranding } from '../utils/embeds.js';
import { ephemeralReply } from '../utils/responses.js';

const PAGES = [
  {
    title: '\uD83D\uDCD6 Eclipse Portal Bot - Account',
    commands: [
      { name: '/link', desc: 'Check if your Discord is linked to Eclipse' },
      { name: '/verify', desc: 'Link your Discord using a code from Eclipse' },
      { name: '/profile', desc: 'View your Eclipse profile and stats' },
      { name: '/unlink', desc: 'Disconnect your Discord from Eclipse' },
    ],
    tip: '\uD83D\uDCA1 Use `/verify` with your code from the Eclipse website to link your account!',
  },
  {
    title: '\uD83D\uDCD6 Eclipse Portal Bot - Shopping',
    commands: [
      { name: '/purchases', desc: 'View your recent purchases' },
      { name: '/retrieve', desc: 'Get a download link for a purchased product' },
      { name: '/store', desc: "View this server's store information" },
      { name: '/showcase', desc: 'Showcase your store or product' },
    ],
    tip: '\uD83D\uDED2 Browse products and retrieve your purchases anytime!',
  },
  {
    title: '\uD83D\uDCD6 Eclipse Portal Bot - Community',
    commands: [
      { name: '/daily', desc: 'Claim your daily XP reward (streak bonuses!)' },
      { name: '/leaderboard', desc: 'View the Eclipse XP leaderboard' },
      { name: '/balance', desc: 'View your credits and XP in one place' },
      { name: '/walletbalance', desc: 'Check your Eclipse wallet balance (via DM)' },
      { name: '/newdrops', desc: 'View the latest product drops' },
    ],
    tip: '\uD83D\uDD25 Claim daily rewards to build your streak and climb the leaderboard!',
  },
  {
    title: '\uD83D\uDCD6 Eclipse Portal Bot - Roles & Support',
    commands: [
      { name: '/getrole', desc: 'Sync your Discord roles based on your account' },
      { name: '/help', desc: 'View this help message' },
    ],
    tip: '\uD83C\uDFAB Use `/getrole` after purchases to sync your roles!',
  },
  {
    title: '\uD83D\uDEE1\uFE0F Eclipse Portal Bot - Global Guard',
    commands: [
      { name: '/globalban', desc: 'Ban a user across all your servers' },
      { name: '/globalunban', desc: 'Remove a global ban from a user' },
      { name: '/globalbans', desc: 'View your active global bans' },
    ],
    tip: '\uD83D\uDEE1\uFE0F Requires an active bot license. Visit guard.eclipserblx.com for full management!',
  },
];

export function buildHelpResponse(serverContext, page = 0) {
  const branding = getBranding(serverContext);
  const currentPage = PAGES[page] || PAGES[0];
  const totalPages = PAGES.length;

  const commandList = currentPage.commands.map(cmd => `**${cmd.name}** \u2014 ${cmd.desc}`).join('\n');
  const embed = {
    color: branding.color,
    title: currentPage.title,
    description: `Page ${page + 1} of ${totalPages}\n\n${commandList}`,
    fields: [{ name: currentPage.tip.split(' ')[0], value: currentPage.tip.substring(currentPage.tip.indexOf(' ') + 1) }],
    footer: { text: branding.footer, icon_url: branding.icon },
    timestamp: new Date().toISOString(),
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`portalhelp_prev_${page}`).setLabel('\u25C0 Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(`portalhelp_page_${page}`).setLabel(`${page + 1}/${totalPages}`).setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId(`portalhelp_next_${page}`).setLabel('Next \u25B6').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
  );

  return { embeds: [embed], components: [row], ephemeral: true };
}

export async function handleHelp(interaction, serverContext) {
  const response = buildHelpResponse(serverContext, 0);
  return interaction.reply(response);
}

export async function handleHelpPagination(interaction, serverContext, action, currentPage) {
  let newPage = currentPage;
  if (action === 'prev') newPage = Math.max(0, currentPage - 1);
  else if (action === 'next') newPage = Math.min(PAGES.length - 1, currentPage + 1);
  const response = buildHelpResponse(serverContext, newPage);
  return interaction.update(response);
}
