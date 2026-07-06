import { sendBotMessage, type DiscordEmbed } from '../_shared/discord-bot.ts';
import { requireServiceRole } from "../_shared/auth-guard.ts";

const FREE_GAMES_CHANNEL_ID = '1482478628062367926';
const FREE_GAMES_PING_ROLE_ID = '1482480973726744660';

interface FreeGameInfo {
  name: string;
  storeUrl: string;
  description: string;
  genre: string;
  rating: string;
  imageUrl: string;
  storeName: string;
  freeUntil: string;
  developer: string;
}

const FREE_GAMES: Record<string, FreeGameInfo> = {
  'cozy-grove': {
    name: 'Cozy Grove',
    storeUrl: 'https://store.epicgames.com/en-US/p/cozy-grove',
    description: 'Welcome to Cozy Grove, a life-sim game about camping on a haunted, ever-changing island. As a Spirit Scout, you\'ll wander the island\'s forest each day, finding new hidden secrets and helping soothe the local ghosts. With a little time and a lot of crafting, you\'ll bring color and joy back to Cozy Grove!',
    genre: 'Casual, Indie, Simulation',
    rating: '4.6/5 ⭐',
    imageUrl: 'https://cdn2.unrealengine.com/egs-cozygrove-spryfox-g1a-01-1920x1080-5dd6ef920da1.jpg',
    storeName: 'Epic Games Store',
    freeUntil: 'March 20, 2026',
    developer: 'Spry Fox',
  },
  'isonzo': {
    name: 'Isonzo',
    storeUrl: 'https://store.epicgames.com/en-US/p/isonzo',
    description: 'Ferocious Alpine warfare will test your tactical skills in this authentic WW1 FPS. Battle among the scenic peaks, rugged valleys and idyllic towns of northern Italy. Take part in historical offensives and fight through vastly different landscapes — from hillside fortresses to mountain trenches and fierce urban combat.',
    genre: 'Action, Shooter, Strategy',
    rating: '4.5/5 ⭐',
    imageUrl: 'https://cdn2.unrealengine.com/egs-isonzo-blackmillgames-g1c-00-1920x1080-bc2386257b9e.jpg',
    storeName: 'Epic Games Store',
    freeUntil: 'March 20, 2026',
    developer: 'BlackMill Games',
  },
  'deponia': {
    name: 'Deponia',
    storeUrl: 'https://store.steampowered.com/app/214340/Deponia/',
    description: 'In Deponia, the world has degenerated into a vast garbage dump, in which the crotchety Rufus ekes out his sorry existence. He dreams of a better life in the floating city of Elysium — but has no idea how explosive his plans to get there will turn out to be in this beautifully hand-drawn point-and-click comedy adventure.',
    genre: 'Adventure, Point & Click, Comedy, Puzzle',
    rating: 'Very Positive (86% recent)',
    imageUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/214340/ss_5f5dd80ad681eb78c05e1e8a75be9a99facb1deb.1920x1080.jpg?t=1772651228',
    storeName: 'Steam',
    freeUntil: 'March 16, 2026',
    developer: 'Daedalic Entertainment',
  },
};

function buildGameEmbed(game: FreeGameInfo): DiscordEmbed {
  return {
    title: `🎁 FREE GAME: ${game.name}`,
    description: game.description,
    color: 0x00FF00,
    url: game.storeUrl,
    fields: [
      { name: '🎮 Genre', value: game.genre, inline: true },
      { name: '📊 Rating', value: game.rating, inline: true },
      { name: '🏗️ Developer', value: game.developer, inline: true },
      { name: '🏪 Store', value: `[${game.storeName}](${game.storeUrl})`, inline: true },
      { name: '⏰ Free Until', value: game.freeUntil, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '🔗 Claim Now', value: `**[Get it FREE →](${game.storeUrl})**`, inline: false },
    ],
    image: { url: game.imageUrl },
    footer: { text: `Free on ${game.storeName} • Claim before it's gone!` },
    timestamp: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
  const _unauth = requireServiceRole(req);
  if (_unauth) return _unauth;
,
    });
  }

  try {
    let gameKey = 'cozy-grove';
    try {
      const body = await req.json();
      if (body?.game) gameKey = body.game;
    } catch { /* default */ }

    const game = FREE_GAMES[gameKey];
    if (!game) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown game: ${gameKey}. Available: ${Object.keys(FREE_GAMES).join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-free-game-alert] Sending alert for: ${game.name}`);

    const embed = buildGameEmbed(game);
    const result = await sendBotMessage(FREE_GAMES_CHANNEL_ID, {
      content: `🎉 **Free Game Alert!**\n<@&${FREE_GAMES_PING_ROLE_ID}>`,
      embeds: [embed],
      allowed_mentions: {
        roles: [FREE_GAMES_PING_ROLE_ID],
      },
    });

    if (!result.success) {
      console.error('[send-free-game-alert] Failed:', result.error);
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-free-game-alert] Sent ${game.name}, messageId: ${result.messageId}`);
    return new Response(
      JSON.stringify({ success: true, game: game.name, messageId: result.messageId }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-free-game-alert] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
