import { EmbedBuilder } from 'discord.js';
import { supabase } from '../supabase.js';
import { ECLIPSE_COLOR } from '../config.js';

// In-memory cache to reduce DB queries
const afkCache = new Map(); // discord_user_id -> { reason, set_at, guild_id }
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 seconds

async function refreshCache() {
  if (Date.now() - cacheTimestamp < CACHE_TTL) return;
  try {
    const { data } = await supabase.from('bot_afk_status').select('*');
    afkCache.clear();
    (data || []).forEach(row => {
      const key = `${row.discord_user_id}:${row.guild_id || 'global'}`;
      afkCache.set(key, row);
    });
    cacheTimestamp = Date.now();
  } catch (err) {
    console.error('[AFK] Cache refresh error:', err.message);
  }
}

function getAfkStatus(userId, guildId) {
  return afkCache.get(`${userId}:${guildId}`) || afkCache.get(`${userId}:global`);
}

export async function handleAfkListener(message) {
  if (message.author.bot || !message.guild) return;

  await refreshCache();

  // Check if the author is AFK — clear their status
  const authorAfk = getAfkStatus(message.author.id, message.guild.id);
  if (authorAfk) {
    try {
      await supabase
        .from('bot_afk_status')
        .delete()
        .eq('discord_user_id', message.author.id);

      afkCache.delete(`${message.author.id}:${message.guild.id}`);
      afkCache.delete(`${message.author.id}:global`);
      cacheTimestamp = 0; // invalidate cache

      await message.reply({
        embeds: [new EmbedBuilder()
          .setColor(ECLIPSE_COLOR)
          .setDescription(`👋 Welcome back, **${message.author.username}**! Your AFK status has been removed.`)],
        allowedMentions: { repliedUser: false },
      });
    } catch (err) {
      console.error('[AFK] Error clearing status:', err.message);
    }
  }

  // Check if any mentioned user is AFK
  const mentions = message.mentions.users;
  if (mentions.size === 0) return;

  for (const [userId, user] of mentions) {
    const afkStatus = getAfkStatus(userId, message.guild.id);
    if (afkStatus) {
      const setAt = new Date(afkStatus.set_at);
      const timestamp = Math.floor(setAt.getTime() / 1000);

      await message.reply({
        embeds: [new EmbedBuilder()
          .setColor(ECLIPSE_COLOR)
          .setTitle('💤 User is AFK')
          .setDescription(`**${user.username}** is currently AFK.`)
          .addFields(
            { name: 'Reason', value: afkStatus.reason || 'AFK', inline: true },
            { name: 'Since', value: `<t:${timestamp}:R>`, inline: true },
          )
          .setTimestamp()],
        allowedMentions: { repliedUser: false },
      });
      break; // Only respond to first AFK mention to avoid spam
    }
  }
}
