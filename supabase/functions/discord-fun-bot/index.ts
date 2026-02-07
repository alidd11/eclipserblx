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
  handleDebug,
  handleCommit,
  handleCodeReview,
  handleStackOverflow,
  handleRubberDuck,
  handleFishing,
  handleMeme,
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
  application_id?: string;
  channel_id?: string;
  message?: {
    id: string;
    interaction_metadata?: {
      id: string;
    };
  };
  data?: {
    name: string;
    custom_id?: string;
    component_type?: number;
    values?: string[];
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
const MESSAGE_COMPONENT = 3;

// Response types
const PONG = 1;
const CHANNEL_MESSAGE = 4;
const DEFERRED_UPDATE = 6;
const UPDATE_MESSAGE = 7;

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

      // Restrict commands to specific channel
      const ALLOWED_CHANNEL_ID = "1461353045945221265";
      if (interaction.channel_id && interaction.channel_id !== ALLOWED_CHANNEL_ID) {
        return interactionResponse(`❌ Fun commands can only be used in <#${ALLOWED_CHANNEL_ID}>!`, true);
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
        // ==================== HELP ====================
        case "help":
          return handleHelpCommand(discordAvatarUrl);

        // ==================== GAMES ====================
        case "8ball":
          return handleMagic8BallCommand(interaction, discordUsername, discordAvatarUrl);

        case "coinflip":
          return handleCoinFlipCommand(discordUsername, discordAvatarUrl);

        case "roll":
          return handleDiceRollCommand(interaction, discordUsername, discordAvatarUrl);

        case "rps":
          return handleRPSCommand(interaction, discordUsername, discordAvatarUrl);

        // ==================== MULTIPLAYER GAMES ====================
        case "duel":
          return await handleDuelCommand(supabase, interaction, discordUserId, discordUsername, discordAvatarUrl);

        case "trivia":
          return await handleTriviaCommand(supabase, interaction, discordUserId, discordUsername, discordAvatarUrl);

        case "tictactoe":
          return await handleTicTacToeCommand(supabase, interaction, discordUserId, discordUsername, discordAvatarUrl);

        case "connect4":
          return await handleConnect4Command(supabase, interaction, discordUserId, discordUsername, discordAvatarUrl);

        case "hangman":
          return await handleHangmanCommand(supabase, interaction, discordUserId, discordUsername, discordAvatarUrl);

        case "heist":
          return await handleHeistCommand(supabase, interaction, discordUserId, discordUsername, discordAvatarUrl);

        case "boss":
          return await handleBossCommand(supabase, interaction, discordUserId, discordUsername, discordAvatarUrl);

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

        // ==================== DEVELOPER FUN ====================
        case "debug":
          return handleDebugCommand(discordAvatarUrl);

        case "commit":
          return handleCommitCommand(discordAvatarUrl);

        case "codereview":
          return handleCodeReviewCommand(discordAvatarUrl);

        case "stackoverflow":
          return handleStackOverflowCommand(discordAvatarUrl);

        case "rubberduck":
          return handleRubberDuckCommand(discordAvatarUrl);

        // ==================== ACTIVITIES ====================
        case "fish":
          return handleFishCommand(discordUsername, discordAvatarUrl);

        case "meme":
          return handleMemeCommand(discordUsername, discordAvatarUrl);

        default:
          return interactionResponse(`Unknown command: ${commandName}`, true);
      }
    }

    // Handle button/component interactions
    if (interaction.type === MESSAGE_COMPONENT && interaction.data?.custom_id) {
      return await handleComponentInteraction(supabase, interaction);
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

// /help command
function handleHelpCommand(discordAvatarUrl?: string) {
  const embed = {
    color: 0x8b5cf6,
    title: "🎮 Eclipse Fun Bot - Commands",
    description: "Your go-to bot for games, XP, and entertainment! Here's everything you can do:",
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: [
      {
        name: "🎲 Solo Games",
        value: [
          "`/8ball` - Ask the magic 8-ball a question",
          "`/coinflip` - Flip a coin (heads or tails)",
          "`/roll` - Roll dice (customizable sides & count)",
          "`/rps` - Rock Paper Scissors vs the bot",
        ].join("\n"),
        inline: false,
      },
      {
        name: "⚔️ Multiplayer Games",
        value: [
          "`/duel` - Challenge someone to RPS for XP",
          "`/tictactoe` - Classic Tic-Tac-Toe battle",
          "`/connect4` - Play Connect 4 with a friend",
          "`/hangman` - Start a word guessing game",
          "`/trivia` - Race to answer trivia first",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🤝 Cooperative Games",
        value: [
          "`/heist` - Start a heist, recruit a crew!",
          "`/boss` - Spawn a boss fight for everyone",
        ].join("\n"),
        inline: false,
      },
      {
        name: "⭐ XP & Rewards",
        value: [
          "`/daily` - Claim your daily XP reward",
          "`/level` - Check your level & XP progress",
          "`/streak` - View your daily claim streak",
          "`/leaderboard` - See the top XP earners",
        ].join("\n"),
        inline: false,
      },
      {
        name: "😄 Fun Stuff",
        value: [
          "`/joke` - Get a random joke",
          "`/quote` - Receive an inspirational quote",
          "`/funfact` - Learn something new",
          "`/compliment` - Get (or give) a nice compliment",
          "`/roast` - Friendly roasts for you or friends",
        ].join("\n"),
        inline: false,
      },
      {
        name: "💻 Developer Fun",
        value: [
          "`/debug` - Generate a random fake bug report",
          "`/commit` - Funny git commit messages",
          "`/codereview` - Random code review comments",
          "`/stackoverflow` - Simulate SO responses",
          "`/rubberduck` - Get debugging wisdom 🦆",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🎣 Activities",
        value: [
          "`/fish` - Go fishing and see what you catch!",
          "`/meme` - Get a random funny meme (mostly dev-related)",
        ].join("\n"),
        inline: false,
      },
    ],
    footer: { 
      text: "Eclipse Fun Bot • Win games to earn XP and climb the leaderboard!",
    },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: 4, // CHANNEL_MESSAGE
      data: { embeds: [embed] },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

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
    description: roast,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: { text: `${targetUser ? `From ${discordUsername} • ` : ""}All in good fun! 😄` },
    timestamp: new Date().toISOString(),
  };
  
  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { 
        content: mentionTarget, // This pings the user
        embeds: [embed],
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// ==================== DEVELOPER FUN HANDLERS ====================

// /debug command
function handleDebugCommand(discordAvatarUrl?: string) {
  const bug = handleDebug();
  
  const embed = {
    color: 0xef4444,
    title: "🐛 Bug Report Generated",
    description: "```ansi\n\u001b[31mERROR\u001b[0m: Something went terribly wrong!\n```",
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: [
      { name: "❌ Error Type", value: `\`${bug.error}\``, inline: true },
      { name: "📄 File", value: `\`${bug.file}:${bug.line}\``, inline: true },
      { name: "💬 Message", value: bug.message, inline: false },
    ],
    footer: { text: "Eclipse Fun Bot • This is a fake bug (or is it?)" },
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

// /commit command
function handleCommitCommand(discordAvatarUrl?: string) {
  const commit = handleCommit();
  const hash = Math.random().toString(16).slice(2, 9);
  
  const embed = {
    color: 0x22c55e,
    title: "📝 Git Commit Message",
    description: `\`\`\`\n${hash} - ${commit}\n\`\`\``,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: { text: "Eclipse Fun Bot • git push --force 💀" },
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

// /codereview command
function handleCodeReviewCommand(discordAvatarUrl?: string) {
  const review = handleCodeReview();
  const isApproved = review.verdict === "APPROVED";
  
  const embed = {
    color: isApproved ? 0x22c55e : 0xef4444,
    title: `${review.emoji} Code Review: ${review.verdict}`,
    description: review.comment,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: { text: "Eclipse Fun Bot • PR #" + Math.floor(Math.random() * 999 + 1) },
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

// /stackoverflow command
function handleStackOverflowCommand(discordAvatarUrl?: string) {
  const response = handleStackOverflow();
  const isClosed = response.status === "CLOSED";
  
  const voteEmoji = response.votes > 0 ? "⬆️" : response.votes < 0 ? "⬇️" : "➖";
  
  const embed = {
    color: isClosed ? 0xef4444 : 0xf48024,
    title: `📚 Stack Overflow: ${response.status}`,
    description: response.reason,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    fields: [
      { name: `${voteEmoji} Votes`, value: `${response.votes}`, inline: true },
      { name: "📊 Status", value: response.status, inline: true },
    ],
    footer: { text: "Eclipse Fun Bot • Did this answer your question?" },
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

// /rubberduck command
function handleRubberDuckCommand(discordAvatarUrl?: string) {
  const duck = handleRubberDuck();
  
  const embed = {
    color: 0xfbbf24,
    title: "🦆 Rubber Duck Debugging",
    description: `${duck.emoji} ${duck.advice}`,
    thumbnail: discordAvatarUrl ? { url: discordAvatarUrl } : undefined,
    footer: { text: "Eclipse Fun Bot • Quack quack! 🦆" },
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

// ==================== ACTIVITY HANDLERS ====================

// /fish command
function handleFishCommand(discordUsername: string, discordAvatarUrl?: string) {
  const result = handleFishing();
  
  const rarityLabels: Record<string, string> = {
    common: "⚪ Common",
    uncommon: "🟢 Uncommon",
    rare: "🔵 Rare",
    legendary: "🟡 Legendary",
    mythical: "🟣 Mythical",
    junk: "🟤 Junk",
    spooky: "💀 Spooky",
    fail: "❌ Failed",
  };
  
  const embed = {
    color: result.color,
    title: `🎣 ${result.catch}`,
    description: result.description,
    image: { url: result.gif },
    fields: [
      { name: "Rarity", value: rarityLabels[result.rarity] || result.rarity, inline: true },
    ],
    footer: { text: `Caught by ${discordUsername} • Eclipse Fun Bot` },
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

// /meme command
function handleMemeCommand(discordUsername: string, discordAvatarUrl?: string) {
  const result = handleMeme();
  
  const embed = {
    color: 0x8b5cf6,
    title: `🖼️ ${result.title}`,
    image: { url: result.gif },
    footer: { text: `Sent by ${discordUsername} • Eclipse Fun Bot` },
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

// ==================== MULTIPLAYER GAME HANDLERS ====================

// Handle component interactions (buttons, selects)
async function handleComponentInteraction(supabase: any, interaction: DiscordInteraction) {
  const customId = interaction.data?.custom_id || "";
  const discordUser = interaction.member?.user || interaction.user;
  
  if (!discordUser) {
    return interactionResponse("Unable to identify user.", true);
  }

  const discordUserId = discordUser.id;
  const discordUsername = discordUser.global_name || discordUser.username;

  // Parse custom_id format: game_action_gameId_extraData
  const parts = customId.split("_");
  const gameType = parts[0];
  const action = parts[1];
  const gameId = parts[2];

  console.log(`[discord-fun-bot] Component interaction: ${customId}`);

  switch (gameType) {
    case "duel":
      return await handleDuelInteraction(supabase, interaction, gameId, action, discordUserId, discordUsername);
    case "trivia":
      return await handleTriviaInteraction(supabase, interaction, gameId, action, discordUserId, discordUsername);
    case "ttt":
      return await handleTicTacToeInteraction(supabase, interaction, gameId, action, discordUserId, discordUsername);
    case "c4":
      return await handleConnect4Interaction(supabase, interaction, gameId, action, discordUserId, discordUsername);
    case "hangman":
      return await handleHangmanInteraction(supabase, interaction, gameId, action, discordUserId, discordUsername);
    case "heist":
      return await handleHeistInteraction(supabase, interaction, gameId, action, discordUserId, discordUsername);
    case "boss":
      return await handleBossInteraction(supabase, interaction, gameId, action, discordUserId, discordUsername);
    default:
      return interactionResponse("Unknown game interaction.", true);
  }
}

// /duel command - Challenge to RPS for XP
async function handleDuelCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const opponentOption = interaction.data?.options?.find(o => o.name === "opponent");
  const xpOption = interaction.data?.options?.find(o => o.name === "xp");
  
  const opponentId = opponentOption?.value;
  const xpWager = Number(xpOption?.value) || 10;
  
  if (!opponentId) {
    return interactionResponse("Please specify an opponent!", true);
  }
  
  if (opponentId === discordUserId) {
    return interactionResponse("You can't duel yourself!", true);
  }

  // Create game in database
  const { data: game, error } = await supabase
    .from("discord_games")
    .insert({
      game_type: "duel",
      channel_id: interaction.channel_id,
      guild_id: interaction.guild_id,
      creator_discord_id: discordUserId,
      creator_username: discordUsername,
      opponent_discord_id: opponentId,
      game_state: { xp_wager: xpWager, creator_choice: null, opponent_choice: null },
      xp_reward: xpWager,
    })
    .select()
    .single();

  if (error) {
    console.error("[discord-fun-bot] Duel create error:", error);
    return interactionResponse("Failed to create duel. Try again!", true);
  }

  const embed = {
    color: 0xf59e0b,
    title: "⚔️ Duel Challenge!",
    description: `<@${discordUserId}> has challenged <@${opponentId}> to a duel!\n\n**Wager:** ${xpWager} XP\n\nOpponent must accept to begin!`,
    footer: { text: `Game ID: ${game.id.slice(0, 8)} • Expires in 10 minutes` },
    timestamp: new Date().toISOString(),
  };

  const components = [
    {
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          style: 3, // Success (green)
          label: "Accept Duel",
          custom_id: `duel_accept_${game.id}`,
        },
        {
          type: 2,
          style: 4, // Danger (red)
          label: "Decline",
          custom_id: `duel_decline_${game.id}`,
        },
      ],
    },
  ];

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed], components },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// Handle duel button interactions
async function handleDuelInteraction(
  supabase: any,
  interaction: DiscordInteraction,
  gameId: string,
  action: string,
  discordUserId: string,
  discordUsername: string
) {
  const { data: game } = await supabase
    .from("discord_games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (!game || game.status === "completed" || game.status === "expired") {
    return updateMessageResponse("This duel has ended.", []);
  }

  if (action === "accept") {
    if (discordUserId !== game.opponent_discord_id) {
      return interactionResponse("Only the challenged user can accept!", true);
    }

    // Update to active and show RPS choices
    await supabase
      .from("discord_games")
      .update({ status: "active", opponent_username: discordUsername })
      .eq("id", gameId);

    const embed = {
      color: 0x8b5cf6,
      title: "⚔️ Duel Accepted!",
      description: `<@${game.creator_discord_id}> vs <@${discordUserId}>\n\n**Wager:** ${game.game_state.xp_wager} XP\n\nBoth players: Choose your weapon!`,
      footer: { text: "Choose wisely!" },
    };

    const components = [
      {
        type: 1,
        components: [
          { type: 2, style: 1, label: "🪨 Rock", custom_id: `duel_rock_${gameId}` },
          { type: 2, style: 1, label: "📄 Paper", custom_id: `duel_paper_${gameId}` },
          { type: 2, style: 1, label: "✂️ Scissors", custom_id: `duel_scissors_${gameId}` },
        ],
      },
    ];

    return updateMessageResponse(embed, components);
  }

  if (action === "decline") {
    if (discordUserId !== game.opponent_discord_id) {
      return interactionResponse("Only the challenged user can decline!", true);
    }

    await supabase
      .from("discord_games")
      .update({ status: "expired" })
      .eq("id", gameId);

    const embed = {
      color: 0xef4444,
      title: "⚔️ Duel Declined",
      description: `<@${discordUserId}> declined the duel.`,
    };

    return updateMessageResponse(embed, []);
  }

  // RPS choices
  if (["rock", "paper", "scissors"].includes(action)) {
    const isCreator = discordUserId === game.creator_discord_id;
    const isOpponent = discordUserId === game.opponent_discord_id;

    if (!isCreator && !isOpponent) {
      return interactionResponse("You're not part of this duel!", true);
    }

    const gameState = game.game_state as any;
    
    if (isCreator) {
      if (gameState.creator_choice) {
        return interactionResponse("You already chose!", true);
      }
      gameState.creator_choice = action;
    } else {
      if (gameState.opponent_choice) {
        return interactionResponse("You already chose!", true);
      }
      gameState.opponent_choice = action;
    }

    await supabase
      .from("discord_games")
      .update({ game_state: gameState })
      .eq("id", gameId);

    // Check if both have chosen
    if (gameState.creator_choice && gameState.opponent_choice) {
      return await resolveDuel(supabase, game, gameState);
    }

    return interactionResponse(`You chose ${action}! Waiting for opponent...`, true);
  }

  return interactionResponse("Unknown duel action.", true);
}

async function resolveDuel(supabase: any, game: any, gameState: any) {
  const { creator_choice, opponent_choice, xp_wager } = gameState;
  
  const beats: Record<string, string> = { rock: "scissors", paper: "rock", scissors: "paper" };
  const emojis: Record<string, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };
  
  let result: string;
  let winnerId: string | null = null;
  let color: number;
  
  if (creator_choice === opponent_choice) {
    result = "🤝 **It's a tie!** No XP exchanged.";
    color = 0xeab308;
  } else if (beats[creator_choice] === opponent_choice) {
    winnerId = game.creator_discord_id;
    result = `🎉 <@${game.creator_discord_id}> wins **${xp_wager} XP**!`;
    color = 0x22c55e;
  } else {
    winnerId = game.opponent_discord_id;
    result = `🎉 <@${game.opponent_discord_id}> wins **${xp_wager} XP**!`;
    color = 0x22c55e;
  }

  // Update game status
  await supabase
    .from("discord_games")
    .update({ status: "completed", winner_discord_id: winnerId })
    .eq("id", game.id);

  // Award XP to winner
  if (winnerId) {
    const winnerUsername = winnerId === game.creator_discord_id ? game.creator_username : game.opponent_username;
    await supabase.rpc("add_discord_xp", {
      p_discord_id: winnerId,
      p_discord_username: winnerUsername,
      p_xp_amount: xp_wager,
    });
  }

  const embed = {
    color,
    title: "⚔️ Duel Results!",
    fields: [
      { name: game.creator_username, value: `${emojis[creator_choice]} ${creator_choice}`, inline: true },
      { name: "VS", value: "⚔️", inline: true },
      { name: game.opponent_username, value: `${emojis[opponent_choice]} ${opponent_choice}`, inline: true },
    ],
    description: result,
    footer: { text: "Eclipse Fun • Duel Complete" },
  };

  return updateMessageResponse(embed, []);
}

// /trivia command
async function handleTriviaCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const categoryOption = interaction.data?.options?.find(o => o.name === "category");
  const category = categoryOption?.value;

  // Get random question
  let query = supabase.from("discord_trivia_questions").select("*");
  if (category) {
    query = query.eq("category", category);
  }
  
  const { data: questions, error } = await query;
  
  if (error || !questions || questions.length === 0) {
    return interactionResponse("No trivia questions available!", true);
  }

  const question = questions[Math.floor(Math.random() * questions.length)];
  
  // Shuffle answers
  const allAnswers = [question.correct_answer, ...question.wrong_answers];
  const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);

  // Create game
  const { data: game } = await supabase
    .from("discord_games")
    .insert({
      game_type: "trivia",
      channel_id: interaction.channel_id,
      guild_id: interaction.guild_id,
      creator_discord_id: discordUserId,
      creator_username: discordUsername,
      game_state: { 
        question_id: question.id,
        correct_answer: question.correct_answer,
        answers: shuffledAnswers,
        answered_by: [],
      },
      status: "active",
      xp_reward: question.difficulty === "hard" ? 30 : question.difficulty === "medium" ? 20 : 15,
    })
    .select()
    .single();

  if (!game) {
    return interactionResponse("Failed to start trivia. Try again!", true);
  }

  const difficultyEmoji = question.difficulty === "hard" ? "🔴" : question.difficulty === "medium" ? "🟡" : "🟢";
  
  const embed = {
    color: 0x3b82f6,
    title: `🧠 Trivia Time! ${difficultyEmoji}`,
    description: `**${question.question}**\n\n*First to answer correctly wins ${game.xp_reward} XP!*`,
    fields: [
      { name: "Category", value: question.category, inline: true },
      { name: "Difficulty", value: question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1), inline: true },
    ],
    footer: { text: `Started by ${discordUsername} • 30 seconds to answer!` },
  };

  const components = [
    {
      type: 1,
      components: shuffledAnswers.slice(0, 4).map((answer: string, i: number) => ({
        type: 2,
        style: 1,
        label: answer.length > 80 ? answer.slice(0, 77) + "..." : answer,
        custom_id: `trivia_answer_${game.id}_${i}`,
      })),
    },
  ];

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed], components },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

async function handleTriviaInteraction(
  supabase: any,
  interaction: DiscordInteraction,
  gameId: string,
  action: string,
  discordUserId: string,
  discordUsername: string
) {
  const { data: game } = await supabase
    .from("discord_games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (!game || game.status !== "active") {
    return interactionResponse("This trivia has ended!", true);
  }

  const gameState = game.game_state as any;
  
  // Check if already answered
  if (gameState.answered_by?.includes(discordUserId)) {
    return interactionResponse("You already answered!", true);
  }

  const answerIndex = parseInt(interaction.data?.custom_id?.split("_")[3] || "0");
  const selectedAnswer = gameState.answers[answerIndex];
  const isCorrect = selectedAnswer === gameState.correct_answer;

  // Track who answered
  gameState.answered_by = [...(gameState.answered_by || []), discordUserId];
  
  if (isCorrect) {
    // Winner!
    await supabase
      .from("discord_games")
      .update({ status: "completed", winner_discord_id: discordUserId, game_state: gameState })
      .eq("id", gameId);

    // Award XP
    await supabase.rpc("add_discord_xp", {
      p_discord_id: discordUserId,
      p_discord_username: discordUsername,
      p_xp_amount: game.xp_reward,
    });

    const embed = {
      color: 0x22c55e,
      title: "🎉 Correct!",
      description: `<@${discordUserId}> got it right!\n\n**Answer:** ${gameState.correct_answer}\n**Reward:** +${game.xp_reward} XP`,
      footer: { text: "Eclipse Fun • Trivia Complete" },
    };

    return updateMessageResponse(embed, []);
  }

  // Wrong answer
  await supabase
    .from("discord_games")
    .update({ game_state: gameState })
    .eq("id", gameId);

  return interactionResponse(`❌ Wrong! "${selectedAnswer}" is not correct.`, true);
}

// /tictactoe command
async function handleTicTacToeCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const opponentOption = interaction.data?.options?.find(o => o.name === "opponent");
  const opponentId = opponentOption?.value;

  if (!opponentId || opponentId === discordUserId) {
    return interactionResponse("Please choose a valid opponent!", true);
  }

  const { data: game } = await supabase
    .from("discord_games")
    .insert({
      game_type: "tictactoe",
      channel_id: interaction.channel_id,
      guild_id: interaction.guild_id,
      creator_discord_id: discordUserId,
      creator_username: discordUsername,
      opponent_discord_id: opponentId,
      game_state: { 
        board: Array(9).fill(null),
        current_turn: discordUserId,
        x_player: discordUserId,
        o_player: opponentId,
      },
      status: "pending",
      xp_reward: 25,
    })
    .select()
    .single();

  if (!game) {
    return interactionResponse("Failed to create game!", true);
  }

  const embed = {
    color: 0x8b5cf6,
    title: "⭕ Tic-Tac-Toe Challenge!",
    description: `<@${discordUserId}> (❌) vs <@${opponentId}> (⭕)\n\n<@${opponentId}> must accept to play!`,
    footer: { text: "Winner gets 25 XP!" },
  };

  const components = [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: "Accept", custom_id: `ttt_accept_${game.id}` },
        { type: 2, style: 4, label: "Decline", custom_id: `ttt_decline_${game.id}` },
      ],
    },
  ];

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed], components },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

async function handleTicTacToeInteraction(
  supabase: any,
  interaction: DiscordInteraction,
  gameId: string,
  action: string,
  discordUserId: string,
  discordUsername: string
) {
  const { data: game } = await supabase
    .from("discord_games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (!game) {
    return interactionResponse("Game not found!", true);
  }

  const gameState = game.game_state as any;

  if (action === "accept") {
    if (discordUserId !== game.opponent_discord_id) {
      return interactionResponse("Only the challenged player can accept!", true);
    }

    await supabase
      .from("discord_games")
      .update({ status: "active", opponent_username: discordUsername })
      .eq("id", gameId);

    return renderTicTacToeBoard(game, gameState, `<@${gameState.current_turn}>'s turn (❌)`);
  }

  if (action === "decline") {
    if (discordUserId !== game.opponent_discord_id) {
      return interactionResponse("Only the challenged player can decline!", true);
    }
    
    await supabase.from("discord_games").update({ status: "expired" }).eq("id", gameId);
    
    return updateMessageResponse({
      color: 0xef4444,
      title: "⭕ Game Declined",
      description: `<@${discordUserId}> declined the game.`,
    }, []);
  }

  // Board move (0-8)
  const position = parseInt(action);
  if (isNaN(position) || position < 0 || position > 8) {
    return interactionResponse("Invalid move!", true);
  }

  if (game.status !== "active") {
    return interactionResponse("This game hasn't started yet!", true);
  }

  if (discordUserId !== gameState.current_turn) {
    return interactionResponse("It's not your turn!", true);
  }

  if (gameState.board[position] !== null) {
    return interactionResponse("That spot is taken!", true);
  }

  // Make move
  const symbol = discordUserId === gameState.x_player ? "X" : "O";
  gameState.board[position] = symbol;

  // Check for winner
  const winner = checkTicTacToeWinner(gameState.board);
  
  if (winner) {
    await supabase
      .from("discord_games")
      .update({ status: "completed", winner_discord_id: discordUserId, game_state: gameState })
      .eq("id", gameId);

    await supabase.rpc("add_discord_xp", {
      p_discord_id: discordUserId,
      p_discord_username: discordUsername,
      p_xp_amount: game.xp_reward,
    });

    return renderTicTacToeBoard(game, gameState, `🎉 <@${discordUserId}> wins! (+${game.xp_reward} XP)`, true);
  }

  // Check for tie
  if (!gameState.board.includes(null)) {
    await supabase
      .from("discord_games")
      .update({ status: "completed", game_state: gameState })
      .eq("id", gameId);

    return renderTicTacToeBoard(game, gameState, "🤝 It's a tie!", true);
  }

  // Switch turn
  gameState.current_turn = discordUserId === gameState.x_player ? gameState.o_player : gameState.x_player;
  
  await supabase
    .from("discord_games")
    .update({ game_state: gameState })
    .eq("id", gameId);

  const turnSymbol = gameState.current_turn === gameState.x_player ? "❌" : "⭕";
  return renderTicTacToeBoard(game, gameState, `<@${gameState.current_turn}>'s turn (${turnSymbol})`);
}

function renderTicTacToeBoard(game: any, gameState: any, status: string, gameOver = false) {
  const symbols: Record<string, string> = { X: "❌", O: "⭕" };
  
  const embed = {
    color: gameOver ? 0x22c55e : 0x8b5cf6,
    title: "⭕ Tic-Tac-Toe",
    description: `${game.creator_username} (❌) vs ${game.opponent_username || "???"} (⭕)\n\n${status}`,
  };

  if (gameOver) {
    return updateMessageResponse(embed, []);
  }

  const components = [];
  for (let row = 0; row < 3; row++) {
    const buttons = [];
    for (let col = 0; col < 3; col++) {
      const pos = row * 3 + col;
      const cell = gameState.board[pos];
      buttons.push({
        type: 2,
        style: cell ? (cell === "X" ? 4 : 1) : 2,
        label: cell ? symbols[cell] : "⬜",
        custom_id: `ttt_${pos}_${game.id}`,
        disabled: cell !== null,
      });
    }
    components.push({ type: 1, components: buttons });
  }

  return updateMessageResponse(embed, components);
}

function checkTicTacToeWinner(board: (string | null)[]): string | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6], // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// /connect4 command
async function handleConnect4Command(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const opponentOption = interaction.data?.options?.find(o => o.name === "opponent");
  const opponentId = opponentOption?.value;

  if (!opponentId || opponentId === discordUserId) {
    return interactionResponse("Please choose a valid opponent!", true);
  }

  // Create 6x7 board
  const board = Array(6).fill(null).map(() => Array(7).fill(null));

  const { data: game } = await supabase
    .from("discord_games")
    .insert({
      game_type: "connect4",
      channel_id: interaction.channel_id,
      guild_id: interaction.guild_id,
      creator_discord_id: discordUserId,
      creator_username: discordUsername,
      opponent_discord_id: opponentId,
      game_state: {
        board,
        current_turn: discordUserId,
        red_player: discordUserId,
        yellow_player: opponentId,
      },
      status: "pending",
      xp_reward: 35,
    })
    .select()
    .single();

  if (!game) {
    return interactionResponse("Failed to create game!", true);
  }

  const embed = {
    color: 0xfbbf24,
    title: "🔴 Connect 4 Challenge!",
    description: `<@${discordUserId}> (🔴) vs <@${opponentId}> (🟡)\n\n<@${opponentId}> must accept to play!`,
    footer: { text: "Winner gets 35 XP!" },
  };

  const components = [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: "Accept", custom_id: `c4_accept_${game.id}` },
        { type: 2, style: 4, label: "Decline", custom_id: `c4_decline_${game.id}` },
      ],
    },
  ];

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed], components },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

async function handleConnect4Interaction(
  supabase: any,
  interaction: DiscordInteraction,
  gameId: string,
  action: string,
  discordUserId: string,
  discordUsername: string
) {
  const { data: game } = await supabase.from("discord_games").select("*").eq("id", gameId).single();

  if (!game) return interactionResponse("Game not found!", true);

  const gameState = game.game_state as any;

  if (action === "accept") {
    if (discordUserId !== game.opponent_discord_id) {
      return interactionResponse("Only the challenged player can accept!", true);
    }

    await supabase.from("discord_games").update({ status: "active", opponent_username: discordUsername }).eq("id", gameId);
    return renderConnect4Board(game, gameState, `<@${gameState.current_turn}>'s turn (🔴)`);
  }

  if (action === "decline") {
    if (discordUserId !== game.opponent_discord_id) {
      return interactionResponse("Only the challenged player can decline!", true);
    }
    
    await supabase.from("discord_games").update({ status: "expired" }).eq("id", gameId);
    return updateMessageResponse({ color: 0xef4444, title: "🔴 Game Declined" }, []);
  }

  // Column drop (0-6)
  const col = parseInt(action);
  if (isNaN(col) || col < 0 || col > 6) return interactionResponse("Invalid column!", true);
  if (game.status !== "active") return interactionResponse("Game hasn't started!", true);
  if (discordUserId !== gameState.current_turn) return interactionResponse("Not your turn!", true);

  // Find lowest empty row in column
  let row = -1;
  for (let r = 5; r >= 0; r--) {
    if (gameState.board[r][col] === null) {
      row = r;
      break;
    }
  }

  if (row === -1) return interactionResponse("Column is full!", true);

  const color = discordUserId === gameState.red_player ? "R" : "Y";
  gameState.board[row][col] = color;

  // Check winner
  if (checkConnect4Winner(gameState.board, row, col, color)) {
    await supabase.from("discord_games").update({ status: "completed", winner_discord_id: discordUserId, game_state: gameState }).eq("id", gameId);
    await supabase.rpc("add_discord_xp", { p_discord_id: discordUserId, p_discord_username: discordUsername, p_xp_amount: game.xp_reward });
    return renderConnect4Board(game, gameState, `🎉 <@${discordUserId}> wins! (+${game.xp_reward} XP)`, true);
  }

  // Check tie
  if (gameState.board[0].every((cell: string | null) => cell !== null)) {
    await supabase.from("discord_games").update({ status: "completed", game_state: gameState }).eq("id", gameId);
    return renderConnect4Board(game, gameState, "🤝 It's a tie!", true);
  }

  gameState.current_turn = discordUserId === gameState.red_player ? gameState.yellow_player : gameState.red_player;
  await supabase.from("discord_games").update({ game_state: gameState }).eq("id", gameId);

  const turnColor = gameState.current_turn === gameState.red_player ? "🔴" : "🟡";
  return renderConnect4Board(game, gameState, `<@${gameState.current_turn}>'s turn (${turnColor})`);
}

function renderConnect4Board(game: any, gameState: any, status: string, gameOver = false) {
  const symbols: Record<string, string> = { R: "🔴", Y: "🟡" };
  
  let boardDisplay = "";
  for (const row of gameState.board) {
    boardDisplay += row.map((cell: string | null) => cell ? symbols[cell] : "⚫").join("") + "\n";
  }
  boardDisplay += "1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣";

  const embed = {
    color: gameOver ? 0x22c55e : 0xfbbf24,
    title: "🔴 Connect 4",
    description: `${game.creator_username} (🔴) vs ${game.opponent_username || "???"} (🟡)\n\n${boardDisplay}\n\n${status}`,
  };

  if (gameOver) return updateMessageResponse(embed, []);

  const components = [{
    type: 1,
    components: [0, 1, 2, 3, 4, 5, 6].map(i => ({
      type: 2,
      style: 2,
      label: `${i + 1}`,
      custom_id: `c4_${i}_${game.id}`,
      disabled: gameState.board[0][i] !== null,
    })),
  }];

  return updateMessageResponse(embed, components);
}

function checkConnect4Winner(board: (string | null)[][], row: number, col: number, color: string): boolean {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  
  for (const [dr, dc] of directions) {
    let count = 1;
    
    // Check positive direction
    for (let i = 1; i < 4; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === color) count++;
      else break;
    }
    
    // Check negative direction
    for (let i = 1; i < 4; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === color) count++;
      else break;
    }
    
    if (count >= 4) return true;
  }
  return false;
}

// /hangman command
async function handleHangmanCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const wordOption = interaction.data?.options?.find(o => o.name === "word");
  const word = (wordOption?.value || "").toUpperCase().replace(/[^A-Z]/g, "");

  if (word.length < 3 || word.length > 15) {
    return interactionResponse("Word must be 3-15 letters!", true);
  }

  const { data: game } = await supabase
    .from("discord_games")
    .insert({
      game_type: "hangman",
      channel_id: interaction.channel_id,
      guild_id: interaction.guild_id,
      creator_discord_id: discordUserId,
      creator_username: discordUsername,
      game_state: {
        word,
        guessed: [],
        wrong_guesses: 0,
        max_wrong: 6,
      },
      status: "active",
      xp_reward: 20,
    })
    .select()
    .single();

  if (!game) {
    return interactionResponse("Failed to start game!", true);
  }

  // Ephemeral confirmation to creator
  const displayWord = word.split("").map(() => "⬜").join(" ");
  
  const embed = {
    color: 0x8b5cf6,
    title: "🎯 Hangman Started!",
    description: `<@${discordUserId}> started a game!\n\n**Word:** ${displayWord} (${word.length} letters)\n\nGuess letters by clicking buttons!`,
    fields: [{ name: "Lives", value: "❤️❤️❤️❤️❤️❤️", inline: true }],
    footer: { text: "Winner gets 20 XP!" },
  };

  // Letter buttons (A-Z split into rows)
  const rows = ["ABCDEFG", "HIJKLMN", "OPQRSTU", "VWXYZ"];
  const components = rows.map(row => ({
    type: 1,
    components: row.split("").map(letter => ({
      type: 2,
      style: 2,
      label: letter,
      custom_id: `hangman_${letter}_${game.id}`,
    })),
  }));

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed], components },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

async function handleHangmanInteraction(
  supabase: any,
  interaction: DiscordInteraction,
  gameId: string,
  action: string,
  discordUserId: string,
  discordUsername: string
) {
  const { data: game } = await supabase.from("discord_games").select("*").eq("id", gameId).single();
  if (!game || game.status !== "active") return interactionResponse("Game ended!", true);

  const gameState = game.game_state as any;
  const letter = action.toUpperCase();

  if (gameState.guessed.includes(letter)) {
    return interactionResponse("Already guessed!", true);
  }

  gameState.guessed.push(letter);
  const isCorrect = gameState.word.includes(letter);
  
  if (!isCorrect) {
    gameState.wrong_guesses++;
  }

  const displayWord = gameState.word.split("").map((l: string) => gameState.guessed.includes(l) ? l : "⬜").join(" ");
  const lives = "❤️".repeat(6 - gameState.wrong_guesses) + "🖤".repeat(gameState.wrong_guesses);
  const won = !displayWord.includes("⬜");
  const lost = gameState.wrong_guesses >= 6;

  if (won || lost) {
    await supabase.from("discord_games").update({
      status: "completed",
      winner_discord_id: won ? discordUserId : null,
      game_state: gameState,
    }).eq("id", gameId);

    if (won) {
      await supabase.rpc("add_discord_xp", { p_discord_id: discordUserId, p_discord_username: discordUsername, p_xp_amount: game.xp_reward });
    }

    const embed = {
      color: won ? 0x22c55e : 0xef4444,
      title: won ? "🎉 Word Guessed!" : "💀 Game Over!",
      description: won
        ? `<@${discordUserId}> guessed the word!\n\n**Word:** ${gameState.word}\n**Reward:** +${game.xp_reward} XP`
        : `The word was: **${gameState.word}**`,
    };

    return updateMessageResponse(embed, []);
  }

  await supabase.from("discord_games").update({ game_state: gameState }).eq("id", gameId);

  const embed = {
    color: isCorrect ? 0x22c55e : 0xef4444,
    title: "🎯 Hangman",
    description: `**Word:** ${displayWord}\n\n**Guessed:** ${gameState.guessed.join(", ")}`,
    fields: [{ name: "Lives", value: lives, inline: true }],
  };

  const rows = ["ABCDEFG", "HIJKLMN", "OPQRSTU", "VWXYZ"];
  const components = rows.map(row => ({
    type: 1,
    components: row.split("").map(l => ({
      type: 2,
      style: gameState.guessed.includes(l) ? (gameState.word.includes(l) ? 3 : 4) : 2,
      label: l,
      custom_id: `hangman_${l}_${gameId}`,
      disabled: gameState.guessed.includes(l),
    })),
  }));

  return updateMessageResponse(embed, components);
}

// /heist command - Cooperative game
async function handleHeistCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const vaultXP = Math.floor(Math.random() * 100) + 50; // 50-150 XP

  const { data: game } = await supabase
    .from("discord_games")
    .insert({
      game_type: "heist",
      channel_id: interaction.channel_id,
      guild_id: interaction.guild_id,
      creator_discord_id: discordUserId,
      creator_username: discordUsername,
      game_state: {
        vault_xp: vaultXP,
        participants: [{ id: discordUserId, username: discordUsername }],
        started: false,
      },
      status: "pending",
      xp_reward: vaultXP,
    })
    .select()
    .single();

  if (!game) return interactionResponse("Failed to start heist!", true);

  const embed = {
    color: 0xf59e0b,
    title: "🏦 Heist Planning!",
    description: `<@${discordUserId}> is planning a heist!\n\n💰 **Vault:** ${vaultXP} XP\n\nJoin to share the loot! Heist starts in 30 seconds or when the leader starts it.`,
    fields: [{ name: "Crew (1)", value: `• ${discordUsername}`, inline: false }],
    footer: { text: "More crew = higher success chance!" },
  };

  const components = [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: "Join Heist", custom_id: `heist_join_${game.id}` },
        { type: 2, style: 1, label: "Start Heist", custom_id: `heist_start_${game.id}` },
      ],
    },
  ];

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed], components },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

async function handleHeistInteraction(
  supabase: any,
  interaction: DiscordInteraction,
  gameId: string,
  action: string,
  discordUserId: string,
  discordUsername: string
) {
  const { data: game } = await supabase.from("discord_games").select("*").eq("id", gameId).single();
  if (!game || game.status === "completed") return interactionResponse("Heist ended!", true);

  const gameState = game.game_state as any;

  if (action === "join") {
    if (gameState.started) return interactionResponse("Heist already started!", true);
    if (gameState.participants.some((p: any) => p.id === discordUserId)) {
      return interactionResponse("You're already in!", true);
    }

    gameState.participants.push({ id: discordUserId, username: discordUsername });
    await supabase.from("discord_games").update({ game_state: gameState }).eq("id", gameId);

    const crewList = gameState.participants.map((p: any) => `• ${p.username}`).join("\n");
    
    const embed = {
      color: 0xf59e0b,
      title: "🏦 Heist Planning!",
      description: `💰 **Vault:** ${gameState.vault_xp} XP`,
      fields: [{ name: `Crew (${gameState.participants.length})`, value: crewList }],
    };

    const components = [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: "Join Heist", custom_id: `heist_join_${gameId}` },
          { type: 2, style: 1, label: "Start Heist", custom_id: `heist_start_${gameId}` },
        ],
      },
    ];

    return updateMessageResponse(embed, components);
  }

  if (action === "start") {
    if (discordUserId !== game.creator_discord_id) {
      return interactionResponse("Only the leader can start!", true);
    }

    // Calculate success (more participants = higher chance)
    const baseChance = 40;
    const bonus = gameState.participants.length * 15;
    const successChance = Math.min(baseChance + bonus, 95);
    const success = Math.random() * 100 < successChance;

    await supabase.from("discord_games").update({ status: "completed", game_state: { ...gameState, success } }).eq("id", gameId);

    if (success) {
      const xpPerPerson = Math.floor(gameState.vault_xp / gameState.participants.length);
      
      for (const p of gameState.participants) {
        await supabase.rpc("add_discord_xp", { p_discord_id: p.id, p_discord_username: p.username, p_xp_amount: xpPerPerson });
      }

      const embed = {
        color: 0x22c55e,
        title: "🎉 Heist Successful!",
        description: `The crew escaped with the loot!\n\n💰 Each member receives **+${xpPerPerson} XP**`,
        fields: [{ name: "Crew", value: gameState.participants.map((p: any) => p.username).join(", ") }],
      };

      return updateMessageResponse(embed, []);
    }

    const embed = {
      color: 0xef4444,
      title: "🚨 Heist Failed!",
      description: "The alarms went off! Everyone escaped but empty-handed.",
    };

    return updateMessageResponse(embed, []);
  }

  return interactionResponse("Unknown action!", true);
}

// /boss command - Cooperative boss fight
async function handleBossCommand(
  supabase: any,
  interaction: DiscordInteraction,
  discordUserId: string,
  discordUsername: string,
  discordAvatarUrl?: string
) {
  const bosses = [
    { name: "Shadow Dragon", emoji: "🐉", hp: 500, xp: 100 },
    { name: "Corrupted Golem", emoji: "🗿", hp: 400, xp: 80 },
    { name: "Phantom King", emoji: "👻", hp: 350, xp: 70 },
    { name: "Void Serpent", emoji: "🐍", hp: 300, xp: 60 },
  ];
  
  const boss = bosses[Math.floor(Math.random() * bosses.length)];

  const { data: game } = await supabase
    .from("discord_games")
    .insert({
      game_type: "boss",
      channel_id: interaction.channel_id,
      guild_id: interaction.guild_id,
      creator_discord_id: discordUserId,
      creator_username: discordUsername,
      game_state: {
        boss,
        current_hp: boss.hp,
        participants: {},
      },
      status: "active",
      xp_reward: boss.xp,
    })
    .select()
    .single();

  if (!game) return interactionResponse("Failed to spawn boss!", true);

  const hpBar = renderHPBar(boss.hp, boss.hp);
  
  const embed = {
    color: 0xef4444,
    title: `${boss.emoji} ${boss.name} Appeared!`,
    description: `A wild boss has appeared! Attack together to defeat it!\n\n**HP:** ${hpBar} ${boss.hp}/${boss.hp}\n**Reward:** ${boss.xp} XP (split among attackers)`,
    footer: { text: "Click Attack to deal damage!" },
  };

  const components = [
    {
      type: 1,
      components: [
        { type: 2, style: 4, label: "⚔️ Attack!", custom_id: `boss_attack_${game.id}` },
      ],
    },
  ];

  return new Response(
    JSON.stringify({
      type: CHANNEL_MESSAGE,
      data: { embeds: [embed], components },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

async function handleBossInteraction(
  supabase: any,
  interaction: DiscordInteraction,
  gameId: string,
  action: string,
  discordUserId: string,
  discordUsername: string
) {
  const { data: game } = await supabase.from("discord_games").select("*").eq("id", gameId).single();
  if (!game || game.status === "completed") return interactionResponse("Boss defeated!", true);

  const gameState = game.game_state as any;

  if (action === "attack") {
    const damage = Math.floor(Math.random() * 30) + 10; // 10-40 damage
    gameState.current_hp = Math.max(0, gameState.current_hp - damage);
    
    // Track participant damage
    if (!gameState.participants[discordUserId]) {
      gameState.participants[discordUserId] = { username: discordUsername, damage: 0 };
    }
    gameState.participants[discordUserId].damage += damage;

    const defeated = gameState.current_hp <= 0;

    if (defeated) {
      await supabase.from("discord_games").update({ status: "completed", game_state: gameState }).eq("id", gameId);

      const participantIds = Object.keys(gameState.participants);
      const xpPerPerson = Math.floor(gameState.boss.xp / participantIds.length);

      for (const id of participantIds) {
        await supabase.rpc("add_discord_xp", { p_discord_id: id, p_discord_username: gameState.participants[id].username, p_xp_amount: xpPerPerson });
      }

      const damageBoard = Object.values(gameState.participants as Record<string, { username: string; damage: number }>)
        .sort((a, b) => b.damage - a.damage)
        .map((p, i) => `${i + 1}. ${p.username}: ${p.damage} dmg`)
        .join("\n");

      const embed = {
        color: 0x22c55e,
        title: `🎉 ${gameState.boss.name} Defeated!`,
        description: `The boss has been slain!\n\n**Damage Dealt:**\n${damageBoard}\n\n💰 Each participant receives **+${xpPerPerson} XP**`,
      };

      return updateMessageResponse(embed, []);
    }

    await supabase.from("discord_games").update({ game_state: gameState }).eq("id", gameId);

    const hpBar = renderHPBar(gameState.current_hp, gameState.boss.hp);
    
    const embed = {
      color: 0xef4444,
      title: `${gameState.boss.emoji} ${gameState.boss.name}`,
      description: `**HP:** ${hpBar} ${gameState.current_hp}/${gameState.boss.hp}\n\n*${discordUsername}* dealt **${damage}** damage!`,
      footer: { text: `${Object.keys(gameState.participants).length} attackers` },
    };

    const components = [
      {
        type: 1,
        components: [
          { type: 2, style: 4, label: "⚔️ Attack!", custom_id: `boss_attack_${gameId}` },
        ],
      },
    ];

    return updateMessageResponse(embed, components);
  }

  return interactionResponse("Unknown action!", true);
}

function renderHPBar(current: number, max: number): string {
  const percentage = current / max;
  const filled = Math.round(percentage * 10);
  return "🟥".repeat(filled) + "⬛".repeat(10 - filled);
}

// Helper function for updating messages
function updateMessageResponse(embed: any, components: any[]) {
  return new Response(
    JSON.stringify({
      type: UPDATE_MESSAGE,
      data: {
        embeds: [embed],
        components,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
