import { createClient } from "npm:@supabase/supabase-js@2";
import { verify } from "npm:discord-verify@1.2.0";
import {
  handle8Ball,
  handleCoinFlip,
  handleDiceRoll,
  handleRPS,
  handleJoke,
  handleQuote,
  handleFunFact,
  handleCompliment,
  handleRoast,
  calculateDailyReward,
  getXPProgress,
  getLevelEmoji,
} from "../_shared/fun-commands.ts";

// Discord Fun Bot - Separate bot for games, XP, and entertainment commands
// Secrets needed: DISCORD_FUN_BOT_PUBLIC_KEY, DISCORD_FUN_BOT_TOKEN

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature-ed25519, x-signature-timestamp",
};

interface DiscordInteraction {
  type: number;
  id: string;
  token: string;
  data?: {
    name: string;
    options?: Array<{
      name: string;
      value: string;
      type: number;
    }>;
  };
  member?: {
    user: {
      id: string;
      username: string;
      global_name?: string;
      avatar?: string;
    };
  };
  user?: {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
  };
  guild_id?: string;
}

// Interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;

// Response types
const PONG = 1;
const CHANNEL_MESSAGE = 4;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify Discord signature
    const signature = req.headers.get("x-signature-ed25519");
    const timestamp = req.headers.get("x-signature-timestamp");
    const body = await req.text();

    if (!signature || !timestamp) {
      return new Response("Invalid request signature", { status: 401, headers: corsHeaders });
    }

    const publicKey = Deno.env.get("DISCORD_FUN_BOT_PUBLIC_KEY");
    
    if (!publicKey) {
      console.error("[discord-fun-bot] DISCORD_FUN_BOT_PUBLIC_KEY not configured");
      return new Response("Bot not configured", { status: 500, headers: corsHeaders });
    }
    
    try {
      const isValid = await verify(body, signature, timestamp, publicKey, crypto.subtle);
      if (!isValid) {
        console.log("[discord-fun-bot] Invalid signature");
        return new Response("Invalid request signature", { status: 401, headers: corsHeaders });
      }
    } catch (verifyError) {
      console.error("[discord-fun-bot] Signature verification error:", verifyError);
      return new Response("Signature verification failed", { status: 401, headers: corsHeaders });
    }

    const interaction: DiscordInteraction = JSON.parse(body);
    console.log(`[discord-fun-bot] Received interaction type ${interaction.type}:`, interaction.data?.name);

    // Handle Discord's verification ping
    if (interaction.type === PING) {
      return new Response(JSON.stringify({ type: PONG }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle slash commands
    if (interaction.type === APPLICATION_COMMAND && interaction.data) {
      const commandName = interaction.data.name;
      const discordUser = interaction.member?.user || interaction.user;

      if (!discordUser) {
        return interactionResponse("Unable to identify Discord user.", true);
      }

      const discordUserId = discordUser.id;
      const discordUsername = discordUser.global_name || discordUser.username;
      
      // Build Discord avatar URL
      let discordAvatarUrl: string | undefined;
      if (discordUser.avatar) {
        const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
        discordAvatarUrl = `https://cdn.discordapp.com/avatars/${discordUserId}/${discordUser.avatar}.${ext}?size=128`;
      } else {
        const defaultIndex = (BigInt(discordUserId) >> BigInt(22)) % BigInt(6);
        discordAvatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
      }

      switch (commandName) {
        // ==================== GAMES ====================
        case "8ball":
          return handleMagic8BallCommand(interaction, discordUsername, discordAvatarUrl);

        case "coinflip":
          return handleCoinFlipCommand(discordUsername, discordAvatarUrl);

        case "roll":
          return handleDiceRollCommand(interaction, discordUsername, discordAvatarUrl);

        case "rps":
          return handleRPSCommand(interaction, discordUsername, discordAvatarUrl);

        // ==================== DAILY REWARDS & XP ====================
        case "daily":
          return await handleDailyCommand(supabase, discordUserId, discordUsername, discordAvatarUrl);

        case "level":
          return await handleLevelCommand(supabase, interaction, discordUserId, discordUsername, discordAvatarUrl);

        case "leaderboard":
          return await handleLeaderboardCommand(supabase, discordAvatarUrl);

        case "streak":
          return await handleStreakCommand(supabase, discordUserId, discordUsername, discordAvatarUrl);

        // ==================== FUN RESPONSES ====================
        case "joke":
          return handleJokeCommand(discordAvatarUrl);

        case "quote":
          return handleQuoteCommand(discordAvatarUrl);

        case "funfact":
          return handleFunFactCommand(discordAvatarUrl);

        case "compliment":
          return handleComplimentCommand(interaction, discordUserId, discordUsername, discordAvatarUrl);

        case "roast":
          return handleRoastCommand(interaction, discordUserId, discordUsername, discordAvatarUrl);

        default:
          return interactionResponse(`Unknown command: ${commandName}`, true);
      }
    }

    return new Response(JSON.stringify({ type: PONG }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[discord-fun-bot] Error:", error);
    return interactionResponse("An error occurred. Please try again later.", true);
  }
});

function interactionResponse(content: string, ephemeral = false, embeds?: any[]) {
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: {
        content: embeds ? undefined : content,
        embeds,
        flags: ephemeral ? 64 : 0,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// ==================== COMMAND HANDLERS ====================

// /8ball command
function handleMagic8BallCommand(
  interaction: DiscordInteraction,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const question = interaction.data?.options?.find(o => o.name === "question")?.value || "No question?";
  const result = handle8Ball(question);
  
  const embed = {
    color: result.color,
    title: "🎱 Magic 8-Ball",
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: [
      { name: "❓ Question", value: question, inline: false },
      { name: `${result.emoji} Answer`, value: `**${result.response}**`, inline: false },
    ],
    footer: { text: `Asked by ${discordUsername}` },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /coinflip command
function handleCoinFlipCommand(discordUsername: string, discordAvatarUrl?: string) {
  const result = handleCoinFlip();
  
  const embed = {
    color: result.result === "Heads" ? 0xfbbf24 : 0x8b5cf6,
    title: `${result.emoji} Coin Flip`,
    description: `The coin landed on **${result.result}**!`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: { text: `Flipped by ${discordUsername}` },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /roll command
function handleDiceRollCommand(
  interaction: DiscordInteraction,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const sides = Number(interaction.data?.options?.find(o => o.name === "sides")?.value) || 6;
  const count = Number(interaction.data?.options?.find(o => o.name === "count")?.value) || 1;
  const result = handleDiceRoll(sides, count);
  
  const diceEmoji = sides === 6 ? "🎲" : "🎯";
  
  const embed = {
    color: 0x3b82f6,
    title: `${diceEmoji} Dice Roll`,
    description: count === 1 
      ? `You rolled a **${result.total}**!`
      : `You rolled: **${result.rolls.join(" + ")} = ${result.total}**`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: count > 1 ? [
      { name: "Dice", value: `${count}d${sides}`, inline: true },
      { name: "Total", value: `**${result.total}**`, inline: true },
    ] : [],
    footer: { text: `Rolled by ${discordUsername}` },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /rps command
function handleRPSCommand(
  interaction: DiscordInteraction,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const userChoice = interaction.data?.options?.find(o => o.name === "choice")?.value || "rock";
  const result = handleRPS(userChoice);
  
  const emojis: Record<string, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };
  
  let color: number;
  let resultText: string;
  
  if (result.result === "win") {
    color = 0x22c55e;
    resultText = "🎉 **You Win!**";
  } else if (result.result === "lose") {
    color = 0xef4444;
    resultText = "😢 **You Lose!**";
  } else {
    color = 0xeab308;
    resultText = "🤝 **It's a Tie!**";
  }
  
  const embed = {
    color,
    title: "✊ Rock Paper Scissors",
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: [
      { name: "Your Choice", value: `${emojis[result.userChoice]} ${result.userChoice.charAt(0).toUpperCase() + result.userChoice.slice(1)}`, inline: true },
      { name: "Bot's Choice", value: `${result.emoji} ${result.botChoice.charAt(0).toUpperCase() + result.botChoice.slice(1)}`, inline: true },
      { name: "Result", value: resultText, inline: false },
    ],
    footer: { text: `Played by ${discordUsername}` },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /daily command
async function handleDailyCommand(
  supabase: any,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if already claimed today
  const { data: todayClaim } = await supabase
    .from("discord_daily_claims")
    .select("*")
    .eq("discord_id", discordUserId)
    .eq("claimed_at", today)
    .maybeSingle();
  
  if (todayClaim) {
    const embed = {
      color: 0xef4444,
      title: "❌ Already Claimed",
      description: "You've already claimed your daily reward today!\n\nCome back tomorrow for more XP!",
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: "Eclipse Community XP" },
      timestamp: new Date().toISOString(),
    };
    
    return interactionResponse("", true, [embed]);
  }
  
  // Get yesterday's claim for streak calculation
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const { data: yesterdayClaim } = await supabase
    .from("discord_daily_claims")
    .select("streak_day")
    .eq("discord_id", discordUserId)
    .eq("claimed_at", yesterdayStr)
    .maybeSingle();
  
  const currentStreak = yesterdayClaim ? yesterdayClaim.streak_day + 1 : 1;
  const reward = calculateDailyReward(currentStreak);
  
  // Record the claim
  await supabase
    .from("discord_daily_claims")
    .insert({
      discord_id: discordUserId,
      claimed_at: today,
      xp_earned: reward.totalXP,
      streak_day: currentStreak,
      bonus_earned: reward.streakBonus + (reward.milestoneBonus?.amount || 0),
    });
  
  // Add XP to user
  await supabase.rpc("add_discord_xp", {
    p_discord_id: discordUserId,
    p_discord_username: discordUsername,
    p_xp_amount: reward.totalXP,
  });
  
  // Update streak in discord_xp table
  await supabase
    .from("discord_xp")
    .update({ 
      current_streak: currentStreak,
      longest_streak: currentStreak,
    })
    .eq("discord_id", discordUserId);
  
  let description = `You earned **+${reward.baseXP} XP** base reward!`;
  if (reward.streakBonus > 0) {
    description += `\n🔥 **+${reward.streakBonus} XP** streak bonus (Day ${currentStreak})`;
  }
  if (reward.milestoneBonus) {
    description += `\n\n${reward.milestoneBonus.type}\n🏆 **+${reward.milestoneBonus.amount} XP** milestone bonus!`;
  }
  description += `\n\n**Total: +${reward.totalXP} XP**`;
  
  const embed = {
    color: 0x22c55e,
    title: "✅ Daily Reward Claimed!",
    description,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: [
      { name: "🔥 Current Streak", value: `${currentStreak} days`, inline: true },
    ],
    footer: { text: "Eclipse Community XP • Claim again tomorrow!" },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /level command
async function handleLevelCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const targetUser = interaction.data?.options?.find(o => o.name === "user");
  const lookupId = targetUser?.value || discordUserId;
  
  const { data: xpData } = await supabase
    .from("discord_xp")
    .select("*")
    .eq("discord_id", lookupId)
    .maybeSingle();
  
  if (!xpData) {
    const embed = {
      color: 0xef4444,
      title: "❌ No XP Data",
      description: targetUser 
        ? "This user hasn't earned any XP yet!"
        : "You haven't earned any XP yet!\n\nUse `/daily` to claim your first daily reward!",
      thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
      footer: { text: "Eclipse Community XP" },
    };
    
    return interactionResponse("", true, [embed]);
  }
  
  const progress = getXPProgress(xpData.total_xp, xpData.level);
  const levelEmoji = getLevelEmoji(xpData.level);
  
  const embed = {
    color: 0x8b5cf6,
    title: `${levelEmoji} Level ${xpData.level}`,
    description: `**${xpData.discord_username || "User"}**`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: [
      { name: "📊 Total XP", value: `${xpData.total_xp.toLocaleString()} XP`, inline: true },
      { name: "🔥 Streak", value: `${xpData.current_streak || 0} days`, inline: true },
      { name: "🎮 Commands Used", value: `${xpData.commands_used || 0}`, inline: true },
      { name: "📈 Progress to Next Level", value: `${progress.progressBar}\n${Math.round(progress.progress)}% complete`, inline: false },
    ],
    footer: { text: "Eclipse Community XP" },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /leaderboard command
async function handleLeaderboardCommand(supabase: any, discordAvatarUrl?: string) {
  const { data: topUsers } = await supabase
    .from("discord_xp")
    .select("discord_username, total_xp, level")
    .order("total_xp", { ascending: false })
    .limit(10);
  
  if (!topUsers || topUsers.length === 0) {
    return interactionResponse("No one has earned XP yet! Be the first with `/daily`!", true);
  }
  
  const medals = ["🥇", "🥈", "🥉"];
  let leaderboardText = "";
  
  topUsers.forEach((user: any, index: number) => {
    const medal = medals[index] || `**${index + 1}.**`;
    leaderboardText += `${medal} **${user.discord_username || "Unknown"}** - Level ${user.level} (${user.total_xp.toLocaleString()} XP)\n`;
  });
  
  const embed = {
    color: 0xfbbf24,
    title: "🏆 XP Leaderboard",
    description: leaderboardText,
    footer: { text: "Eclipse Community XP • Top 10 Users" },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /streak command
async function handleStreakCommand(
  supabase: any,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const { data: xpData } = await supabase
    .from("discord_xp")
    .select("current_streak, longest_streak")
    .eq("discord_id", discordUserId)
    .maybeSingle();
  
  const currentStreak = xpData?.current_streak || 0;
  const longestStreak = xpData?.longest_streak || 0;
  
  // Check if claimed today
  const today = new Date().toISOString().split('T')[0];
  const { data: todayClaim } = await supabase
    .from("discord_daily_claims")
    .select("id")
    .eq("discord_id", discordUserId)
    .eq("claimed_at", today)
    .maybeSingle();
  
  const claimedToday = !!todayClaim;
  
  let fireEmojis = "";
  for (let i = 0; i < Math.min(currentStreak, 10); i++) {
    fireEmojis += "🔥";
  }
  if (currentStreak > 10) fireEmojis += `+${currentStreak - 10}`;
  
  const embed = {
    color: currentStreak > 0 ? 0xf97316 : 0x6b7280,
    title: "🔥 Daily Streak",
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: [
      { name: "Current Streak", value: fireEmojis || "No streak yet", inline: true },
      { name: "Longest Streak", value: `${longestStreak} days`, inline: true },
      { name: "Today's Status", value: claimedToday ? "✅ Claimed" : "❌ Not claimed - use `/daily`!", inline: false },
    ],
    footer: { text: `${discordUsername} • Eclipse Community XP` },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /joke command
function handleJokeCommand(discordAvatarUrl?: string) {
  const joke = handleJoke();
  
  const embed = {
    color: 0xfbbf24,
    title: "😂 Random Joke",
    fields: [
      { name: joke.setup, value: `||${joke.punchline}||`, inline: false },
    ],
    footer: { text: "Eclipse Fun" },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /quote command
function handleQuoteCommand(discordAvatarUrl?: string) {
  const quote = handleQuote();
  
  const embed = {
    color: 0x8b5cf6,
    title: "💬 Inspirational Quote",
    description: `*"${quote.text}"*\n\n— **${quote.author}**`,
    footer: { text: "Eclipse Fun" },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /funfact command
function handleFunFactCommand(discordAvatarUrl?: string) {
  const fact = handleFunFact();
  
  const embed = {
    color: 0x3b82f6,
    title: "🧠 Fun Fact",
    description: fact,
    footer: { text: "Eclipse Fun • Did you know?" },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /compliment command
function handleComplimentCommand(
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const targetUser = interaction.data?.options?.find(o => o.name === "user");
  const compliment = handleCompliment();
  
  const mentionTarget = targetUser ? `<@${targetUser.value}>` : `<@${discordUserId}>`;
  
  const embed = {
    color: 0x22c55e,
    title: "💖 Compliment",
    description: `${mentionTarget}\n\n${compliment}`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: { text: targetUser ? `From ${discordUsername}` : "Eclipse Fun" },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// /roast command (friendly)
function handleRoastCommand(
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const targetUser = interaction.data?.options?.find(o => o.name === "user");
  const roast = handleRoast();
  
  const mentionTarget = targetUser ? `<@${targetUser.value}>` : `<@${discordUserId}>`;
  
  const embed = {
    color: 0xf97316,
    title: "🔥 Friendly Roast",
    description: `${mentionTarget}\n\n${roast}`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: { text: `${targetUser ? `From ${discordUsername} • ` : ""}All in good fun! 😄` },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
