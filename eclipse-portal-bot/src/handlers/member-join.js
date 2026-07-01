import { EmbedBuilder } from 'discord.js';
import { supabase } from '../supabase.js';
import { ECLIPSE_COLOR, ECLIPSE_ICON, config } from '../config.js';
import { sendOrionWebhook } from '../utils/orion-webhook.js';

export async function handleMemberJoin(member) {
  if (member.user.bot) return;

  console.log(`[JOIN] ${member.user.tag} joined ${member.guild.name} (${member.guild.id})`);

  // Fire-and-forget Orion notification. Runs alongside existing welcome flow.
  sendOrionWebhook('member_join', {
    guild: member.guild.name,
    member_id: String(member.id),
    member_count_now: member.guild.memberCount ?? 0,
  });


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
        `Hey **${member.user.username}**! Welcome to **${member.guild.name}**!\n\n` +
        `This server is powered by **${store.name}** on Eclipse Marketplace. ` +
        `Check out their products and explore the marketplace below!`
      );
      embed.addFields(
        { name: '🛍️ Visit Store', value: `[Browse ${store.name}](${siteUrl}/store/${store.slug})`, inline: true },
        { name: '🏪 Marketplace', value: `[Explore All Products](${siteUrl}/products)`, inline: true },
        { name: '🔗 Link Your Account', value: 'Use `/link` in this server to connect your Discord to Eclipse and access your purchases!', inline: false },
      );
      if (store.logo_url) embed.setThumbnail(store.logo_url);
    } else {
      embed.setDescription(
        `Hey **${member.user.username}**! Welcome to **${member.guild.name}**!\n\n` +
        `Eclipse is the ultimate marketplace for Roblox scripts, bots, and digital products. ` +
        `Here are some links to get you started!`
      );
      embed.addFields(
        { name: '🏪 Marketplace', value: `[Browse Products](${siteUrl}/products)`, inline: true },
        { name: '📖 Get Started', value: `[Create Account](${siteUrl}/auth)`, inline: true },
        { name: '💬 Commands', value: 'Use `/help` to see all available commands!', inline: false },
      );
    }

    embed.setFooter({ text: 'Eclipse Marketplace', iconURL: ECLIPSE_ICON });
    await member.send({ embeds: [embed] }).catch(() => {});
    console.log(`[WELCOME] Sent welcome DM to ${member.user.tag}`);

    // Check for store welcome embed (channel-based)
    if (store) {
      try {
        const { data: welcomeEmbed } = await supabase
          .from('store_welcome_embeds')
          .select('*')
          .eq('store_id', store.id)
          .eq('enabled', true)
          .maybeSingle();

        if (welcomeEmbed && welcomeEmbed.channel_id) {
          const channel = member.guild.channels.cache.get(welcomeEmbed.channel_id);
          if (channel) {
            const desc = (welcomeEmbed.description || '')
              .replace(/\{user\}/g, member.user.username)
              .replace(/\{server\}/g, member.guild.name);

            const channelEmbed = new EmbedBuilder()
              .setTitle(welcomeEmbed.title || 'Welcome!')
              .setDescription(desc)
              .setColor(parseInt((welcomeEmbed.color || '#7C3AED').replace('#', ''), 16))
              .setTimestamp();

            if (welcomeEmbed.thumbnail_url) channelEmbed.setThumbnail(welcomeEmbed.thumbnail_url);
            if (welcomeEmbed.image_url) channelEmbed.setImage(welcomeEmbed.image_url);
            if (welcomeEmbed.footer_text) channelEmbed.setFooter({ text: welcomeEmbed.footer_text });

            const fields = welcomeEmbed.fields || [];
            if (Array.isArray(fields)) {
              fields.forEach(f => {
                if (f.name && f.value) {
                  channelEmbed.addFields({ name: f.name, value: f.value, inline: !!f.inline });
                }
              });
            }

            await channel.send({ content: `Welcome <@${member.id}>!`, embeds: [channelEmbed] });
            console.log(`[WELCOME] Sent channel welcome embed for ${member.user.tag}`);
          }
        }
      } catch (err) {
        console.error('[WELCOME] Channel embed error:', err.message);
      }
    }
    console.log(`[WELCOME] Sent welcome DM to ${member.user.tag}`);
  } catch (error) {
    if (error.code === 50007) {
      console.log(`[WELCOME] Cannot send DM to ${member.user.tag} (DMs disabled)`);
    } else {
      console.error('[WELCOME] Error:', error);
    }
  }
}
