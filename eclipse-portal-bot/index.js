import 'dotenv/config';
import { Client, GatewayIntentBits, ChannelType, Partials } from 'discord.js';
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
  // discord.js v14 requires the Partials enum, not strings. Without Partials.Channel
  // the bot never receives DMs in uncached channels, silently breaking modmail.
  partials: [Partials.Channel, Partials.Message],
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
    // Report unhealthy (503) when the Discord gateway is not connected, so Fly's
    // http_check and any external uptime monitor actually detect a down bot
    // instead of seeing a green process with a dead gateway.
    const ready = client.isReady();
    res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: ready ? 'ok' : 'degraded',
      discordConnected: ready,
      wsStatus: client.ws?.status ?? -1,
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

// Readiness watchdog: discord.js reconnects brief drops itself, but a *stuck*
// gateway (disconnected with no thrown error) can hang forever. If we stay
// not-ready for a sustained window, exit so Fly.io restarts with a fresh session.
let notReadySince = Date.now();
const MAX_NOT_READY_MS = 10 * 60 * 1000; // 10 minutes
setInterval(() => {
  if (client.isReady()) {
    notReadySince = null;
    return;
  }
  if (notReadySince === null) {
    notReadySince = Date.now();
    return;
  }
  if (Date.now() - notReadySince >= MAX_NOT_READY_MS) {
    console.error('[watchdog] Discord gateway not ready for 10m — exiting for a clean restart.');
    logBotError('watchdog:not-ready', new Error('Gateway not ready for 10 minutes'));
    setTimeout(() => process.exit(1), 1000);
  }
}, 60 * 1000);

// Login. A failed login must exit (not hang as a zombie with a healthy HTTP port)
// so the process manager restarts it.
client.login(config.botToken).catch((error) => {
  console.error('[login] Failed to log in to Discord:', error);
  logBotError('login:failed', error instanceof Error ? error : new Error(String(error)));
  setTimeout(() => process.exit(1), 2000);
});
