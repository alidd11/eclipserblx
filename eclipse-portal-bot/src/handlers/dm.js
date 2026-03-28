import { EmbedBuilder } from 'discord.js';
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

  console.log(`[DM] ${message.author.tag}: ${message.content}`);

  try {
    const ticket = await findOpenTicket(message.author.id);

    if (!ticket) {
      const embed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('❌ No Open Ticket')
        .setDescription("You don't have an open support ticket. To create one, use the `/support` command in the Eclipse Discord server.")
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
              footer: { text: `Ticket ID: ${ticket.id.substring(0, 8)}`, icon_url: ECLIPSE_ICON },
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      } catch (e) { console.error('Error notifying staff:', e); }
    }

    console.log(`[SUCCESS] Message added to ticket ${ticket.id}`);
  } catch (error) {
    console.error('Error handling DM:', error);
    await message.channel.send('❌ An error occurred. Please try again later.');
  }
}
