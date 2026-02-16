import { Client, GatewayIntentBits, EmbedBuilder, ChannelType } from 'discord.js';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const DISCORD_TOKEN = process.env.DISCORD_CUSTOMER_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Validate environment
if (!DISCORD_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables!');
  console.error('Required: DISCORD_CUSTOMER_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize Discord client with DM + Guild Member intents
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: ['CHANNEL', 'MESSAGE'],
});

// Branding
const ECLIPSE_COLOR = 0x8B5CF6; // Purple
const ECLIPSE_ICON = 'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/eclipse-logo.png';

/**
 * Find an open ticket for a Discord user
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

  if (error) {
    console.error('Error finding ticket:', error);
    return null;
  }

  return data;
}

/**
 * Add a message to an existing ticket
 */
async function addMessageToTicket(ticketId, content, discordMessageId, attachments = null) {
  const { data, error } = await supabase
    .from('discord_modmail_messages')
    .insert({
      ticket_id: ticketId,
      content,
      discord_message_id: discordMessageId,
      is_staff_reply: false,
      attachments,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding message:', error);
    return null;
  }

  // Update ticket timestamp
  await supabase
    .from('discord_modmail_tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  return data;
}

/**
 * Send notification to staff channel via webhook
 */
async function notifyStaff(ticket, message, username, avatarUrl) {
  if (!DISCORD_WEBHOOK_URL) return;

  try {
    const embed = {
      title: '💬 New Customer Reply',
      description: message.length > 500 ? message.substring(0, 500) + '...' : message,
      color: ECLIPSE_COLOR,
      author: {
        name: username,
        icon_url: avatarUrl,
      },
      fields: [
        {
          name: 'Ticket Subject',
          value: ticket.subject || 'No subject',
          inline: true,
        },
        {
          name: 'Status',
          value: ticket.status === 'in_progress' ? '🔄 In Progress' : '📩 Open',
          inline: true,
        },
      ],
      footer: {
        text: `Ticket ID: ${ticket.id.substring(0, 8)}`,
        icon_url: ECLIPSE_ICON,
      },
      timestamp: new Date().toISOString(),
    };

    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (error) {
    console.error('Error notifying staff:', error);
  }
}

/**
 * Send confirmation embed to user
 */
async function sendConfirmation(channel, ticket) {
  const embed = new EmbedBuilder()
    .setColor(ECLIPSE_COLOR)
    .setTitle('✅ Message Received')
    .setDescription('Your reply has been added to your support ticket. Our team will respond as soon as possible.')
    .addFields({
      name: 'Ticket Subject',
      value: ticket.subject || 'Support Request',
      inline: true,
    })
    .setFooter({ text: 'Eclipse Support', iconURL: ECLIPSE_ICON })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

/**
 * Send "no ticket" message
 */
async function sendNoTicketMessage(channel) {
  const embed = new EmbedBuilder()
    .setColor(0xEF4444) // Red
    .setTitle('❌ No Open Ticket')
    .setDescription('You don\'t have an open support ticket. To create one, use the `/support` command in the Eclipse Discord server.')
    .setFooter({ text: 'Eclipse Support', iconURL: ECLIPSE_ICON })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

// Handle new member joins - send plain text welcome in public channel
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;

  console.log(`[JOIN] ${member.user.tag} joined ${member.guild.name} (${member.guild.id})`);

  try {
    const siteUrl = process.env.SITE_URL || 'https://eclipserblx.com';
    const bannerUrl = 'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/store-branding/eclipse-discord-banner.png';

    // Find the public chat channel: use system channel or first text channel
    const channel = member.guild.systemChannel
      || member.guild.channels.cache.find(
           (ch) => ch.type === ChannelType.GuildText && ch.permissionsFor(member.guild.members.me)?.has('SendMessages')
         );

    if (!channel) {
      console.log(`[WELCOME] No suitable channel found in ${member.guild.name}`);
      return;
    }

    const welcomeText =
      `👋 Welcome to Eclipse, <@${member.user.id}>!\n\n` +
      `You've joined Eclipse — a professional marketplace for high-quality Roblox assets and development resources.\n\n` +
      `🚀 Explore the server, review the rules, and start building with confidence.\n\n` +
      `Shop & Earn Here : ${siteUrl}\n\n` +
      `✨ Eclipse — **Inspiring Your Innovation.**`;

    await channel.send({ content: welcomeText, files: [bannerUrl] });
    console.log(`[WELCOME] Sent welcome message for ${member.user.tag} in #${channel.name}`);
  } catch (error) {
    console.error(`[WELCOME] Error sending welcome message:`, error);
  }
});

// Handle incoming messages
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only process DMs
  if (message.channel.type !== ChannelType.DM) return;

  console.log(`[DM] ${message.author.tag}: ${message.content}`);

  try {
    // Find open ticket for this user
    const ticket = await findOpenTicket(message.author.id);

    if (!ticket) {
      await sendNoTicketMessage(message.channel);
      return;
    }

    // Process attachments
    const attachments = message.attachments.size > 0
      ? Array.from(message.attachments.values()).map(a => ({
          url: a.url,
          name: a.name,
          contentType: a.contentType,
        }))
      : null;

    // Add message to ticket
    const savedMessage = await addMessageToTicket(
      ticket.id,
      message.content || '[Attachment]',
      message.id,
      attachments
    );

    if (savedMessage) {
      // Send confirmation to user
      await sendConfirmation(message.channel, ticket);

      // Notify staff
      await notifyStaff(
        ticket,
        message.content || '[Attachment]',
        message.author.username,
        message.author.displayAvatarURL()
      );

      console.log(`[SUCCESS] Message added to ticket ${ticket.id}`);
    } else {
      await message.channel.send('❌ Failed to save your message. Please try again or use `/support` to create a new ticket.');
    }
  } catch (error) {
    console.error('Error handling DM:', error);
    await message.channel.send('❌ An error occurred. Please try again later.');
  }
});

// Bot ready
client.once('ready', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🟢 Eclipse Support Bot is online!`);
  console.log(`   Logged in as: ${client.user.tag}`);
  console.log(`   Listening for DMs...`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Login
client.login(DISCORD_TOKEN);
