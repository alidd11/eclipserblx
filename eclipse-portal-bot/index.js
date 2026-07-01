import 'dotenv/config';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import http from 'http';
import { config } from './src/config.js';
import { handleInteraction } from './src/handlers/interaction.js';
import { handleDM } from './src/handlers/dm.js';
import { handleMemberJoin } from './src/handlers/member-join.js';
import { handleMemberLeave } from './src/handlers/member-leave.js';
import { handleAfkListener } from './src/handlers/afk-listener.js';
import { logBotError } from './src/utils/error-logger.js';

// Track uptime and stats
const stats = {
  startedAt: Date.now(),
  commandsProcessed: 0,
  errorsLogged: 0,
  reconnects: 0,
  lastError: null,
};

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: ['CHANNEL', 'MESSAGE'],
});

// Route interactions (slash commands, buttons, modals)
client.on('interactionCreate', (interaction) => {
  stats.commandsProcessed++;
  handleInteraction(interaction);
});

// Route DMs (modmail) + AFK listener
client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (message.channel.type === ChannelType.DM) {
    handleDM(message);
  } else {
    // AFK listener for guild messages
    handleAfkListener(message);
  }
});

// Welcome DMs on member join
client.on('guildMemberAdd', handleMemberJoin);
client.on('guildMemberRemove', handleMemberLeave);

// Bot ready
client.once('ready', () => {
  console.log('\u2501'.repeat(46));
  console.log(`\uD83D\uDFE2 Eclipse Portal Bot is online!`);
  console.log(`   Logged in as: ${client.user.tag}`);
  console.log(`   Guilds: ${client.guilds.cache.size}`);
  console.log(`   Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB`);
  console.log(`   Node: ${process.version}`);
  console.log(`   Listening for interactions + DMs...`);
  console.log('\u2501'.repeat(46));
});

// Auto-reconnect handling
client.on('shardDisconnect', (event, shardId) => {
  console.warn(`[shard] Disconnected (code ${event.code}), shard ${shardId}. Will auto-reconnect...`);
  stats.reconnects++;
  logBotError('shard:disconnect', new Error(`Shard disconnected with code ${event.code}`), { shardId });
});

client.on('shardReconnecting', (shardId) => {
  console.log(`[shard] Reconnecting shard ${shardId}...`);
});

client.on('shardResume', (shardId, replayedEvents) => {
  console.log(`[shard] Resumed shard ${shardId}, replayed ${replayedEvents} events`);
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
  stats.errorsLogged++;
  stats.lastError = { message: error.message, at: new Date().toISOString() };
  logBotError('client:error', error);
});

client.on('warn', (message) => {
  console.warn('Discord client warning:', message);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  stats.errorsLogged++;
  stats.lastError = { message: error?.message || String(error), at: new Date().toISOString() };
  logBotError('unhandledRejection', error instanceof Error ? error : new Error(String(error)));
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  stats.errorsLogged++;
  logBotError('uncaughtException', error);
  // Give time for log write, then exit (process manager will restart)
  setTimeout(() => process.exit(1), 2000);
});

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n[shutdown] Received ${signal}, shutting down gracefully...`);
  client.destroy();
  console.log('[shutdown] Discord client destroyed');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Health check HTTP server (for Railway/Fly.io)
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
  if (req.url === '/health') {
    const memUsage = process.memoryUsage();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),
      guilds: client.guilds?.cache?.size || 0,
      ping: client.ws?.ping || -1,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
      stats: {
        commandsProcessed: stats.commandsProcessed,
        errorsLogged: stats.errorsLogged,
        reconnects: stats.reconnects,
        lastError: stats.lastError,
        startedAt: new Date(stats.startedAt).toISOString(),
      },
      node: process.version,
    }));
  } else {
    res.writeHead(200);
    res.end('Eclipse Portal Bot');
  }
}).listen(PORT, () => console.log(`Health check server on port ${PORT}`));

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

// Login
client.login(config.botToken);
