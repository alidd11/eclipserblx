import { getServerContext } from '../utils/server-context.js';
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

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'showcase_modal') {
        const serverContext = await getServerContext(interaction.guildId);
        return handleShowcaseModal(interaction, serverContext);
      }
      return;
    }

    // Handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const serverContext = await getServerContext(interaction.guildId);
    const { commandName } = interaction;

    console.log(`[interaction] /${commandName} by ${interaction.user.tag} in guild ${interaction.guildId}`);

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
      case 'showcase': return handleShowcaseCommand(interaction, serverContext);
      case 'walletbalance': return handleWalletBalance(interaction);
      case 'help': return handleHelp(interaction, serverContext);
      case 'update': return handleUpdate(interaction, serverContext);
      case 'globalban': return handleGlobalBan(interaction);
      case 'globalunban': return handleGlobalUnban(interaction);
      case 'globalbans': return handleGlobalBans(interaction);
      default:
        console.log(`[interaction] Unknown command: ${commandName}`);
        return interaction.reply({ content: `Unknown command: ${commandName}`, ephemeral: true });
    }
  } catch (error) {
    console.error('[interaction] Error:', error);
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
