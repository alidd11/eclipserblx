import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import http from 'http';
import { config } from './src/config.js';
import { handleInteraction } from './src/handlers/interaction.js';
import { handleDM } from './src/handlers/dm.js';
import { handleMemberJoin } from './src/handlers/member-join.js';

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
client.on('interactionCreate', handleInteraction);

// Route DMs (modmail)
client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (message.channel.type === ChannelType.DM) {
    handleDM(message);
  }
});

// Welcome DMs on member join
client.on('guildMemberAdd', handleMemberJoin);

// Bot ready
client.once('ready', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🟢 Eclipse Portal Bot is online!`);
  console.log(`   Logged in as: ${client.user.tag}`);
  console.log(`   Guilds: ${client.guilds.cache.size}`);
  console.log(`   Listening for interactions + DMs...`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Error handling
client.on('error', (error) => console.error('Discord client error:', error));
process.on('unhandledRejection', (error) => console.error('Unhandled promise rejection:', error));

// Health check HTTP server (for Railway/Fly.io)
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), guilds: client.guilds?.cache?.size || 0 }));
  } else {
    res.writeHead(200);
    res.end('Eclipse Portal Bot');
  }
}).listen(PORT, () => console.log(`Health check server on port ${PORT}`));

// Login
client.login(config.botToken);
