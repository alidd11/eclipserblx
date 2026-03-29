import { getServerContext } from '../utils/server-context.js';
import { checkCooldown, setCooldown } from '../utils/rate-limiter.js';
import { logBotError } from '../utils/error-logger.js';
import { hasCommandPermission } from '../utils/command-permissions.js';
import { supabase } from '../supabase.js';
import { handleLink } from '../commands/link.js';
import { handleVerify } from '../commands/verify.js';
import { handleProfile } from '../commands/profile.js';
import { handlePurchases } from '../commands/purchases.js';
import { handleRetrieve } from '../commands/retrieve.js';
import { handleGetRole } from '../commands/getrole.js';
import { handleStore } from '../commands/store.js';
import { handleUnlink } from '../commands/unlink.js';
import { handleShowcaseCommand, handleShowcaseModal } from '../commands/showcase.js';
import { handleWalletBalance } from '../commands/walletbalance.js';
import { handleHelp, handleHelpPagination } from '../commands/help.js';
import { handleUpdate } from '../commands/update.js';
import { handleGlobalBan } from '../commands/globalban.js';
import { handleGlobalUnban } from '../commands/globalunban.js';
import { handleGlobalBans } from '../commands/globalbans.js';
import { handleDaily } from '../commands/daily.js';
import { handleLeaderboard } from '../commands/leaderboard.js';
import { handleBalance } from '../commands/balance.js';
import { handleNewDrops } from '../commands/newdrops.js';
import { handleBan } from '../commands/ban.js';
import { handleKick } from '../commands/kick.js';
import { handleTimeout } from '../commands/timeout.js';
import { handleUnban } from '../commands/unban.js';
import { handleModlog } from '../commands/modlog.js';
import { handleAfk } from '../commands/afk.js';

// Commands that need deferral (do DB work before responding)
const DEFERRED_COMMANDS = new Set([
  'link', 'verify', 'profile', 'purchases', 'retrieve',
  'getrole', 'roles', 'store', 'unlink', 'walletbalance',
  'update', 'globalban', 'globalunban', 'globalbans',
  'daily', 'leaderboard', 'balance', 'newdrops',
  'ban', 'kick', 'timeout', 'unban', 'modlog', 'afk',
]);

// Commands that use ephemeral replies
const EPHEMERAL_COMMANDS = new Set([
  'retrieve', 'walletbalance', 'update', 'globalban',
  'globalunban', 'globalbans', 'balance', 'modlog',
]);

// Commands exempt from cooldown checks
const COOLDOWN_EXEMPT = new Set(['help']);

// Cache for disabled commands (refreshed every 2 minutes)
let disabledCommandsCache = new Set();
let disabledCacheTimestamp = 0;
const DISABLED_CACHE_TTL = 2 * 60 * 1000;

async function getDisabledCommands() {
  if (Date.now() - disabledCacheTimestamp < DISABLED_CACHE_TTL) {
    return disabledCommandsCache;
  }
  try {
    const { data } = await supabase
      .from('bot_command_settings')
      .select('command_name')
      .eq('enabled', false);
    disabledCommandsCache = new Set((data || []).map(c => c.command_name));
    disabledCacheTimestamp = Date.now();
  } catch (err) {
    console.error('[interaction] Failed to fetch command settings:', err.message);
  }
  return disabledCommandsCache;
}

export async function handleInteraction(interaction) {
  try {
    // Handle button interactions (help pagination)
    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (customId.startsWith('portalhelp_')) {
        const parts = customId.split('_');
        const action = parts[1];
        const page = parseInt(parts[2]) || 0;
        const serverContext = await getServerContext(interaction.guildId);
        return handleHelpPagination(interaction, serverContext, action, page);
      }
      return;
    }

    // Handle modal submissions — showcase uses its own deferral
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'showcase_modal') {
        await interaction.deferReply();
        const serverContext = await getServerContext(interaction.guildId);
        return handleShowcaseModal(interaction, serverContext);
      }
      return;
    }

    // Handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const userId = interaction.user.id;
    console.log(`[interaction] /${commandName} by ${interaction.user.tag} in guild ${interaction.guildId}`);

    // Check if command is disabled in dashboard
    const disabled = await getDisabledCommands();
    if (disabled.has(commandName)) {
      return interaction.reply({
        embeds: [{
          color: 0xf59e0b,
          description: `\u26A0\uFE0F The \`/${commandName}\` command is currently disabled.`,
        }],
        ephemeral: true,
      });
    }

    // Cooldown check (before deferring)
    if (!COOLDOWN_EXEMPT.has(commandName)) {
      const remaining = checkCooldown(commandName, userId);
      if (remaining > 0) {
        return interaction.reply({
          embeds: [{
            color: 0xf59e0b,
            description: `\u23F3 Please wait **${remaining}s** before using \`/${commandName}\` again.`,
          }],
          ephemeral: true,
        });
      }
    }

    // Showcase opens a modal — must NOT be deferred
    if (commandName === 'showcase') {
      setCooldown(commandName, userId);
      const serverContext = await getServerContext(interaction.guildId);
      // Check permissions for seller servers
      if (!serverContext.isMainServer) {
        const allowed = await hasCommandPermission(interaction, commandName, false);
        if (!allowed) {
          return interaction.reply({
            embeds: [{ color: 0xf59e0b, description: '\u26D4 You don\u2019t have the required role to use this command here.' }],
            ephemeral: true,
          });
        }
      }
      return handleShowcaseCommand(interaction, serverContext);
    }

    // Help is lightweight — respond immediately
    if (commandName === 'help') {
      const serverContext = await getServerContext(interaction.guildId);
      return handleHelp(interaction, serverContext);
    }

    // Defer all other commands to prevent 3-second timeout
    if (DEFERRED_COMMANDS.has(commandName)) {
      await interaction.deferReply({ ephemeral: EPHEMERAL_COMMANDS.has(commandName) });
    }

    // Set cooldown after successful deferral
    setCooldown(commandName, userId);

    const serverContext = await getServerContext(interaction.guildId);

    // Check permissions for seller servers (after deferring)
    if (!serverContext.isMainServer && commandName !== 'help') {
      const allowed = await hasCommandPermission(interaction, commandName, false);
      if (!allowed) {
        return interaction.editReply({
          embeds: [{ color: 0xf59e0b, description: '\u26D4 You don\u2019t have the required role to use this command here.' }],
        });
      }
    }

    switch (commandName) {
      case 'link': return handleLink(interaction, serverContext);
      case 'verify': return handleVerify(interaction, serverContext);
      case 'profile': return handleProfile(interaction, serverContext);
      case 'purchases': return handlePurchases(interaction, serverContext);
      case 'retrieve': return handleRetrieve(interaction, serverContext);
      case 'getrole':
      case 'roles': return handleGetRole(interaction, serverContext);
      case 'store': return handleStore(interaction, serverContext);
      case 'unlink': return handleUnlink(interaction, serverContext);
      case 'walletbalance': return handleWalletBalance(interaction);
      case 'update': return handleUpdate(interaction, serverContext);
      case 'globalban': return handleGlobalBan(interaction);
      case 'globalunban': return handleGlobalUnban(interaction);
      case 'globalbans': return handleGlobalBans(interaction);
      case 'daily': return handleDaily(interaction, serverContext);
      case 'leaderboard': return handleLeaderboard(interaction, serverContext);
      case 'balance': return handleBalance(interaction, serverContext);
      case 'newdrops': return handleNewDrops(interaction, serverContext);
      default:
        console.log(`[interaction] Unknown command: ${commandName}`);
        return interaction.editReply({ content: `Unknown command: ${commandName}` });
    }
  } catch (error) {
    console.error('[interaction] Error:', error);
    logBotError(`command:${interaction?.commandName || 'unknown'}`, error, {
      userId: interaction?.user?.id,
      guildId: interaction?.guildId,
    });
    try {
      const msg = { content: 'An error occurred. Please try again later.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(msg);
      } else {
        await interaction.reply(msg);
      }
    } catch {}
  }
}
