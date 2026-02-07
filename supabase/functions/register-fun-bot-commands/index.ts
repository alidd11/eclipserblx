import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fun Bot slash command definitions - games, XP, and entertainment
// Removed contexts and integration_types to use Discord defaults for better compatibility
const commands = [
  // ==================== HELP ====================
  {
    name: "help",
    description: "View all available commands and features",
  },
  
  // ==================== GAMES & ENTERTAINMENT ====================
  {
    name: "8ball",
    description: "Ask the magic 8-ball a question",
    options: [
      {
        name: "question",
        description: "Your question for the magic 8-ball",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "coinflip",
    description: "Flip a coin - heads or tails?",
  },
  {
    name: "roll",
    description: "Roll dice",
    options: [
      {
        name: "sides",
        description: "Number of sides on the die (default: 6)",
        type: 4, // INTEGER
        required: false,
        min_value: 2,
        max_value: 100,
      },
      {
        name: "count",
        description: "Number of dice to roll (default: 1)",
        type: 4, // INTEGER
        required: false,
        min_value: 1,
        max_value: 10,
      },
    ],
  },
  {
    name: "rps",
    description: "Play Rock Paper Scissors against the bot",
    options: [
      {
        name: "choice",
        description: "Your choice",
        type: 3, // STRING
        required: true,
        choices: [
          { name: "🪨 Rock", value: "rock" },
          { name: "📄 Paper", value: "paper" },
          { name: "✂️ Scissors", value: "scissors" },
        ],
      },
    ],
  },
  
  // ==================== MULTIPLAYER GAMES ====================
  {
    name: "duel",
    description: "Challenge another user to Rock Paper Scissors for XP",
    options: [
      {
        name: "opponent",
        description: "The user you want to challenge",
        type: 6, // USER
        required: true,
      },
      {
        name: "xp",
        description: "XP to wager (default: 10)",
        type: 4, // INTEGER
        required: false,
        min_value: 5,
        max_value: 100,
      },
    ],
  },
  {
    name: "trivia",
    description: "Start a trivia question - first correct answer wins!",
    options: [
      {
        name: "category",
        description: "Question category",
        type: 3, // STRING
        required: false,
        choices: [
          { name: "🎮 Gaming", value: "Gaming" },
          { name: "🌍 General", value: "General" },
          { name: "💻 Tech", value: "Tech" },
        ],
      },
    ],
  },
  {
    name: "tictactoe",
    description: "Challenge someone to Tic-Tac-Toe",
    options: [
      {
        name: "opponent",
        description: "The user you want to challenge",
        type: 6, // USER
        required: true,
      },
    ],
  },
  {
    name: "connect4",
    description: "Challenge someone to Connect 4",
    options: [
      {
        name: "opponent",
        description: "The user you want to challenge",
        type: 6, // USER
        required: true,
      },
    ],
  },
  {
    name: "hangman",
    description: "Start a game of Hangman",
    options: [
      {
        name: "word",
        description: "The word for others to guess (sent privately)",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "heist",
    description: "Start a heist - others can join for shared XP rewards!",
  },
  {
    name: "boss",
    description: "Spawn a boss fight - work together to defeat it!",
  },
  
  // ==================== DAILY REWARDS & XP ====================
  {
    name: "daily",
    description: "Claim your daily XP reward",
  },
  {
    name: "level",
    description: "Check your level and XP",
    options: [
      {
        name: "user",
        description: "Check another user's level (optional)",
        type: 6, // USER
        required: false,
      },
    ],
  },
  {
    name: "leaderboard",
    description: "View the XP leaderboard",
  },
  {
    name: "streak",
    description: "Check your daily claim streak",
  },
  
  // ==================== FUN RESPONSES ====================
  {
    name: "joke",
    description: "Get a random joke",
  },
  {
    name: "quote",
    description: "Get an inspirational quote",
  },
  {
    name: "funfact",
    description: "Learn a random fun fact",
  },
  {
    name: "compliment",
    description: "Get a nice compliment",
    options: [
      {
        name: "user",
        description: "Give a compliment to someone else",
        type: 6, // USER
        required: false,
      },
    ],
  },
  {
    name: "roast",
    description: "Get a friendly roast",
    options: [
      {
        name: "user",
        description: "Roast someone else (friendly!)",
        type: 6, // USER
        required: false,
      },
    ],
  },
  
  // ==================== DEVELOPER FUN ====================
  {
    name: "debug",
    description: "Generate a random fake bug report",
  },
  {
    name: "commit",
    description: "Generate a funny git commit message",
  },
  {
    name: "codereview",
    description: "Get a random code review comment",
  },
  {
    name: "stackoverflow",
    description: "Simulate a Stack Overflow response",
  },
  {
    name: "rubberduck",
    description: "Ask the rubber duck for debugging wisdom",
  },
  
  // ==================== ACTIVITIES ====================
  {
    name: "fish",
    description: "Go fishing and see what you catch!",
  },
  {
    name: "meme",
    description: "Get a random funny meme",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  const authHeader = req.headers.get("Authorization");
  const apiKey = req.headers.get("x-api-key");
  const botghostKey = Deno.env.get("BOTGHOST_API_KEY");
  const internalKey = req.headers.get("x-internal-key");
  
  // Option 1: Service key via x-api-key header
  const isApiKeyAuth = apiKey && botghostKey && apiKey.trim() === botghostKey.trim();
  
  // Option 2: Internal registration key (matches service role)
  const isInternalAuth = internalKey && internalKey === supabaseServiceKey;
  
  if (!isApiKeyAuth && !isInternalAuth) {
    // Option 3: User auth with admin role
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log("[register-fun-bot-commands] Auth failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Use Fun Bot credentials
  const discordBotToken = Deno.env.get("DISCORD_FUN_BOT_TOKEN");
  const discordClientId = Deno.env.get("DISCORD_FUN_BOT_CLIENT_ID");

  if (!discordBotToken || !discordClientId) {
    return new Response(
      JSON.stringify({ error: "Discord Fun Bot credentials not configured. Required: DISCORD_FUN_BOT_TOKEN, DISCORD_FUN_BOT_CLIENT_ID" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Prefer registering guild commands (they appear instantly), while also updating global commands.
    // Global command propagation can take up to ~1 hour in Discord.
    let payload: any = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const guildId: string | undefined =
      (typeof payload?.guild_id === "string" && payload.guild_id.trim() ? payload.guild_id.trim() : undefined) ||
      (Deno.env.get("DISCORD_GUILD_ID") ? Deno.env.get("DISCORD_GUILD_ID")! : undefined);

    const putCommands = async (url: string) => {
      const resp = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${discordBotToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
      });

      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(text || `Discord API error (status ${resp.status})`);
      }

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    };

    // 1) Guild commands (instant)
    let guildResult: any[] | null = null;
    if (guildId) {
      const guildUrl = `https://discord.com/api/v10/applications/${discordClientId}/guilds/${guildId}/commands`;
      guildResult = await putCommands(guildUrl);
      console.log("[register-fun-bot-commands] Guild commands registered:", guildResult?.length);
      
      // Clear global commands to prevent duplicates (PUT empty array)
      const globalUrl = `https://discord.com/api/v10/applications/${discordClientId}/commands`;
      try {
        const clearResp = await fetch(globalUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bot ${discordBotToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([]), // Empty array clears all global commands
        });
        if (clearResp.ok) {
          console.log("[register-fun-bot-commands] Global commands cleared to prevent duplicates");
        }
      } catch (err) {
        console.warn("[register-fun-bot-commands] Could not clear global commands:", err);
      }
    } else {
      // No guild ID - register globally only
      console.log("[register-fun-bot-commands] No DISCORD_GUILD_ID configured; registering global commands.");
      const globalUrl = `https://discord.com/api/v10/applications/${discordClientId}/commands`;
      try {
        guildResult = await putCommands(globalUrl);
        console.log("[register-fun-bot-commands] Global commands registered:", guildResult?.length);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[register-fun-bot-commands] Global registration error:", errorMsg);
        return new Response(
          JSON.stringify({ error: "Failed to register commands", details: errorMsg }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const primary = guildResult ?? [];

    return new Response(
      JSON.stringify({
        success: true,
        message: guildId
          ? "Fun Bot commands registered for this server. Global duplicates cleared."
          : "Fun Bot global commands registered.",
        guild_id: guildId ?? null,
        commands: Array.isArray(primary) ? primary.map((c: any) => ({ name: c.name, id: c.id })) : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[register-fun-bot-commands] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
