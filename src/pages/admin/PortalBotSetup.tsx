import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, Check, ChevronDown, ChevronRight, FileCode, FolderOpen, Bot, Terminal, Server, Shield, Download } from 'lucide-react';
import { toast } from 'sonner';
import { BOT_FILES } from '@/data/portalBotFiles';

// Access controlled by admin role check below
  "version": "1.0.0",
  "description": "Persistent Eclipse Portal Bot — gateway-based Discord bot",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "register": "node src/register-commands.js"
  },
  "dependencies": {
    "discord.js": "^14.14.1",
    "@supabase/supabase-js": "^2.39.0",
    "dotenv": "^16.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}`,

  '.env.example': `# Discord
DISCORD_CUSTOMER_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_main_guild_id

# Role IDs (main Eclipse server)
DISCORD_CUSTOMER_ROLE_ID=
DISCORD_LOYAL_CUSTOMER_ROLE_ID=
DISCORD_STORE_CREATOR_ROLE_ID=
DISCORD_ROLE_ID=
DISCORD_VERIFIED_SELLER_ROLE_ID=

# Supabase
SUPABASE_URL=https://qlnbergwjfrmgkjhrbkj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional
DISCORD_WEBHOOK_URL=
SITE_URL=https://eclipserblx.com`,

  'Dockerfile': `FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 8080

CMD ["node", "index.js"]`,

  'fly.toml': `app = "eclipse-portal-bot"
primary_region = "lhr"

[build]

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 8080

  [[services.http_checks]]
    interval = 30000
    grace_period = "10s"
    method = "get"
    path = "/health"
    protocol = "http"
    timeout = 5000`,

  'index.js': `import 'dotenv/config';
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
  console.log(\`🟢 Eclipse Portal Bot is online!\`);
  console.log(\`   Logged in as: \${client.user.tag}\`);
  console.log(\`   Guilds: \${client.guilds.cache.size}\`);
  console.log(\`   Listening for interactions + DMs...\`);
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
}).listen(PORT, () => console.log(\`Health check server on port \${PORT}\`));

// Login
client.login(config.botToken);`,

  'src/config.js': `// Environment variable validation and constants

const required = [
  'DISCORD_CUSTOMER_BOT_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(\`Missing required env var: \${key}\`);
    process.exit(1);
  }
}

export const config = {
  // Discord
  botToken: process.env.DISCORD_CUSTOMER_BOT_TOKEN,
  mainGuildId: process.env.DISCORD_GUILD_ID || '',

  // Role IDs
  customerRoleId: process.env.DISCORD_CUSTOMER_ROLE_ID || '',
  loyalCustomerRoleId: process.env.DISCORD_LOYAL_CUSTOMER_ROLE_ID || '',
  storeCreatorRoleId: process.env.DISCORD_STORE_CREATOR_ROLE_ID || '',
  eclipsePlusRoleId: process.env.DISCORD_ROLE_ID || '',
  verifiedSellerRoleId: process.env.DISCORD_VERIFIED_SELLER_ROLE_ID || '',

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // Optional
  webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  siteUrl: process.env.SITE_URL || 'https://eclipserblx.com',
};

// Branding constants
export const ECLIPSE_COLOR = 0x8b5cf6;
export const ECLIPSE_ICON = 'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/eclipse-logo.png';`,

  'src/supabase.js': `import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);`,

  'src/utils/embeds.js': `import { EmbedBuilder } from 'discord.js';
import { ECLIPSE_COLOR } from '../config.js';

/**
 * Get branding based on server context
 */
export function getBranding(serverContext) {
  if (serverContext.store) {
    return {
      name: serverContext.store.name,
      footer: \`\${serverContext.store.name} \\u2022 Powered by Eclipse\`,
      color: ECLIPSE_COLOR,
      icon: serverContext.store.logo_url,
    };
  }
  return {
    name: 'Eclipse Marketplace',
    footer: 'Eclipse Marketplace',
    color: ECLIPSE_COLOR,
    icon: undefined,
  };
}

/**
 * Build a Discord avatar URL from user data
 */
export function getAvatarUrl(user) {
  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return \`https://cdn.discordapp.com/avatars/\${user.id}/\${user.avatar}.\${ext}?size=128\`;
  }
  const defaultIndex = Number((BigInt(user.id) >> BigInt(22)) % BigInt(6));
  return \`https://cdn.discordapp.com/embed/avatars/\${defaultIndex}.png\`;
}`,

  'src/utils/responses.js': `/**
 * Reply helpers for discord.js interactions
 */

/**
 * Send an ephemeral reply with embed(s)
 */
export async function ephemeralReply(interaction, embeds, components) {
  const payload = { embeds: Array.isArray(embeds) ? embeds : [embeds], ephemeral: true };
  if (components) payload.components = components;
  
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

/**
 * Send a public reply with an embed, and DM the user with detailed info
 */
export async function publicReplyWithDM(interaction, channelEmbed, dmEmbeds, dmComponents) {
  // Reply publicly in channel
  const replyPayload = { embeds: [channelEmbed] };
  
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(replyPayload);
  } else {
    await interaction.reply(replyPayload);
  }

  // Send DM (best-effort)
  try {
    const dmPayload = { embeds: dmEmbeds };
    if (dmComponents) dmPayload.components = dmComponents;
    await interaction.user.send(dmPayload);
  } catch (err) {
    // DMs might be disabled — non-fatal
    if (err.code !== 50007) {
      console.error('[responses] DM error:', err.message);
    }
  }
}

/**
 * Send a public reply (no DM)
 */
export async function publicReply(interaction, embeds, components) {
  const payload = { embeds: Array.isArray(embeds) ? embeds : [embeds] };
  if (components) payload.components = components;
  
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}`,

  'src/utils/server-context.js': `import { supabase } from '../supabase.js';
import { config } from '../config.js';

// Simple in-memory cache for server context (avoids re-querying every command)
const contextCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Determine server context — main Eclipse server or a linked store server
 */
export async function getServerContext(guildId) {
  if (!guildId) {
    return { guildId: config.mainGuildId, isMainServer: true };
  }

  if (guildId === config.mainGuildId) {
    return { guildId, isMainServer: true };
  }

  // Check cache first
  const cached = contextCache.get(guildId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  // Check if this guild is associated with a store
  const { data: store, error } = await supabase
    .from('stores')
    .select('id, name, slug, logo_url')
    .eq('discord_guild_id', guildId)
    .eq('status', 'approved')
    .maybeSingle();

  let result;
  if (store && !error) {
    result = { guildId, isMainServer: false, store };
  } else {
    result = { guildId, isMainServer: false };
  }

  // Cache the result
  contextCache.set(guildId, { value: result, timestamp: Date.now() });
  return result;
}

/**
 * Clear cached context for a guild (e.g. after store changes)
 */
export function clearServerContext(guildId) {
  contextCache.delete(guildId);
}

/**
 * Get linked Eclipse account from Discord ID
 */
export async function getLinkedAccount(discordUserId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, username, customer_id, avatar_url, discord_id, email')
    .eq('discord_id', discordUserId)
    .maybeSingle();

  if (error) {
    console.error('[server-context] Profile lookup error:', error);
    return null;
  }

  // If profile found but no email, try auth.users
  if (profile && !profile.email) {
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
    if (authUser?.user?.email) {
      profile.email = authUser.user.email;
    }
  }

  return profile;
}`,

  'src/handlers/interaction.js': `import { getServerContext } from '../utils/server-context.js';
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

// Commands that need deferral (do DB work before responding)
const DEFERRED_COMMANDS = new Set([
  'link', 'verify', 'profile', 'purchases', 'retrieve',
  'getrole', 'roles', 'store', 'unlink', 'walletbalance',
  'update', 'globalban', 'globalunban', 'globalbans',
]);

// Commands that use ephemeral replies
const EPHEMERAL_COMMANDS = new Set([
  'retrieve', 'walletbalance', 'update', 'globalban',
  'globalunban', 'globalbans',
]);

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
    console.log(\`[interaction] /\${commandName} by \${interaction.user.tag} in guild \${interaction.guildId}\`);

    // Showcase opens a modal — must NOT be deferred
    if (commandName === 'showcase') {
      const serverContext = await getServerContext(interaction.guildId);
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

    const serverContext = await getServerContext(interaction.guildId);

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
      default:
        console.log(\`[interaction] Unknown command: \${commandName}\`);
        return interaction.editReply({ content: \`Unknown command: \${commandName}\` });
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
}`,

  'src/handlers/dm.js': `import { EmbedBuilder } from 'discord.js';
import { supabase } from '../supabase.js';
import { ECLIPSE_COLOR, ECLIPSE_ICON, config } from '../config.js';

/**
 * Find an open modmail ticket for a Discord user
 */
async function findOpenTicket(discordUserId) {
  const { data, error } = await supabase
    .from('discord_modmail_tickets')
    .select('*')
    .eq('discord_user_id', discordUserId)
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.error('Error finding ticket:', error); return null; }
  return data;
}

/**
 * Handle incoming DM messages (modmail)
 */
export async function handleDM(message) {
  if (message.author.bot) return;

  console.log(\`[DM] \${message.author.tag}: \${message.content}\`);

  try {
    const ticket = await findOpenTicket(message.author.id);

    if (!ticket) {
      const embed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('❌ No Open Ticket')
        .setDescription("You don't have an open support ticket. To create one, use the \\\`/support\\\` command in the Eclipse Discord server.")
        .setFooter({ text: 'Eclipse Support', iconURL: ECLIPSE_ICON })
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    const attachments = message.attachments.size > 0
      ? Array.from(message.attachments.values()).map(a => ({ url: a.url, name: a.name, contentType: a.contentType }))
      : null;

    const { data: savedMessage, error } = await supabase
      .from('discord_modmail_messages')
      .insert({
        ticket_id: ticket.id,
        content: message.content || '[Attachment]',
        discord_message_id: message.id,
        is_staff_reply: false,
        attachments,
      })
      .select().single();

    if (error) {
      console.error('Error adding message:', error);
      return message.channel.send('❌ Failed to save your message. Please try again.');
    }

    await supabase.from('discord_modmail_tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticket.id);

    // Confirmation
    const confirmEmbed = new EmbedBuilder()
      .setColor(ECLIPSE_COLOR)
      .setTitle('✅ Message Received')
      .setDescription('Your reply has been added to your support ticket. Our team will respond as soon as possible.')
      .addFields({ name: 'Ticket Subject', value: ticket.subject || 'Support Request', inline: true })
      .setFooter({ text: 'Eclipse Support', iconURL: ECLIPSE_ICON })
      .setTimestamp();
    await message.channel.send({ embeds: [confirmEmbed] });

    // Notify staff via webhook
    if (config.webhookUrl) {
      try {
        await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '💬 New Customer Reply',
              description: (message.content || '[Attachment]').substring(0, 500),
              color: ECLIPSE_COLOR,
              author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
              fields: [
                { name: 'Ticket Subject', value: ticket.subject || 'No subject', inline: true },
                { name: 'Status', value: ticket.status === 'in_progress' ? '🔄 In Progress' : '📩 Open', inline: true },
              ],
              footer: { text: \`Ticket ID: \${ticket.id.substring(0, 8)}\`, icon_url: ECLIPSE_ICON },
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      } catch (e) { console.error('Error notifying staff:', e); }
    }

    console.log(\`[SUCCESS] Message added to ticket \${ticket.id}\`);
  } catch (error) {
    console.error('Error handling DM:', error);
    await message.channel.send('❌ An error occurred. Please try again later.');
  }
}`,

  'src/handlers/member-join.js': `import { EmbedBuilder } from 'discord.js';
import { supabase } from '../supabase.js';
import { ECLIPSE_COLOR, ECLIPSE_ICON, config } from '../config.js';

export async function handleMemberJoin(member) {
  if (member.user.bot) return;

  console.log(\`[JOIN] \${member.user.tag} joined \${member.guild.name} (\${member.guild.id})\`);

  try {
    const { data: store } = await supabase
      .from('stores')
      .select('id, name, slug, description, logo_url')
      .eq('discord_guild_id', member.guild.id)
      .eq('status', 'approved')
      .maybeSingle();

    const siteUrl = config.siteUrl;
    const embed = new EmbedBuilder()
      .setColor(ECLIPSE_COLOR)
      .setTitle('👋 Welcome to Eclipse!')
      .setThumbnail(ECLIPSE_ICON)
      .setTimestamp();

    if (store) {
      embed.setDescription(
        \`Hey **\${member.user.username}**! Welcome to **\${member.guild.name}**!\\n\\n\` +
        \`This server is powered by **\${store.name}** on Eclipse Marketplace. \` +
        \`Check out their products and explore the marketplace below!\`
      );
      embed.addFields(
        { name: '🛍️ Visit Store', value: \`[Browse \${store.name}](\${siteUrl}/store/\${store.slug})\`, inline: true },
        { name: '🏪 Marketplace', value: \`[Explore All Products](\${siteUrl}/products)\`, inline: true },
        { name: '🔗 Link Your Account', value: 'Use \\\`/link\\\` in this server to connect your Discord to Eclipse and access your purchases!', inline: false },
      );
      if (store.logo_url) embed.setThumbnail(store.logo_url);
    } else {
      embed.setDescription(
        \`Hey **\${member.user.username}**! Welcome to **\${member.guild.name}**!\\n\\n\` +
        \`Eclipse is the ultimate marketplace for Roblox scripts, bots, and digital products. \` +
        \`Here are some links to get you started!\`
      );
      embed.addFields(
        { name: '🏪 Marketplace', value: \`[Browse Products](\${siteUrl}/products)\`, inline: true },
        { name: '📖 Get Started', value: \`[Create Account](\${siteUrl}/auth)\`, inline: true },
        { name: '💬 Commands', value: 'Use \\\`/help\\\` to see all available commands!', inline: false },
      );
    }

    embed.setFooter({ text: 'Eclipse Marketplace', iconURL: ECLIPSE_ICON });
    await member.send({ embeds: [embed] });
    console.log(\`[WELCOME] Sent welcome DM to \${member.user.tag}\`);
  } catch (error) {
    if (error.code === 50007) {
      console.log(\`[WELCOME] Cannot send DM to \${member.user.tag} (DMs disabled)\`);
    } else {
      console.error('[WELCOME] Error:', error);
    }
  }
}`,

  'src/commands/link.js': `import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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
      description: \`<@\${discordUserId}>\\n✅ Your account is already linked! Check your DMs for details.\`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0x22c55e,
      title: '✅ Account Linked',
      description: \`Your Discord is connected to **@\${profile.username}**\`,
      thumbnail: { url: avatarUrl },
      fields: [{ name: '🆔 Customer ID', value: profile.customer_id || 'N/A', inline: true }],
      footer: { text: \`\${branding.footer} \\u2022 Use /profile, /purchases, or /retrieve\` },
      timestamp: new Date().toISOString(),
    };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  // Not linked — send DM with button
  const channelEmbed = {
    color: branding.color,
    description: \`<@\${discordUserId}>\\n🔗 Check your DMs for a quick link to connect your Eclipse account!\`,
    thumbnail: { url: avatarUrl },
    footer: { text: branding.footer },
  };
  const dmEmbed = {
    color: branding.color,
    title: '🔗 Link Your Eclipse Account',
    description: "Connect your Discord to access your purchases and downloads.\\n\\nClick the button below to link your account instantly!",
    thumbnail: { url: avatarUrl },
    fields: [{
      name: '💡 How it works',
      value: "1. Click **Link Account** below\\n2. Log in to Eclipse (if needed)\\n3. Authorize Discord - that's it!",
    }],
    footer: { text: branding.footer },
    timestamp: new Date().toISOString(),
  };
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('🔗 Link Account').setStyle(ButtonStyle.Link).setURL('https://eclipserblx.com/account?action=link-discord')
  );
  return publicReplyWithDM(interaction, channelEmbed, [dmEmbed], [row]);
}`,

  'src/commands/verify.js': `import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReplyWithDM } from '../utils/responses.js';
import { supabase } from '../supabase.js';

export async function handleVerify(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const discordUsername = interaction.user.globalName || interaction.user.username;
  const avatarUrl = getAvatarUrl(interaction.user);
  const code = interaction.options.getString('code')?.toUpperCase().trim();

  if (!code) {
    const channelEmbed = {
      color: 0xef4444,
      description: \`<@\${discordUserId}>\\n❌ Please provide a verification code. Check your DMs for help.\`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0xef4444,
      title: '❌ Code Required',
      description: 'Please provide your link code.',
      fields: [
        { name: 'Usage', value: '\\\`/verify code:YOUR_CODE\\\`' },
        { name: 'Get a Code', value: 'Generate one from your [Eclipse account settings](https://eclipserblx.com/account)' },
      ],
      footer: { text: branding.footer },
    };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  // Find valid code
  const { data: linkCode, error: codeError } = await supabase
    .from('discord_link_codes')
    .select('id, user_id, expires_at, verified_at')
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .is('verified_at', null)
    .maybeSingle();

  if (codeError || !linkCode) {
    const channelEmbed = {
      color: 0xef4444,
      description: \`<@\${discordUserId}>\\n❌ That code is invalid or expired. Check your DMs for help.\`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0xef4444,
      title: '❌ Invalid or Expired Code',
      description: "This code doesn't exist or has expired.",
      fields: [{ name: 'What to do', value: 'Generate a new code from your [Eclipse account settings](https://eclipserblx.com/account)' }],
      footer: { text: branding.footer },
    };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  // Update code and profile in parallel
  await Promise.all([
    supabase.from('discord_link_codes').update({
      discord_user_id: discordUserId,
      discord_username: discordUsername,
      verified_at: new Date().toISOString(),
    }).eq('id', linkCode.id),
    supabase.from('profiles').update({
      discord_id: discordUserId,
      discord_username: discordUsername,
    }).eq('user_id', linkCode.user_id),
  ]);

  const channelEmbed = {
    color: 0x22c55e,
    description: \`<@\${discordUserId}>\\n🎉 Your account has been linked! Check your DMs for details.\`,
    thumbnail: { url: avatarUrl },
    footer: { text: branding.footer },
  };
  const dmEmbed = {
    color: 0x22c55e,
    title: '✅ Account Linked Successfully!',
    description: 'Your Discord account is now connected to Eclipse.',
    thumbnail: { url: avatarUrl },
    fields: [{
      name: 'Available Commands',
      value: '• \\\`/profile\\\` - View your account\\n• \\\`/purchases\\\` - See your orders\\n• \\\`/retrieve\\\` - Get your files\\n• \\\`/getrole\\\` - Sync your roles',
    }],
    footer: { text: branding.footer },
    timestamp: new Date().toISOString(),
  };
  return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
}`,

  'src/commands/profile.js': `import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReplyWithDM } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handleProfile(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    const channelEmbed = {
      color: 0xef4444,
      title: '❌ Account Not Linked',
      description: \`<@\${discordUserId}>\\nYour Discord isn't linked yet. Run \\\`/link\\\` to get started!\`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0xef4444,
      title: '❌ Account Not Linked',
      description: "Your Discord isn't linked to an Eclipse account yet.",
      fields: [{ name: 'How to Link', value: 'Run \\\`/link\\\` to get started!' }],
      footer: { text: branding.footer },
      timestamp: new Date().toISOString(),
    };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  let subscription = null;
  let orderCount = 0;
  let totalSpent = 0;

  if (serverContext.store) {
    const { data: orders } = await supabase
      .from('orders').select('id')
      .eq('user_id', profile.user_id)
      .in('status', ['paid', 'completed']).limit(200);

    const orderIds = (orders || []).map(o => o.id);
    if (orderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from('order_items').select('product_id').in('order_id', orderIds);
      const productIds = [...new Set((orderItems || []).map(i => i.product_id).filter(Boolean))];
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products').select('id, store_id').in('id', productIds);
        const storeProductSet = new Set(
          (products || []).filter(p => p.store_id === serverContext.store.id).map(p => p.id)
        );
        orderCount = (orderItems || []).filter(i => storeProductSet.has(i.product_id)).length;
      }
    }
  } else {
    const [subscriptionResult, orderCountResult, ordersTotalsResult] = await Promise.all([
      supabase.from('subscriptions').select('tier, current_period_end, status')
        .eq('user_id', profile.user_id).eq('status', 'active').maybeSingle(),
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('user_id', profile.user_id).in('status', ['paid', 'completed']),
      supabase.from('orders').select('total')
        .eq('user_id', profile.user_id).in('status', ['paid', 'completed']),
    ]);
    subscription = subscriptionResult.data;
    orderCount = orderCountResult.count || 0;
    totalSpent = ordersTotalsResult.data?.reduce((sum, o) => sum + Number(o.total || 0), 0) || 0;
  }

  const fields = [
    { name: '👤 Username', value: \`@\${profile.username}\`, inline: true },
    { name: '🆔 Customer ID', value: profile.customer_id || 'N/A', inline: true },
  ];
  if (!serverContext.store) {
    fields.push({ name: '⭐ Membership', value: subscription ? 'Eclipse+ (Active)' : 'Free', inline: true });
    fields.push({ name: '💷 Total Spent', value: \`£\${totalSpent.toFixed(2)}\`, inline: true });
  }
  fields.push({
    name: serverContext.store ? \`🛒 Orders from \${serverContext.store.name}\` : '🛒 Total Orders',
    value: \`\${orderCount} purchases\`, inline: true,
  });

  const embed = {
    color: branding.color,
    author: { name: profile.display_name || profile.username, icon_url: profile.avatar_url || undefined },
    title: serverContext.store ? \`\${serverContext.store.name} Profile\` : 'Eclipse Profile',
    thumbnail: { url: avatarUrl },
    fields,
    footer: { text: branding.footer },
    timestamp: new Date().toISOString(),
  };
  const channelEmbed = {
    color: branding.color,
    description: \`<@\${discordUserId}>\\n👤 Profile sent! Check your DMs.\`,
    thumbnail: { url: avatarUrl },
    footer: { text: branding.footer },
  };
  return publicReplyWithDM(interaction, channelEmbed, [embed]);
}`,

  'src/commands/purchases.js': `import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReplyWithDM } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handlePurchases(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    const channelEmbed = {
      color: 0xef4444,
      description: \`<@\${discordUserId}>\\n❌ Your Discord isn't linked yet. Run \\\`/link\\\` to get started!\`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer },
    };
    const dmEmbed = {
      color: 0xef4444, title: '❌ Account Not Linked',
      description: "Your Discord isn't linked to an Eclipse account yet.",
      fields: [{ name: 'How to Link', value: 'Run \\\`/link\\\` to get started!' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  const { data: orders } = await supabase
    .from('orders').select('id, created_at, status, total')
    .eq('user_id', profile.user_id).in('status', ['paid', 'completed'])
    .order('created_at', { ascending: false }).limit(20);

  if (!orders || orders.length === 0) {
    const msg = serverContext.store
      ? \`You haven't purchased anything from \${serverContext.store.name} yet.\`
      : "You haven't made any purchases yet.";
    const channelEmbed = { color: 0x3b82f6, description: \`<@\${discordUserId}>\\n📦 \${msg}\`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } };
    const dmEmbed = { color: 0x3b82f6, title: '📦 No Purchases Found', description: msg, footer: { text: branding.footer }, timestamp: new Date().toISOString() };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  const orderIds = orders.map(o => o.id);
  const orderCreatedAt = new Map(orderIds.map(id => [id, orders.find(o => o.id === id)?.created_at]));

  const { data: orderItems } = await supabase
    .from('order_items').select('order_id, product_id, product_name, price').in('order_id', orderIds);

  if (!orderItems || orderItems.length === 0) {
    const channelEmbed = { color: 0x3b82f6, title: '📦 No Purchases Found', description: \`<@\${discordUserId}>\\nI couldn't find any purchasable items.\`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } };
    const dmEmbed = { color: 0x3b82f6, title: '📦 No Purchases Found', description: "I couldn't find any purchasable items for your recent orders.", footer: { text: branding.footer }, timestamp: new Date().toISOString() };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  let filteredItems = orderItems;

  if (serverContext.store) {
    const productIds = [...new Set(filteredItems.map(i => i.product_id).filter(Boolean))];
    const { data: products } = await supabase.from('products').select('id, store_id').in('id', productIds);
    const storeProductSet = new Set((products || []).filter(p => p.store_id === serverContext.store.id).map(p => p.id));
    filteredItems = filteredItems.filter(i => storeProductSet.has(i.product_id));

    if (!filteredItems.length) {
      const channelEmbed = { color: 0x3b82f6, title: '📦 No Purchases Found', description: \`<@\${discordUserId}>\\nYou haven't purchased anything from \${serverContext.store.name} yet.\`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } };
      const dmEmbed = { color: 0x3b82f6, title: '📦 No Purchases Found', description: \`You haven't purchased anything from \${serverContext.store.name} yet.\`, footer: { text: branding.footer }, timestamp: new Date().toISOString() };
      return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
    }
  }

  const productList = filteredItems
    .map(item => ({
      name: item.product_name,
      date: orderCreatedAt.get(item.order_id) ? new Date(orderCreatedAt.get(item.order_id)).toLocaleDateString('en-GB') : '',
      price: Number(item.price || 0),
      orderId: item.order_id,
    }))
    .sort((a, b) => {
      const aTime = orderCreatedAt.get(a.orderId) ? new Date(orderCreatedAt.get(a.orderId)).getTime() : 0;
      const bTime = orderCreatedAt.get(b.orderId) ? new Date(orderCreatedAt.get(b.orderId)).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 15);

  const embed = {
    color: 0x22c55e,
    title: serverContext.store ? \`📦 Your \${serverContext.store.name} Purchases\` : '📦 Your Purchases',
    description: 'Here are your most recent purchases:',
    thumbnail: { url: avatarUrl },
    fields: productList.map((p, i) => ({
      name: \`\${i + 1}. \${p.name}\`,
      value: \`£\${p.price.toFixed(2)}\${p.date ? \` \\u2022 \${p.date}\` : ''}\`,
    })),
    footer: { text: \`\${branding.footer} \\u2022 Use /retrieve to get files\` },
    timestamp: new Date().toISOString(),
  };
  const channelEmbed = {
    color: 0x22c55e,
    description: \`<@\${discordUserId}>\\n📦 Check your DMs for your purchase list.\`,
    thumbnail: { url: avatarUrl },
    footer: { text: branding.footer },
  };
  return publicReplyWithDM(interaction, channelEmbed, [embed]);
}`,

  'src/commands/retrieve.js': `import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handleRetrieve(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Account Not Linked',
      description: "Your Discord isn't linked to an Eclipse account yet.",
      fields: [{ name: 'How to Link', value: 'Run \\\`/link\\\` to get started!' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  const productSearch = interaction.options.getString('product');
  const userEmail = profile.email;
  let allOrderIds = [];

  const { data: userIdOrders } = await supabase
    .from('orders').select('id').eq('user_id', profile.user_id).in('status', ['paid', 'completed']);
  if (userIdOrders) allOrderIds = userIdOrders.map(o => o.id);

  if (userEmail) {
    const { data: emailOrders } = await supabase
      .from('orders').select('id').eq('customer_email', userEmail).is('user_id', null).in('status', ['paid', 'completed']);
    if (emailOrders) allOrderIds = [...new Set([...allOrderIds, ...emailOrders.map(o => o.id)])];
  }

  if (allOrderIds.length === 0) {
    return ephemeralReply(interaction, [{
      color: 0x3b82f6, title: '📁 No Downloads Available',
      description: "You haven't purchased any downloadable products yet.",
      fields: [{ name: 'Browse Products', value: 'Visit [Eclipse Marketplace](https://eclipserblx.com) to find products!' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  const { data: orderItems } = await supabase
    .from('order_items').select('product_id').in('order_id', allOrderIds).not('product_id', 'is', null);

  const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const productIds = [...new Set((orderItems?.map(i => i.product_id) || []).filter(isUuid))];

  if (productIds.length === 0) {
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Downloads Unavailable',
      description: "We found your orders, but they don't include valid product IDs for downloads.",
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  let productsQuery = supabase
    .from('products').select('id, name, asset_file_url, store_id')
    .in('id', productIds).not('asset_file_url', 'is', null);
  if (serverContext.store) productsQuery = productsQuery.eq('store_id', serverContext.store.id);
  const { data: products } = await productsQuery;

  if (!products || products.length === 0) {
    return ephemeralReply(interaction, [{
      color: 0x3b82f6, title: '📁 No Downloads Available',
      description: 'None of your purchased products have downloadable files.',
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  if (!productSearch) {
    const productList = products.map((p, i) => \`**\${i + 1}.** \${p.name}\`).join('\\n');
    return ephemeralReply(interaction, [{
      color: 0x3b82f6,
      title: serverContext.store ? \`📁 Your \${serverContext.store.name} Downloads\` : '📁 Your Downloadable Products',
      description: productList,
      thumbnail: { url: avatarUrl },
      footer: { text: \`\${branding.footer} \\u2022 Use /retrieve product:NAME to download\` },
      timestamp: new Date().toISOString(),
    }]);
  }

  // Fuzzy match
  const searchTerm = productSearch.toLowerCase().trim();
  const matchedProduct = products.find(p =>
    p.name.toLowerCase().includes(searchTerm) ||
    searchTerm.includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().split(' ').some(word => searchTerm.includes(word) && word.length > 3)
  );

  if (!matchedProduct) {
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Product Not Found',
      description: \`Couldn't find a downloadable product matching "\${productSearch}".\`,
      fields: [{
        name: 'Available Products',
        value: products.length ? products.map(p => \`\\u2022 \${p.name}\`).join('\\n').slice(0, 1000) : 'No downloadable products found',
      }],
      footer: { text: \`\${branding.footer} \\u2022 Try typing the exact product name\` },
    }]);
  }

  // Generate signed URL & log download
  const [signedUrlResult] = await Promise.all([
    supabase.storage.from('product-assets').createSignedUrl(matchedProduct.asset_file_url, 3600),
    supabase.from('download_logs').insert({ user_id: profile.user_id, product_id: matchedProduct.id }),
    supabase.rpc('increment_download_count', { product_id: matchedProduct.id }).then(() => {}).catch(() => {}),
  ]);

  if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
    return ephemeralReply(interaction, [{
      color: 0xef4444, title: '❌ Download Failed',
      description: "Couldn't generate download link. Please try again or use the website.",
      fields: [{ name: 'Alternative', value: 'Visit [Eclipse Marketplace](https://eclipserblx.com) to download your products.' }],
      footer: { text: branding.footer }, timestamp: new Date().toISOString(),
    }]);
  }

  const embed = {
    color: 0x3b82f6,
    title: \`📥 \${matchedProduct.name}\`,
    description: "Your download link is ready! Click the button below to download.\\n\\n⚠️ This link expires in **1 hour**.",
    thumbnail: { url: avatarUrl },
    footer: { text: \`\${branding.footer} \\u2022 Do not share this link\` },
    timestamp: new Date().toISOString(),
  };
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('📥 Download File').setStyle(ButtonStyle.Link).setURL(signedUrlResult.data.signedUrl)
  );

  // Send DM with download (best-effort)
  try { await interaction.user.send({ embeds: [embed], components: [row] }); } catch {}

  // Also reply ephemerally
  return ephemeralReply(interaction, [embed], [row]);
}`,

  'src/commands/getrole.js': `import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReplyWithDM, publicReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';
import { config } from '../config.js';

export async function handleGetRole(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    const channelEmbed = { color: 0xef4444, description: \`<@\${discordUserId}>\\n❌ Your account isn't linked yet. Run \\\`/link\\\` to get started!\`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } };
    const dmEmbed = { color: 0xef4444, title: '❌ Account Not Linked', description: "Your Discord isn't linked to an Eclipse account yet.", fields: [{ name: 'How to Link', value: 'Run \\\`/link\\\` to get started!' }], footer: { text: branding.footer }, timestamp: new Date().toISOString() };
    return publicReplyWithDM(interaction, channelEmbed, [dmEmbed]);
  }

  if (!serverContext.guildId) {
    return publicReplyWithDM(interaction,
      { color: 0xef4444, description: \`<@\${discordUserId}>\\n❌ Bot configuration error.\`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } },
      [{ color: 0xef4444, title: '❌ Configuration Error', description: 'Bot configuration error. Please contact support.', footer: { text: branding.footer }, timestamp: new Date().toISOString() }]
    );
  }

  const rolesToAssign = [];
  const rolesToRemove = [];

  if (serverContext.isMainServer) {
    const [ordersResult, subscriptionResult, storeResult] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', profile.user_id).in('status', ['paid', 'completed']),
      supabase.from('subscriptions').select('id').eq('user_id', profile.user_id).eq('status', 'active').maybeSingle(),
      supabase.from('stores').select('id').eq('owner_id', profile.user_id).eq('status', 'approved').maybeSingle(),
    ]);

    const purchaseCount = ordersResult.count || 0;
    if (purchaseCount >= 5 && config.loyalCustomerRoleId) {
      rolesToAssign.push({ id: config.loyalCustomerRoleId, name: 'Loyal Customer' });
      if (config.customerRoleId) rolesToRemove.push({ id: config.customerRoleId, name: 'Customer' });
    } else if (purchaseCount >= 1 && config.customerRoleId) {
      rolesToAssign.push({ id: config.customerRoleId, name: 'Customer' });
    }
    if (subscriptionResult.data && config.eclipsePlusRoleId) rolesToAssign.push({ id: config.eclipsePlusRoleId, name: 'Eclipse+' });
    if (storeResult.data && config.storeCreatorRoleId) rolesToAssign.push({ id: config.storeCreatorRoleId, name: 'Store Creator' });
  } else if (serverContext.store) {
    const [roleConfigsResult, ordersResult] = await Promise.all([
      supabase.from('discord_role_configs').select('*').eq('store_id', serverContext.store.id).eq('auto_assign_on_purchase', true),
      supabase.from('orders').select('id').eq('user_id', profile.user_id).in('status', ['paid', 'completed']).limit(200),
    ]);
    const roleConfigs = roleConfigsResult.data || [];
    const orderIds = (ordersResult.data || []).map(o => o.id);
    let orderCount = 0, totalSpent = 0;

    if (orderIds.length > 0) {
      const { data: orderItems } = await supabase.from('order_items').select('product_id, price, order_id').in('order_id', orderIds);
      if (orderItems?.length) {
        const productIds = [...new Set(orderItems.map(i => i.product_id).filter(Boolean))];
        const { data: products } = await supabase.from('products').select('id, store_id').in('id', productIds);
        const storeProductSet = new Set((products || []).filter(p => p.store_id === serverContext.store.id).map(p => p.id));
        const storeItems = (orderItems || []).filter(i => storeProductSet.has(i.product_id));
        orderCount = storeItems.length;
        totalSpent = storeItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
      }
    }

    for (const cfg of roleConfigs) {
      let eligible = true;
      if (cfg.min_order_count && orderCount < cfg.min_order_count) eligible = false;
      if (cfg.min_order_amount && totalSpent < cfg.min_order_amount) eligible = false;
      if (cfg.requires_subscription) {
        const { data: sub } = await supabase.from('subscriptions').select('id').eq('user_id', profile.user_id).eq('status', 'active').maybeSingle();
        if (!sub) eligible = false;
      }
      if (eligible) rolesToAssign.push({ id: cfg.role_id, name: cfg.role_name });
    }
  } else {
    return publicReplyWithDM(interaction,
      { color: 0xef4444, description: \`<@\${discordUserId}>\\n❌ This server isn't configured for automatic roles.\`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } },
      [{ color: 0xef4444, title: '❌ Server Not Configured', description: "This Discord server isn't linked to the main Eclipse server or a creator store.", footer: { text: branding.footer }, timestamp: new Date().toISOString() }]
    );
  }

  // Fetch member ONCE before role operations
  const guild = interaction.guild;
  let member;
  try {
    member = await guild.members.fetch(discordUserId);
  } catch (e) {
    console.error('[getrole] Failed to fetch member:', e.message);
    return publicReply(interaction, [{ color: 0xef4444, title: '❌ Error', description: 'Could not fetch your server membership. Please try again.', footer: { text: branding.footer } }]);
  }

  const rolesAssigned = [];
  const rolesFailed = [];

  await Promise.all([
    ...rolesToAssign.map(async role => {
      try {
        await member.roles.add(role.id);
        rolesAssigned.push(role.name);
      } catch (e) {
        console.error(\`[getrole] Failed \${role.name}:\`, e.message);
        rolesFailed.push(role.name);
      }
    }),
    ...rolesToRemove.map(async role => {
      try {
        await member.roles.remove(role.id);
      } catch {}
    }),
  ]);

  const fields = [];
  if (rolesAssigned.length > 0) {
    fields.push({ name: '✅ Roles Synced', value: rolesToAssign.filter(r => rolesAssigned.includes(r.name)).map(r => \`<@&\${r.id}>\`).join('\\n'), inline: true });
  }
  if (rolesFailed.length > 0) {
    fields.push({ name: '❌ Failed', value: rolesFailed.map(r => \`\\u2022 \${r}\`).join('\\n'), inline: true });
  }

  // Build eligibility hints
  if (serverContext.isMainServer && rolesAssigned.length === 0) {
    const [ordersRes, subRes, storeRes] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', profile.user_id).in('status', ['paid', 'completed']),
      supabase.from('subscriptions').select('id').eq('user_id', profile.user_id).eq('status', 'active').maybeSingle(),
      supabase.from('stores').select('id').eq('owner_id', profile.user_id).eq('status', 'approved').maybeSingle(),
    ]);
    const eligibility = [];
    const count = ordersRes.count || 0;
    if (count === 0) eligibility.push('\\u2022 Make a purchase → **Customer**');
    if (count > 0 && count < 5) eligibility.push(\`\\u2022 \${5 - count} more purchases → **Loyal Customer**\`);
    if (!subRes.data) eligibility.push('\\u2022 Subscribe to Eclipse+ → **Eclipse+**');
    if (!storeRes.data) eligibility.push('\\u2022 Create a store → **Store Creator**');
    if (eligibility.length > 0) fields.push({ name: '📋 How to Earn Roles', value: eligibility.join('\\n') });
  }

  const publicEmbed = {
    color: rolesAssigned.length > 0 ? 0x22c55e : 0xf59e0b,
    title: rolesAssigned.length > 0 ? '🎉 Roles Synced!' : '📋 Role Status',
    description: rolesAssigned.length > 0
      ? \`<@\${discordUserId}>\\n\\nYour roles have been updated!\`
      : \`<@\${discordUserId}>\\n\\nHere's what you need to earn roles:\`,
    thumbnail: { url: avatarUrl },
    fields,
    footer: { text: branding.footer },
    timestamp: new Date().toISOString(),
  };
  return publicReply(interaction, [publicEmbed]);
}`,

  'src/commands/store.js': `import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReply, ephemeralReply } from '../utils/responses.js';
import { supabase } from '../supabase.js';

export async function handleStore(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);

  if (serverContext.isMainServer) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL('https://eclipserblx.com'),
      new ButtonBuilder().setLabel('Browse Marketplace').setStyle(ButtonStyle.Link).setURL('https://eclipserblx.com/marketplace'),
    );
    return publicReply(interaction, [{
      color: 0x8b5cf6,
      title: '🛒 Eclipse Marketplace',
      description: 'The premier Roblox asset marketplace featuring scripts, UI kits, games, and more from verified creators.',
      thumbnail: { url: 'https://eclipserblx.com/logo.png' },
      footer: { text: 'Eclipse Marketplace' },
      timestamp: new Date().toISOString(),
    }], [row]);
  }

  if (!serverContext.store) {
    return publicReply(interaction, [{
      color: 0xef4444,
      description: \`<@\${discordUserId}>\\n\\n❌ This server isn't linked to a store.\`,
      thumbnail: { url: avatarUrl },
      footer: { text: branding.footer },
    }]);
  }

  const [storeResult, productResult] = await Promise.all([
    supabase.from('stores').select('id, name, slug, description, logo_url, banner_url, follower_count, is_verified').eq('id', serverContext.store.id).single(),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', serverContext.store.id).eq('is_active', true),
  ]);

  const store = storeResult.data;
  if (!store) return ephemeralReply(interaction, [{ color: 0xef4444, description: 'Failed to fetch store information.' }]);

  const storeUrl = \`https://eclipserblx.com/store/\${store.slug}\`;
  const fields = [];
  if (store.description) fields.push({ name: '📝 About', value: store.description.length > 200 ? store.description.substring(0, 200) + '...' : store.description });
  fields.push({ name: '📦 Products', value: \`\${productResult.count || 0}\`, inline: true });
  fields.push({ name: '👥 Followers', value: \`\${store.follower_count || 0}\`, inline: true });
  if (store.is_verified) fields.push({ name: '✅ Status', value: 'Verified Store', inline: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Browse Store').setStyle(ButtonStyle.Link).setURL(storeUrl)
  );

  return publicReply(interaction, [{
    color: 0x8b5cf6,
    title: \`🏪 \${store.name}\`,
    thumbnail: store.logo_url ? { url: store.logo_url } : undefined,
    image: store.banner_url ? { url: store.banner_url } : undefined,
    fields,
    footer: { text: \`\${store.name} \\u2022 Powered by Eclipse\` },
    timestamp: new Date().toISOString(),
  }], [row]);
}`,

  'src/commands/unlink.js': `import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { publicReplyWithDM } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handleUnlink(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    return publicReplyWithDM(interaction,
      { color: 0xef4444, description: \`<@\${discordUserId}>\\n❌ Your Discord isn't linked to any account.\`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } },
      [{ color: 0xef4444, title: '❌ No Linked Account', description: "Your Discord isn't linked to any Eclipse account.", fields: [{ name: 'Want to link?', value: 'Use \\\`/link\\\` to connect your Discord to your Eclipse account.' }], footer: { text: branding.footer }, timestamp: new Date().toISOString() }]
    );
  }

  // Check if locked
  const [storeResult, roleResult] = await Promise.all([
    supabase.from('stores').select('id, name').eq('owner_id', profile.user_id).eq('status', 'approved').maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', profile.user_id),
  ]);
  const store = storeResult.data;
  const userRoles = roleResult.data || [];
  const hasStoreCreatorRole = userRoles.some(r => r.role?.toLowerCase().includes('store') || r.role?.toLowerCase().includes('seller'));

  if (store || hasStoreCreatorRole) {
    const reasons = [];
    if (store) reasons.push(\`\\u2022 You own an active store (**\${store.name || 'Unknown'}**)\`);
    if (hasStoreCreatorRole) reasons.push('\\u2022 You have the **Store Creator** role');
    return publicReplyWithDM(interaction,
      { color: 0xef4444, description: \`<@\${discordUserId}>\\n🔒 Your account is locked. Check your DMs for details.\`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } },
      [{ color: 0xef4444, title: '🔒 Account Locked', description: 'Your Discord account cannot be unlinked for the following reasons:', thumbnail: { url: avatarUrl }, fields: [{ name: 'Reasons', value: reasons.join('\\n') }, { name: 'Need Help?', value: 'Contact support if you need to make changes to your linked accounts.' }], footer: { text: branding.footer }, timestamp: new Date().toISOString() }]
    );
  }

  const { error: updateError } = await supabase
    .from('profiles').update({ discord_id: null, discord_username: null }).eq('user_id', profile.user_id);

  if (updateError) {
    return publicReplyWithDM(interaction,
      { color: 0xef4444, description: \`<@\${discordUserId}>\\n❌ Something went wrong. Please try again.\`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } },
      [{ color: 0xef4444, title: '❌ Error', description: 'Failed to unlink your account. Please try again later.', thumbnail: { url: avatarUrl }, footer: { text: branding.footer }, timestamp: new Date().toISOString() }]
    );
  }

  return publicReplyWithDM(interaction,
    { color: 0x22c55e, description: \`<@\${discordUserId}>\\n✅ Your Discord has been unlinked from your Eclipse account.\`, thumbnail: { url: avatarUrl }, footer: { text: branding.footer } },
    [{ color: 0x22c55e, title: '✅ Account Unlinked', description: \`Your Discord has been disconnected from **@\${profile.username}**.\`, thumbnail: { url: avatarUrl }, fields: [{ name: 'Want to re-link?', value: 'Use \\\`/link\\\` anytime to reconnect your Discord.' }], footer: { text: branding.footer }, timestamp: new Date().toISOString() }]
  );
}`,

  'src/commands/showcase.js': `import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { getBranding } from '../utils/embeds.js';
import { ephemeralReply, publicReply } from '../utils/responses.js';
import { supabase } from '../supabase.js';

const ALLOWED_HOSTS = ['eclipserblx.com', 'www.eclipserblx.com', 'roleplay-hub-shop.lovable.app'];

export async function handleShowcaseCommand(interaction, serverContext) {
  const { data: profile } = await supabase
    .from('profiles').select('user_id').eq('discord_id', interaction.user.id).maybeSingle();

  if (!profile?.user_id) {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: 'Link your Discord account first with \\\`/link\\\` to showcase your store or products.' }]);
  }

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', profile.user_id).eq('is_active', true).is('deleted_at', null).maybeSingle();

  if (!store) {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: "You don't have an active store on Eclipse. Create one at https://eclipserblx.com/seller" }]);
  }

  const modal = new ModalBuilder().setCustomId('showcase_modal').setTitle('Showcase Your Store or Product');
  const urlInput = new TextInputBuilder().setCustomId('showcase_url').setLabel('Eclipse URL').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(200).setPlaceholder('eclipserblx.com/products/123 or eclipserblx.com/store/my-store');
  const messageInput = new TextInputBuilder().setCustomId('showcase_message').setLabel('Message (optional)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500).setPlaceholder('Tell people about your product or store...');
  modal.addComponents(new ActionRowBuilder().addComponents(urlInput), new ActionRowBuilder().addComponents(messageInput));
  return interaction.showModal(modal);
}

export async function handleShowcaseModal(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;
  const urlValue = interaction.fields.getTextInputValue('showcase_url');
  const messageValue = interaction.fields.getTextInputValue('showcase_message') || null;

  let normalised = urlValue.trim();
  if (!/^https?:\\/\\//i.test(normalised)) normalised = 'https://' + normalised;

  let hostname, pathname;
  try {
    const parsed = new URL(normalised);
    hostname = parsed.hostname.toLowerCase();
    pathname = parsed.pathname;
  } catch {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: "That doesn't look like a valid URL. Example: \\\`eclipserblx.com/products/123\\\`" }]);
  }

  let isAllowed = ALLOWED_HOSTS.includes(hostname);
  if (!isAllowed) {
    const { data: customDomain } = await supabase.from('store_domains').select('id').eq('domain', hostname).eq('status', 'active').maybeSingle();
    isAllowed = !!customDomain;
  }
  if (!isAllowed) return ephemeralReply(interaction, [{ color: 0xef4444, description: 'Only Eclipse URLs or verified custom store domains are accepted.' }]);

  const productMatch = pathname.match(/\\/products\\/(\\d+)/);
  const storeMatch = pathname.match(/\\/store\\/([^\\/\\?\\#]+)/);
  if (!productMatch && !storeMatch) return ephemeralReply(interaction, [{ color: 0xef4444, description: 'Please provide a valid Eclipse product or store URL.' }]);

  const { data: profile } = await supabase.from('profiles').select('user_id, display_name').eq('discord_id', discordUserId).maybeSingle();
  if (!profile?.user_id) return ephemeralReply(interaction, [{ color: 0xef4444, description: 'Link your Discord account first with \\\`/link\\\`.' }]);

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, slug, description, logo_url, banner_url, average_rating, total_sales, product_count, follower_count, discord_url, website_url, twitter_url, youtube_url, tiktok_url, roblox_url, is_verified')
    .eq('owner_id', profile.user_id).eq('is_active', true).is('deleted_at', null).maybeSingle();

  if (!store) return ephemeralReply(interaction, [{ color: 0xef4444, description: "You don't have an active store on Eclipse." }]);

  const { data: recent } = await supabase.from('audit_logs').select('id').eq('action', 'discord_showcase').eq('resource', store.id)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).limit(1);
  if (recent?.length > 0) return ephemeralReply(interaction, [{ color: 0xef4444, description: 'You can only showcase once every 24 hours. Try again later!' }]);

  await supabase.from('audit_logs').insert({ action: 'discord_showcase', resource: store.id, user_id: profile.user_id, details: { discord_id: discordUserId, url: urlValue } });

  const customMessage = messageValue?.replace(/<[^>]*>/g, '').replace(/@(everyone|here)/gi, '@\\u200B$1').substring(0, 500).trim() || null;

  if (productMatch) {
    return handleProductShowcase(interaction, store, productMatch[1], branding, customMessage);
  }
  return handleStoreShowcase(interaction, store, branding, customMessage);
}

async function handleStoreShowcase(interaction, store, branding, customMessage) {
  const storeUrl = \`https://eclipserblx.com/store/\${encodeURIComponent(store.slug)}\`;
  let desc = store.description ? store.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : 'Check out this store on Eclipse!';
  if (desc.length > 300) desc = desc.substring(0, 297) + '...';

  const badges = [];
  if (store.is_verified) badges.push('\\u2705 Verified Seller');
  const links = [\`\\uD83C\\uDF10 [Visit Store](\${storeUrl})\`];
  if (store.discord_url) links.push(\`\\uD83D\\uDCAC [Discord](\${store.discord_url})\`);
  if (store.website_url) links.push(\`\\uD83D\\uDD17 [Website](\${store.website_url})\`);
  if (store.roblox_url) links.push(\`\\uD83C\\uDFAE [Roblox](\${store.roblox_url})\`);

  const { data: products } = await supabase.from('products').select('name, slug, product_number, price')
    .eq('store_id', store.id).eq('is_active', true).eq('moderation_status', 'approved').order('created_at', { ascending: false }).limit(5);

  const productList = products?.length
    ? products.map(p => \`\\u2022 [\${p.name}](https://eclipserblx.com/products/\${p.product_number || encodeURIComponent(p.slug)}) \\u2014 \${p.price === 0 ? 'FREE' : \`\\u00A3\${Number(p.price).toFixed(2)}\`}\`).join('\\n')
    : null;

  const rating = store.average_rating ? \`\${'⭐'.repeat(Math.round(store.average_rating))} \${Number(store.average_rating).toFixed(1)}/5\` : 'No ratings yet';
  const fields = [];
  if (customMessage) fields.push({ name: '\\uD83D\\uDCAC From the Seller', value: customMessage });
  fields.push({ name: '\\u2B50 Rating', value: rating, inline: true });
  fields.push({ name: '\\uD83D\\uDCE6 Products', value: '' + (store.product_count || 0), inline: true });
  fields.push({ name: '\\uD83D\\uDC65 Followers', value: '' + (store.follower_count || 0), inline: true });
  fields.push({ name: '\\uD83D\\uDD17 Links', value: links.join(' \\u2022 ') });
  if (productList) fields.push({ name: '🛍️ Featured Products', value: productList });
  if (badges.length > 0) fields.push({ name: '🏆 Badges', value: badges.join(' \\u2022 ') });

  const embeds = [{
    color: branding.color, title: \`🏪 \${store.name}\`, url: storeUrl, description: desc,
    thumbnail: store.logo_url ? { url: store.logo_url } : undefined, fields,
    footer: { text: \`\${branding.footer} \\u2022 Creator Showcase\`, icon_url: branding.icon }, timestamp: new Date().toISOString(),
  }];
  if (store.banner_url) embeds.push({ color: branding.color, image: { url: store.banner_url } });
  return publicReply(interaction, embeds);
}

async function handleProductShowcase(interaction, store, productNumber, branding, customMessage) {
  const { data: product } = await supabase.from('products')
    .select('id, name, slug, product_number, price, images, description, download_count')
    .eq('store_id', store.id).eq('is_active', true).eq('moderation_status', 'approved').eq('product_number', productNumber).maybeSingle();

  if (!product) return ephemeralReply(interaction, [{ color: 0xef4444, description: \`No product found with number #\${productNumber} in your store.\` }]);

  const productUrl = \`https://eclipserblx.com/products/\${product.product_number || encodeURIComponent(product.slug)}\`;
  const storeUrl = \`https://eclipserblx.com/store/\${encodeURIComponent(store.slug)}\`;
  let productDesc = (product.description || 'A premium product from Eclipse.').replace(/<[^>]*>/g, '').trim();
  if (productDesc.length > 250) productDesc = productDesc.substring(0, 247) + '...';

  const fields = [];
  if (customMessage) fields.push({ name: '💬 From the Seller', value: customMessage });
  fields.push({ name: '💰 Price', value: product.price === 0 ? '**FREE**' : \`**£\${Number(product.price).toFixed(2)}**\`, inline: true });
  fields.push({ name: '🏪 Store', value: \`[\${store.name}](\${storeUrl})\`, inline: true });
  if (product.download_count > 0) fields.push({ name: '📥 Downloads', value: \`\${product.download_count}\`, inline: true });

  const embeds = [{
    color: branding.color, title: \`🌟 \${product.name}\`, url: productUrl,
    description: \`\${productDesc}\\n\\n**[View Product](\${productUrl})**\`,
    thumbnail: store.logo_url ? { url: store.logo_url } : undefined,
    image: product.images?.[0] ? { url: product.images[0] } : undefined,
    fields, footer: { text: \`\${branding.footer} \\u2022 Creator Showcase\`, icon_url: branding.icon }, timestamp: new Date().toISOString(),
  }];
  if (product.images?.length > 1) {
    for (let i = 1; i < Math.min(product.images.length, 4); i++) {
      embeds.push({ color: branding.color, image: { url: product.images[i] } });
    }
  }
  return publicReply(interaction, embeds);
}`,

  'src/commands/walletbalance.js': `import { getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handleWalletBalance(interaction) {
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: "❌ Your Discord isn't linked to an Eclipse account. Use \\\`/link\\\` first." }]);
  }

  const { data: balance } = await supabase
    .from('credit_balances').select('balance, total_purchased, total_gifted, total_spent').eq('user_id', profile.user_id).maybeSingle();

  const bal = balance || { balance: 0, total_purchased: 0, total_gifted: 0, total_spent: 0 };
  const embed = {
    title: '💰 Your Eclipse Wallet',
    color: 0x7c3aed,
    fields: [
      { name: 'Current Balance', value: \`£\${Number(bal.balance).toFixed(2)}\`, inline: true },
      { name: 'Total Purchased', value: \`£\${Number(bal.total_purchased).toFixed(2)}\`, inline: true },
      { name: 'Total Gifted', value: \`£\${Number(bal.total_gifted).toFixed(2)}\`, inline: true },
      { name: 'Total Spent', value: \`£\${Number(bal.total_spent).toFixed(2)}\`, inline: true },
    ],
    thumbnail: { url: avatarUrl },
  };

  try {
    await interaction.user.send({ embeds: [embed] });
    return ephemeralReply(interaction, [{ color: 0x22c55e, description: '💰 Your wallet balance has been sent to your DMs!' }]);
  } catch {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: "❌ I couldn't send you a DM. Please make sure your DMs are open and try again." }]);
  }
}`,

  'src/commands/help.js': `import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getBranding } from '../utils/embeds.js';
import { ephemeralReply } from '../utils/responses.js';

const PAGES = [
  {
    title: '📖 Eclipse Portal Bot - Account',
    commands: [
      { name: '/link', desc: 'Check if your Discord is linked to Eclipse' },
      { name: '/verify', desc: 'Link your Discord using a code from Eclipse' },
      { name: '/profile', desc: 'View your Eclipse profile and stats' },
      { name: '/unlink', desc: 'Disconnect your Discord from Eclipse' },
    ],
    tip: '💡 Use \\\`/verify\\\` with your code from the Eclipse website to link your account!',
  },
  {
    title: '📖 Eclipse Portal Bot - Shopping',
    commands: [
      { name: '/purchases', desc: 'View your recent purchases' },
      { name: '/retrieve', desc: 'Get a download link for a purchased product' },
      { name: '/store', desc: "View this server's store information" },
      { name: '/showcase', desc: 'View a featured product from the marketplace' },
    ],
    tip: '🛒 Browse products and retrieve your purchases anytime!',
  },
  {
    title: '📖 Eclipse Portal Bot - Roles & Support',
    commands: [
      { name: '/getrole', desc: 'Sync your Discord roles based on your account' },
      { name: '/help', desc: 'View this help message' },
    ],
    tip: '🎫 Use \\\`/getrole\\\` after purchases to sync your roles!',
  },
  {
    title: '🛡️ Eclipse Portal Bot - Global Guard',
    commands: [
      { name: '/globalban', desc: 'Ban a user across all your servers' },
      { name: '/globalunban', desc: 'Remove a global ban from a user' },
      { name: '/globalbans', desc: 'View your active global bans' },
    ],
    tip: '🛡️ Requires an active bot license. Visit guard.eclipserblx.com for full management!',
  },
];

export function buildHelpResponse(serverContext, page = 0) {
  const branding = getBranding(serverContext);
  const currentPage = PAGES[page] || PAGES[0];
  const totalPages = PAGES.length;

  const commandList = currentPage.commands.map(cmd => \`**\${cmd.name}** — \${cmd.desc}\`).join('\\n');
  const embed = {
    color: branding.color,
    title: currentPage.title,
    description: \`Page \${page + 1} of \${totalPages}\\n\\n\${commandList}\`,
    fields: [{ name: currentPage.tip.split(' ')[0], value: currentPage.tip.substring(currentPage.tip.indexOf(' ') + 1) }],
    footer: { text: branding.footer, icon_url: branding.icon },
    timestamp: new Date().toISOString(),
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(\`portalhelp_prev_\${page}\`).setLabel('◀ Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(\`portalhelp_page_\${page}\`).setLabel(\`\${page + 1}/\${totalPages}\`).setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId(\`portalhelp_next_\${page}\`).setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
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
}`,

  'src/commands/update.js': `import { PermissionsBitField } from 'discord.js';
import { getBranding, getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply } from '../utils/responses.js';
import { supabase } from '../supabase.js';
import { config } from '../config.js';

export async function handleUpdate(interaction, serverContext) {
  const branding = getBranding(serverContext);
  const discordUserId = interaction.user.id;

  if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) {
    return ephemeralReply(interaction, [{ color: 0xef4444, title: '❌ Permission Denied', description: 'You need the **Manage Roles** permission to use this command.', footer: { text: branding.footer } }]);
  }

  const targetUser = interaction.options.getUser('user');
  if (!targetUser) return ephemeralReply(interaction, [{ color: 0xef4444, title: '❌ Missing User', description: 'Please provide a **user** to sync roles for.', footer: { text: branding.footer } }]);

  const { data: profile } = await supabase.from('profiles').select('user_id, username, discord_id').eq('discord_id', targetUser.id).maybeSingle();
  if (!profile) return ephemeralReply(interaction, [{ color: 0xef4444, title: '❌ Account Not Linked', description: \`<@\${targetUser.id}> doesn't have a linked Eclipse account.\`, footer: { text: branding.footer } }]);

  try {
    const rolesToAssign = [];
    const rolesToRemove = [];

    if (serverContext.isMainServer) {
      const [ordersResult, subscriptionResult, storeResult] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', profile.user_id).in('status', ['paid', 'completed']),
        supabase.from('subscriptions').select('id').eq('user_id', profile.user_id).eq('status', 'active').maybeSingle(),
        supabase.from('stores').select('id, is_verified').eq('owner_id', profile.user_id).eq('status', 'approved').maybeSingle(),
      ]);
      const purchaseCount = ordersResult.count || 0;
      const hasSubscription = !!subscriptionResult.data;
      const hasStore = !!storeResult.data;
      const isVerified = storeResult.data?.is_verified === true;

      if (purchaseCount >= 5 && config.loyalCustomerRoleId) {
        rolesToAssign.push({ id: config.loyalCustomerRoleId, name: 'Loyal Customer' });
        if (config.customerRoleId) rolesToRemove.push({ id: config.customerRoleId, name: 'Customer' });
      } else if (purchaseCount >= 1 && config.customerRoleId) {
        rolesToAssign.push({ id: config.customerRoleId, name: 'Customer' });
        if (config.loyalCustomerRoleId) rolesToRemove.push({ id: config.loyalCustomerRoleId, name: 'Loyal Customer' });
      } else {
        if (config.customerRoleId) rolesToRemove.push({ id: config.customerRoleId, name: 'Customer' });
        if (config.loyalCustomerRoleId) rolesToRemove.push({ id: config.loyalCustomerRoleId, name: 'Loyal Customer' });
      }
      if (hasSubscription && config.eclipsePlusRoleId) rolesToAssign.push({ id: config.eclipsePlusRoleId, name: 'Eclipse+' });
      else if (config.eclipsePlusRoleId) rolesToRemove.push({ id: config.eclipsePlusRoleId, name: 'Eclipse+' });
      if (hasStore && config.storeCreatorRoleId) rolesToAssign.push({ id: config.storeCreatorRoleId, name: 'Store Creator' });
      else if (config.storeCreatorRoleId) rolesToRemove.push({ id: config.storeCreatorRoleId, name: 'Store Creator' });
      if (isVerified && config.verifiedSellerRoleId) rolesToAssign.push({ id: config.verifiedSellerRoleId, name: 'Verified Seller' });
      else if (config.verifiedSellerRoleId) rolesToRemove.push({ id: config.verifiedSellerRoleId, name: 'Verified Seller' });
    } else if (serverContext.store) {
      const [roleConfigsResult, ordersResult] = await Promise.all([
        supabase.from('discord_role_configs').select('*').eq('store_id', serverContext.store.id).eq('auto_assign_on_purchase', true),
        supabase.from('orders').select('id').eq('user_id', profile.user_id).in('status', ['paid', 'completed']).limit(200),
      ]);
      const roleConfigs = roleConfigsResult.data || [];
      const orderIds = (ordersResult.data || []).map(o => o.id);
      if (orderIds.length > 0 && roleConfigs.length > 0) {
        const { data: orderItems } = await supabase.from('order_items').select('store_id').in('order_id', orderIds).eq('store_id', serverContext.store.id);
        const storeOrderCount = orderItems?.length || 0;
        for (const cfg of roleConfigs) {
          if (!cfg.min_order_count || storeOrderCount >= cfg.min_order_count) {
            rolesToAssign.push({ id: cfg.role_id, name: cfg.role_name });
          }
        }
      }
    }

    const member = await interaction.guild.members.fetch(targetUser.id);
    const assigned = [], removed = [], errors = [];

    await Promise.all([
      ...rolesToAssign.map(async role => {
        try { await member.roles.add(role.id); assigned.push(role.name); } catch { errors.push(\`Failed to assign \${role.name}\`); }
      }),
      ...rolesToRemove.map(async role => {
        try { await member.roles.remove(role.id); removed.push(role.name); } catch {}
      }),
    ]);

    await supabase.from('audit_logs').insert({
      action: 'discord_role_sync_manual', resource: 'discord_roles', user_id: null,
      details: { admin_discord_id: discordUserId, target_discord_id: targetUser.id, target_eclipse_user: profile.username, assigned, removed, errors, guild_id: serverContext.guildId },
    });

    const fields = [];
    if (assigned.length > 0) fields.push({ name: '✅ Assigned', value: assigned.map(r => \`\\\`\${r}\\\`\`).join(', '), inline: true });
    if (removed.length > 0) fields.push({ name: '🔄 Removed', value: removed.map(r => \`\\\`\${r}\\\`\`).join(', '), inline: true });
    if (errors.length > 0) fields.push({ name: '⚠️ Errors', value: errors.join('\\n') });
    if (!assigned.length && !removed.length && !errors.length) fields.push({ name: 'ℹ️ No Changes', value: 'No roles needed updating for this user.' });

    return ephemeralReply(interaction, [{ color: errors.length > 0 ? 0xf59e0b : 0x22c55e, title: \`🔄 Role Sync — \${profile.username}\`, description: \`Synced Eclipse roles for <@\${targetUser.id}>.\`, fields, footer: { text: branding.footer } }]);
  } catch (error) {
    console.error('[update] Error:', error);
    return ephemeralReply(interaction, [{ color: 0xef4444, title: '❌ Error', description: 'An unexpected error occurred. Please try again.', footer: { text: branding.footer } }]);
  }
}`,

  'src/commands/globalban.js': `import { getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply, publicReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';
import { config } from '../config.js';

export async function handleGlobalBan(interaction) {
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const userOption = interaction.options.getString('user') || '';
  const reason = interaction.options.getString('reason') || null;
  const duration = interaction.options.getString('duration') || null;

  const targetDiscordId = userOption.replace(/<@!?(\\d+)>/, '$1').trim();
  if (!targetDiscordId || !/^\\d{17,20}$/.test(targetDiscordId)) {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Please provide a valid Discord user ID or @mention.' }]);
  }

  const profile = await getLinkedAccount(discordUserId);
  if (!profile) return ephemeralReply(interaction, [{ color: 0xef4444, description: "❌ You must link your Discord account to Eclipse to use Global Guard.\\nUse \\\`/link\\\` to get started." }]);

  const { data: licenses } = await supabase.from('bot_installation_codes').select('id').eq('user_id', profile.user_id).eq('license_status', 'active').not('guild_id', 'is', null).limit(1);
  if (!licenses?.length) return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Global Guard requires an active bot license.' }]);

  let expiresAt = null, banType = 'permanent';
  if (duration) {
    banType = 'temporary';
    const durationMap = { '1h': 3600000, '12h': 43200000, '1d': 86400000, '7d': 604800000, '30d': 2592000000, '90d': 7776000000 };
    expiresAt = new Date(Date.now() + (durationMap[duration] || 0)).toISOString();
  }

  const { data: existingBan } = await supabase.from('global_bans').select('id').eq('owner_user_id', profile.user_id).eq('banned_discord_id', targetDiscordId).eq('is_active', true).maybeSingle();
  if (existingBan) return ephemeralReply(interaction, [{ color: 0xf59e0b, description: '⚠️ This user is already globally banned. Use \\\`/globalunban\\\` first.' }]);

  let targetUsername = 'Unknown User', targetAvatarUrl = null;
  try {
    const client = interaction.client;
    const user = await client.users.fetch(targetDiscordId);
    targetUsername = user.globalName || user.username;
    targetAvatarUrl = user.displayAvatarURL({ extension: 'png', size: 128 });
  } catch {}

  const { data: ban, error: banError } = await supabase.from('global_bans').insert({
    owner_user_id: profile.user_id, banned_discord_id: targetDiscordId, banned_username: targetUsername,
    banned_avatar_url: targetAvatarUrl, reason, ban_type: banType, expires_at: expiresAt, created_via: 'discord_command', is_active: true,
  }).select().single();

  if (banError) return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Failed to create global ban. Please try again.' }]);

  await supabase.from('global_ban_logs').insert({ ban_id: ban.id, action: 'created', performed_by: profile.user_id, details: { via: 'discord_command', ban_type: banType } });

  fetch(\`\${config.supabaseUrl}/functions/v1/sync-global-bans\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${config.supabaseServiceKey}\` },
    body: JSON.stringify({ banId: ban.id, action: 'ban' }),
  }).catch(console.error);

  const durationText = duration ? \`for **\${duration.replace('h', ' hour').replace('d', ' day')}**\` : '**permanently**';
  return publicReply(interaction, [{
    color: 0xef4444, title: '🛡️ Global Ban Created',
    description: \`**\${targetUsername}** has been banned \${durationText} across all your servers.\`,
    thumbnail: targetAvatarUrl ? { url: targetAvatarUrl } : undefined,
    fields: [
      { name: '🆔 Discord ID', value: targetDiscordId, inline: true },
      { name: '📝 Reason', value: reason || 'No reason provided', inline: true },
      { name: '⏱️ Status', value: 'Syncing to servers...', inline: false },
    ],
    footer: { text: 'Global Guard \\u2022 Eclipse Marketplace', icon_url: avatarUrl },
    timestamp: new Date().toISOString(),
  }]);
}`,

  'src/commands/globalunban.js': `import { getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply, publicReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';
import { config } from '../config.js';

export async function handleGlobalUnban(interaction) {
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const userOption = interaction.options.getString('user') || '';
  const targetDiscordId = userOption.replace(/<@!?(\\d+)>/, '$1').trim();

  if (!targetDiscordId || !/^\\d{17,20}$/.test(targetDiscordId)) {
    return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Please provide a valid Discord user ID or @mention.' }]);
  }

  const profile = await getLinkedAccount(discordUserId);
  if (!profile) return ephemeralReply(interaction, [{ color: 0xef4444, description: "❌ You must link your Discord account to Eclipse.\\nUse \\\`/link\\\` to get started." }]);

  const { data: ban } = await supabase.from('global_bans').select('*').eq('owner_user_id', profile.user_id).eq('banned_discord_id', targetDiscordId).eq('is_active', true).maybeSingle();
  if (!ban) return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ No active global ban found for this user.' }]);

  const { error } = await supabase.from('global_bans').update({ is_active: false }).eq('id', ban.id);
  if (error) return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Failed to revoke ban. Please try again.' }]);

  await supabase.from('global_ban_logs').insert({ ban_id: ban.id, action: 'revoked', performed_by: profile.user_id, details: { via: 'discord_command' } });

  fetch(\`\${config.supabaseUrl}/functions/v1/sync-global-bans\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${config.supabaseServiceKey}\` },
    body: JSON.stringify({ banId: ban.id, action: 'unban' }),
  }).catch(console.error);

  return publicReply(interaction, [{
    color: 0x22c55e, title: '🛡️ Global Ban Removed',
    description: \`**\${ban.banned_username || targetDiscordId}** has been unbanned from all your servers.\`,
    thumbnail: ban.banned_avatar_url ? { url: ban.banned_avatar_url } : undefined,
    fields: [
      { name: '🆔 Discord ID', value: targetDiscordId, inline: true },
      { name: '⏱️ Status', value: 'Syncing to servers...', inline: true },
    ],
    footer: { text: 'Global Guard \\u2022 Eclipse Marketplace', icon_url: avatarUrl },
    timestamp: new Date().toISOString(),
  }]);
}`,

  'src/commands/globalbans.js': `import { getAvatarUrl } from '../utils/embeds.js';
import { ephemeralReply } from '../utils/responses.js';
import { getLinkedAccount } from '../utils/server-context.js';
import { supabase } from '../supabase.js';

export async function handleGlobalBans(interaction) {
  const discordUserId = interaction.user.id;
  const avatarUrl = getAvatarUrl(interaction.user);
  const profile = await getLinkedAccount(discordUserId);

  if (!profile) return ephemeralReply(interaction, [{ color: 0xef4444, description: "❌ You must link your Discord account to Eclipse.\\nUse \\\`/link\\\` to get started." }]);

  const { data: bans, error } = await supabase.from('global_bans').select('*').eq('owner_user_id', profile.user_id).eq('is_active', true).order('created_at', { ascending: false }).limit(10);

  if (error) return ephemeralReply(interaction, [{ color: 0xef4444, description: '❌ Failed to fetch your bans. Please try again.' }]);

  if (!bans?.length) {
    return ephemeralReply(interaction, [{
      color: 0x3b82f6, title: '🛡️ Global Guard - Active Bans',
      description: 'You have no active global bans.\\n\\nUse \\\`/globalban\\\` to ban a user across all your servers.',
      footer: { text: 'Global Guard \\u2022 Eclipse Marketplace', icon_url: avatarUrl },
      timestamp: new Date().toISOString(),
    }]);
  }

  const banList = bans.map(ban => {
    const typeEmoji = ban.ban_type === 'permanent' ? '🔴' : '🟡';
    const expiryText = ban.expires_at ? \`Expires: <t:\${Math.floor(new Date(ban.expires_at).getTime() / 1000)}:R>\` : 'Permanent';
    return \`\${typeEmoji} **\${ban.banned_username || ban.banned_discord_id}**\\n└ ID: \\\`\${ban.banned_discord_id}\\\` \\u2022 \${expiryText}\`;
  }).join('\\n\\n');

  return ephemeralReply(interaction, [{
    color: 0x3b82f6, title: '🛡️ Global Guard - Active Bans',
    description: \`You have **\${bans.length}** active global ban\${bans.length === 1 ? '' : 's'}:\\n\\n\${banList}\`,
    fields: [{ name: '📊 Manage Bans', value: 'Visit [guard.eclipserblx.com](https://guard.eclipserblx.com) for full management.' }],
    footer: { text: 'Global Guard \\u2022 Eclipse Marketplace', icon_url: avatarUrl },
    timestamp: new Date().toISOString(),
  }]);
}`,

  'src/register-commands.js': `/**
 * One-off script to register slash commands with Discord.
 * Run: node src/register-commands.js
 */
import 'dotenv/config';
import { config } from './config.js';

const DISCORD_API = 'https://discord.com/api/v10';

const commands = [
  { name: 'link', description: 'Check if your Discord is linked to your Eclipse account' },
  {
    name: 'verify', description: 'Link your Discord using a verification code',
    options: [{ name: 'code', description: 'Your verification code from Eclipse', type: 3, required: true }],
  },
  { name: 'profile', description: 'View your Eclipse profile and stats' },
  { name: 'purchases', description: 'View your recent purchases' },
  {
    name: 'retrieve', description: 'Get a download link for a purchased product',
    options: [{ name: 'product', description: 'Product name to download', type: 3, required: false }],
  },
  { name: 'getrole', description: 'Sync your Discord roles based on your Eclipse account' },
  { name: 'store', description: "View this server's store information" },
  { name: 'unlink', description: 'Disconnect your Discord from your Eclipse account' },
  { name: 'showcase', description: 'Showcase your store or product' },
  { name: 'walletbalance', description: 'Check your Eclipse wallet balance (sent via DM)' },
  { name: 'help', description: 'View all available bot commands' },
  {
    name: 'update', description: 'Admin: sync Eclipse roles for a user',
    options: [{ name: 'user', description: 'The user to sync roles for', type: 6, required: true }],
  },
  {
    name: 'globalban', description: 'Ban a user across all your servers (Global Guard)',
    options: [
      { name: 'user', description: 'Discord user ID or @mention', type: 3, required: true },
      { name: 'reason', description: 'Reason for the ban', type: 3, required: false },
      {
        name: 'duration', description: 'Ban duration (leave empty for permanent)', type: 3, required: false,
        choices: [
          { name: '1 Hour', value: '1h' }, { name: '12 Hours', value: '12h' },
          { name: '1 Day', value: '1d' }, { name: '7 Days', value: '7d' },
          { name: '30 Days', value: '30d' }, { name: '90 Days', value: '90d' },
        ],
      },
    ],
  },
  {
    name: 'globalunban', description: 'Remove a global ban from a user',
    options: [{ name: 'user', description: 'Discord user ID or @mention', type: 3, required: true }],
  },
  { name: 'globalbans', description: 'View your active global bans' },
];

async function registerCommands() {
  const meRes = await fetch(\`\${DISCORD_API}/users/@me\`, {
    headers: { Authorization: \`Bot \${config.botToken}\` },
  });
  const me = await meRes.json();
  const appId = me.id;

  console.log(\`Registering \${commands.length} commands for application \${appId}...\`);

  const res = await fetch(\`\${DISCORD_API}/applications/\${appId}/commands\`, {
    method: 'PUT',
    headers: {
      Authorization: \`Bot \${config.botToken}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('Failed to register commands:', res.status, error);
    process.exit(1);
  }

  const registered = await res.json();
  console.log(\`✅ Successfully registered \${registered.length} commands globally!\`);
  registered.forEach(cmd => console.log(\`  /\${cmd.name} — \${cmd.description}\`));
}

registerCommands().catch(console.error);`,
};

// Organize files into folders for the tree view
interface FileTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileTreeNode[];
}

function buildFileTree(): FileTreeNode[] {
  const paths = Object.keys(BOT_FILES).sort();
  const root: FileTreeNode[] = [];

  for (const path of paths) {
    const parts = path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join('/');

      const existing = current.find(n => n.name === part);
      if (existing && !isLast) {
        current = existing.children || [];
      } else if (!existing) {
        const node: FileTreeNode = {
          name: part,
          path: fullPath,
          isFolder: !isLast,
          children: isLast ? undefined : [],
        };
        current.push(node);
        if (!isLast) current = node.children!;
      }
    }
  }

  return root;
}

function FileItem({ node, selectedFile, onSelect }: { node: FileTreeNode; selectedFile: string | null; onSelect: (path: string) => void }) {
  const [isOpen, setIsOpen] = useState(true);

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 w-full text-left py-1 px-2 rounded hover:bg-muted/50 text-sm"
        >
          {isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          <FolderOpen className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div className="ml-4">
            {node.children.map(child => (
              <FileItem key={child.path} node={child} selectedFile={selectedFile} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`flex items-center gap-1.5 w-full text-left py-1 px-2 rounded text-sm transition-colors ${
        selectedFile === node.path ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'
      }`}
    >
      <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export default function AdminPortalBotSetup() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const [selectedFile, setSelectedFile] = useState<string | null>('package.json');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!user || !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const fileTree = buildFileTree();

  const copyFileContent = (path: string) => {
    const content = BOT_FILES[path];
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedFile(path);
    toast.success(`Copied ${path}`);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const copyAllFiles = () => {
    const allContent = Object.entries(BOT_FILES)
      .map(([path, content]) => `// ===== ${path} =====\n${content}`)
      .join('\n\n\n');
    navigator.clipboard.writeText(allContent);
    setCopiedAll(true);
    toast.success('Copied all files to clipboard');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <AdminLayout>
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Portal Bot Setup</h1>
              <p className="text-sm text-muted-foreground">Persistent Eclipse Portal Bot files</p>
            </div>
          </div>
          <Button onClick={copyAllFiles} variant="outline" size="sm">
            {copiedAll ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copiedAll ? 'Copied!' : 'Copy All'}
          </Button>
        </div>

        {/* Setup Steps */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
            <h3 className="font-semibold text-sm text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Quick Setup
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {[
              { step: '1', text: 'Create a folder called eclipse-portal-bot and add all files below' },
              { step: '2', text: 'Run npm install to install dependencies' },
              { step: '3', text: 'Copy .env.example to .env and fill in your values' },
              { step: '4', text: 'Run npm run register to register slash commands' },
              { step: '5', text: 'Run npm start to start the bot' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="shrink-0 mt-0.5">{item.step}</Badge>
                <span className="text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deployment Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border rounded-xl overflow-hidden p-3">
            <div className="flex items-center gap-2 mb-1">
              <Server className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Railway</span>
            </div>
            <p className="text-xs text-muted-foreground">~£5/mo, easy deploy</p>
          </div>
          <div className="border border-border rounded-xl overflow-hidden p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Fly.io</span>
            </div>
            <p className="text-xs text-muted-foreground">Free tier available</p>
          </div>
        </div>

        {/* File Browser */}
        <div className="border border-border rounded-xl overflow-hidden overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
        <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-base">Bot Files ({Object.keys(BOT_FILES).length} files)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tap a file to view, then copy</p>
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  const JSZip = (await import('jszip')).default;
                  const zip = new JSZip();
                  const folder = zip.folder('eclipse-portal-bot')!;
                  Object.entries(BOT_FILES).forEach(([path, content]) => {
                    folder.file(path, content);
                  });
                  const blob = await zip.generateAsync({ type: 'blob' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'eclipse-portal-bot.zip';
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Downloading eclipse-portal-bot.zip');
                }}
                className="shrink-0"
              >
                <Download className="h-4 w-4 mr-1" />
                Download ZIP
              </Button>
            </div>
          </div>
          <div className="p-4 p-0">
            {/* File Tree */}
            <div className="border-b p-3 max-h-64 overflow-y-auto">
              {fileTree.map(node => (
                <FileItem key={node.path} node={node} selectedFile={selectedFile} onSelect={setSelectedFile} />
              ))}
            </div>

            {/* File Content */}
            {selectedFile && BOT_FILES[selectedFile] && (
              <div className="relative">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-mono">{selectedFile}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyFileContent(selectedFile)}
                    className="h-7 px-2"
                  >
                    {copiedFile === selectedFile ? (
                      <><Check className="h-3 w-3 mr-1 text-green-500" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3 mr-1" /> Copy</>
                    )}
                  </Button>
                </div>
                <ScrollArea className="h-[400px]">
                  <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                    <code>{BOT_FILES[selectedFile]}</code>
                  </pre>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
