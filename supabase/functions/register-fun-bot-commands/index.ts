import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fun Bot slash command definitions - games, XP, and entertainment
const commands = [
  // ==================== GAMES & ENTERTAINMENT ====================
  {
    name: "8ball",
    description: "Ask the magic 8-ball a question",
    contexts: [0],
    integration_types: [0],
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
    contexts: [0],
    integration_types: [0],
  },
  {
    name: "roll",
    description: "Roll dice",
    contexts: [0],
    integration_types: [0],
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
    contexts: [0],
    integration_types: [0],
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
  
  // ==================== DAILY REWARDS & XP ====================
  {
    name: "daily",
    description: "Claim your daily XP reward",
    contexts: [0],
    integration_types: [0],
  },
  {
    name: "level",
    description: "Check your level and XP",
    contexts: [0],
    integration_types: [0],
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
    contexts: [0],
    integration_types: [0],
  },
  {
    name: "streak",
    description: "Check your daily claim streak",
    contexts: [0],
    integration_types: [0],
  },
  
  // ==================== FUN RESPONSES ====================
  {
    name: "joke",
    description: "Get a random joke",
    contexts: [0],
    integration_types: [0],
  },
  {
    name: "quote",
    description: "Get an inspirational quote",
    contexts: [0],
    integration_types: [0],
  },
  {
    name: "funfact",
    description: "Learn a random fun fact",
    contexts: [0],
    integration_types: [0],
  },
  {
    name: "compliment",
    description: "Get a nice compliment",
    contexts: [0],
    integration_types: [0],
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
    contexts: [0],
    integration_types: [0],
    options: [
      {
        name: "user",
        description: "Roast someone else (friendly!)",
        type: 6, // USER
        required: false,
      },
    ],
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
    // Register global commands
    const response = await fetch(
      `https://discord.com/api/v10/applications/${discordClientId}/commands`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${discordBotToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[register-fun-bot-commands] Discord API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to register commands", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("[register-fun-bot-commands] Commands registered:", result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Fun Bot commands registered successfully",
        commands: result.map((c: any) => ({ name: c.name, id: c.id })),
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
