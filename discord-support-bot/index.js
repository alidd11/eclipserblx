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

// Handle new member joins - send welcome DM + channel welcome
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;

  console.log(`[JOIN] ${member.user.tag} joined ${member.guild.name} (${member.guild.id})`);

  // Send a plain text welcome in the welcome channel after 1 minute
  const WELCOME_CHANNEL_ID = '1461353041310781531';
  setTimeout(async () => {
    try {
      const welcomeChannel = await client.channels.fetch(WELCOME_CHANNEL_ID);
      if (welcomeChannel) {
        await welcomeChannel.send(`👋 Welcome to the server, <@${member.user.id}>! We're glad to have you here!`);
        console.log(`[WELCOME] Sent channel welcome for ${member.user.tag}`);
      }
    } catch (err) {
      console.error(`[WELCOME] Failed to send channel welcome for ${member.user.tag}:`, err);
    }
  }, 60_000); // 1 minute delay

  try {
    // Check if this guild is linked to a store
    const { data: store } = await supabase
      .from('stores')
      .select('id, name, slug, description, logo_url')
      .eq('discord_guild_id', member.guild.id)
      .eq('status', 'approved')
      .maybeSingle();

    const siteUrl = process.env.SITE_URL || 'https://eclipserblx.com';

    const embed = new EmbedBuilder()
      .setColor(ECLIPSE_COLOR)
      .setTitle('👋 Welcome to Eclipse!')
      .setThumbnail(ECLIPSE_ICON)
      .setTimestamp();

    if (store) {
      // Server is linked to a seller store — personalized welcome
      embed.setDescription(
        `Hey **${member.user.username}**! Welcome to **${member.guild.name}**!\n\n` +
        `This server is powered by **${store.name}** on Eclipse Marketplace. ` +
        `Check out their products and explore the marketplace below!`
      );
      embed.addFields(
        {
          name: '🛍️ Visit Store',
          value: `[Browse ${store.name}](${siteUrl}/store/${store.slug})`,
          inline: true,
        },
        {
          name: '🏪 Marketplace',
          value: `[Explore All Products](${siteUrl}/products)`,
          inline: true,
        },
        {
          name: '🔗 Link Your Account',
          value: `Use \`/link\` in this server to connect your Discord to Eclipse and access your purchases!`,
          inline: false,
        }
      );
      if (store.logo_url) {
        embed.setThumbnail(store.logo_url);
      }
    } else {
      // Generic Eclipse server welcome
      embed.setDescription(
        `Hey **${member.user.username}**! Welcome to **${member.guild.name}**!\n\n` +
        `Eclipse is the ultimate marketplace for Roblox scripts, bots, and digital products. ` +
        `Here are some links to get you started!`
      );
      embed.addFields(
        {
          name: '🏪 Marketplace',
          value: `[Browse Products](${siteUrl}/products)`,
          inline: true,
        },
        {
          name: '📖 Get Started',
          value: `[Create Account](${siteUrl}/auth)`,
          inline: true,
        },
        {
          name: '💬 Commands',
          value: `Use \`/help\` to see all available commands!`,
          inline: false,
        }
      );
    }

    embed.setFooter({ text: 'Eclipse Marketplace', iconURL: ECLIPSE_ICON });

    await member.send({ embeds: [embed] });
    console.log(`[WELCOME] Sent welcome DM to ${member.user.tag}`);
  } catch (error) {
    // DMs might be disabled — this is non-fatal
    if (error.code === 50007) {
      console.log(`[WELCOME] Cannot send DM to ${member.user.tag} (DMs disabled)`);
    } else {
      console.error(`[WELCOME] Error sending welcome DM:`, error);
    }
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
