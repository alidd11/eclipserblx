import { sendBotMessage, type DiscordEmbed } from '../_shared/discord-bot.ts';
import { handleCors, jsonOk, jsonError } from '../_shared/edge-response.ts';

const FREE_GAMES_CHANNEL_ID = '1482478628062367926';
const FREE_GAMES_PING_ROLE_ID = '1482480973726744660';

interface FreeGameInfo {
  name: string;
  storeUrl: string;
  description: string;
  genre: string;
  rating: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  storeName: string;
  freeUntil?: string;
}

const FREE_GAMES: Record<string, FreeGameInfo> = {
  'cozy-grove': {
    name: 'Cozy Grove',
    storeUrl: 'https://store.epicgames.com/en-US/p/cozy-grove',
    description: 'Welcome to Cozy Grove, a life-sim game about camping on a haunted island! As a Spirit Scout, it\'s your job to help the local ghost bears by finding their lost belongings and fulfilling their wishes. With each spirit you soothe, your island grows and becomes more colourful and lively.',
    genre: 'Simulation, Adventure, Casual',
    rating: '4.2/5 ⭐',
    imageUrl: 'https://cdn2.unrealengine.com/egs-cozygrove-spryfoximc-g1a-00-1920x1080-ab72f4d0db52.jpg',
    thumbnailUrl: 'https://cdn2.unrealengine.com/egs-cozygrove-spryfoximc-ic1-400x400-b7a8c7e3f1f0.png',
    storeName: 'Epic Games Store',
    freeUntil: 'March 20, 2026',
  },
  'turnip-boy': {
    name: 'Turnip Boy Robs a Bank',
    storeUrl: 'https://store.epicgames.com/en-US/p/turnip-boy-robs-a-bank',
    description: 'Join Turnip Boy in this action-packed roguelike adventure! Team up with the fearsome Pickled Gang to plan and execute the heist of the century. Shake down hostages, dig through dirt, battle the fuzz, and use wacky weapons to pull off the ultimate bank robbery!',
    genre: 'Action, Roguelike, Adventure',
    rating: '4.5/5 ⭐',
    imageUrl: 'https://cdn2.unrealengine.com/egs-turnipboyrobsabank-snoozykazoo-g1a-00-1920x1080-c67c8f2e8e55.jpg',
    thumbnailUrl: 'https://cdn2.unrealengine.com/egs-turnipboyrobsabank-snoozykazoo-ic1-400x400-2f78d4f6e5f0.png',
    storeName: 'Epic Games Store',
    freeUntil: 'March 20, 2026',
  },
};

function buildGameEmbed(game: FreeGameInfo): DiscordEmbed {
  const fields = [
    { name: '🎮 Genre', value: game.genre, inline: true },
    { name: '🏪 Store', value: `[${game.storeName}](${game.storeUrl})`, inline: true },
  ];

  if (game.rating) {
    fields.push({ name: '📊 Rating', value: game.rating, inline: true });
  }

  if (game.freeUntil) {
    fields.push({ name: '⏰ Free Until', value: game.freeUntil, inline: true });
  }

  fields.push({ name: '🔗 Claim Now', value: `**[Get it FREE →](${game.storeUrl})**`, inline: false });

  return {
    title: `🎁 FREE GAME: ${game.name}`,
    description: game.description,
    color: 0x00FF00, // Green for free
    url: game.storeUrl,
    fields,
    image: { url: game.imageUrl },
    thumbnail: { url: game.thumbnailUrl },
    footer: { text: `Free on ${game.storeName} • Claim before it\'s gone!` },
    timestamp: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    let gameKey = 'cozy-grove';

    try {
      const body = await req.json();
      if (body?.game) gameKey = body.game;
    } catch {
      // Default to cozy-grove
    }

    const game = FREE_GAMES[gameKey];
    if (!game) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown game: ${gameKey}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-free-game-alert] Sending alert for: ${game.name}`);

    const embed = buildGameEmbed(game);

    const result = await sendBotMessage(FREE_GAMES_CHANNEL_ID, {
      content: `<@&${FREE_GAMES_PING_ROLE_ID}> 🎉 **Free game alert!**`,
      embeds: [embed],
      allowed_mentions: {
        parse: ['roles'],
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

    console.log(`[send-free-game-alert] Sent ${game.name} successfully, messageId: ${result.messageId}`);
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
