import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Discord slash command definitions for Eclipse Portal Bot
// contexts: 0 = Guild, 1 = Bot DM, 2 = Private Channel (Group DM)
// integration_types: 0 = Guild Install, 1 = User Install
const commands = [
  // ==================== ACCOUNT COMMANDS ====================
  {
    name: "link",
    description: "Check if your Discord is linked to Eclipse",
    contexts: [0], // Guild only
    integration_types: [0],
  },
  {
    name: "verify",
    description: "Link your Discord using a code from Eclipse",
    contexts: [0], // Guild only
    integration_types: [0],
    options: [
      {
        name: "code",
        description: "Your 6-character link code from Eclipse",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "profile",
    description: "View your Eclipse profile and stats",
    contexts: [0], // Guild only
    integration_types: [0],
  },
  {
    name: "purchases",
    description: "View your recent purchases",
    contexts: [0], // Guild only
    integration_types: [0],
  },
  {
    name: "retrieve",
    description: "Get a download link for a purchased product",
    contexts: [0], // Guild only
    integration_types: [0],
    options: [
      {
        name: "product",
        description: "Product name to download",
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: "getrole",
    description: "Sync your Discord roles based on your Eclipse account status",
    contexts: [0], // Guild only
    integration_types: [0],
  },
  {
    name: "store",
    description: "View this server's store information",
    contexts: [0], // Guild only
    integration_types: [0],
  },
  {
    name: "unlink",
    description: "Disconnect your Discord from your Eclipse account",
    contexts: [0], // Guild only
    integration_types: [0],
  },
  {
    name: "support",
    description: "Contact Eclipse support - opens a ticket",
    contexts: [0], // Guild only
    integration_types: [0],
  },
  {
    name: "reply",
    description: "Reply to your active support ticket",
    contexts: [1], // DM only
    integration_types: [0, 1], // Works with both guild and user installs
    dm_permission: true,
  },
  {
    name: "showcase",
    description: "View a featured product from the marketplace",
    contexts: [0], // Guild only
    integration_types: [0],
  },
  {
    name: "help",
    description: "View all available Eclipse Portal Bot commands",
    contexts: [0], // Guild only
    integration_types: [0],
  },
];

// Guild-specific commands (without contexts/integration_types for better compatibility)
const guildCommands = commands.map(cmd => {
  const { contexts, integration_types, ...rest } = cmd as any;
  return rest;
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  // Allow service key auth OR user auth with admin role
  const authHeader = req.headers.get("Authorization");
  const apiKey = req.headers.get("x-api-key");
  const botghostKey = Deno.env.get("BOTGHOST_API_KEY");
  const internalKey = req.headers.get("x-internal-key");
  
  // Option 1: Service key via x-api-key header (for automated calls)
  const isApiKeyAuth = apiKey && botghostKey && apiKey.trim() === botghostKey.trim();
  
  // Option 2: Internal key (for cron jobs)
  const isInternalAuth = internalKey && internalKey === supabaseServiceKey;
  
  if (!isApiKeyAuth && !isInternalAuth) {
    // Option 3: User auth with admin role
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log("[register-discord-commands] Auth failed:", authError?.message);
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

  // Use separate Customer Bot credentials
  const discordBotToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
  const discordClientId = Deno.env.get("DISCORD_CUSTOMER_BOT_CLIENT_ID");
  const mainGuildId = Deno.env.get("DISCORD_GUILD_ID");

  if (!discordBotToken || !discordClientId) {
    return new Response(
      JSON.stringify({ error: "Discord Customer Bot credentials not configured. Required: DISCORD_CUSTOMER_BOT_TOKEN, DISCORD_CUSTOMER_BOT_CLIENT_ID" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const results: { global?: any; guild?: any; storeGuilds?: any[] } = {};

    // 1. Register GUILD commands for main Eclipse server (instant sync)
    if (mainGuildId) {
      console.log(`[register-discord-commands] Registering guild commands for main server: ${mainGuildId}`);
      const guildResponse = await fetch(
        `https://discord.com/api/v10/applications/${discordClientId}/guilds/${mainGuildId}/commands`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${discordBotToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(guildCommands),
        }
      );

      if (guildResponse.ok) {
        results.guild = await guildResponse.json();
        console.log(`[register-discord-commands] Guild commands registered: ${results.guild.length}`);
      } else {
        const errorText = await guildResponse.text();
        console.error("[register-discord-commands] Guild registration error:", errorText);
      }
    }

    // 2. Register GLOBAL commands (for store servers - takes up to 1 hour to propagate)
    console.log("[register-discord-commands] Registering global commands...");
    const globalResponse = await fetch(
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

    if (globalResponse.ok) {
      results.global = await globalResponse.json();
      console.log(`[register-discord-commands] Global commands registered: ${results.global.length}`);
    } else {
      const errorText = await globalResponse.text();
      console.error("[register-discord-commands] Global registration error:", errorText);
      
      // If global fails but guild succeeded, still return success
      if (!results.guild) {
        return new Response(
          JSON.stringify({ error: "Failed to register commands", details: errorText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Also register guild commands for any connected store servers
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: stores } = await supabase
      .from("stores")
      .select("discord_guild_id, name")
      .eq("is_active", true)
      .not("discord_guild_id", "is", null);

    if (stores && stores.length > 0) {
      results.storeGuilds = [];
      for (const store of stores) {
        if (store.discord_guild_id && store.discord_guild_id !== mainGuildId) {
          try {
            const storeGuildResponse = await fetch(
              `https://discord.com/api/v10/applications/${discordClientId}/guilds/${store.discord_guild_id}/commands`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bot ${discordBotToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(guildCommands),
              }
            );

            if (storeGuildResponse.ok) {
              const storeResult = await storeGuildResponse.json();
              results.storeGuilds.push({ 
                guild_id: store.discord_guild_id, 
                store_name: store.name,
                commands: storeResult.length 
              });
              console.log(`[register-discord-commands] Store guild commands registered for ${store.name}: ${storeResult.length}`);
            } else {
              console.warn(`[register-discord-commands] Failed to register for store ${store.name}:`, await storeGuildResponse.text());
            }
          } catch (err) {
            console.warn(`[register-discord-commands] Error registering for store ${store.name}:`, err);
          }
        }
      }
    }

    const totalCommands = results.guild?.length || results.global?.length || 0;
    const storeGuildsCount = results.storeGuilds?.length || 0;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Portal Bot commands registered successfully. Main guild: instant, Global: up to 1 hour, Store guilds: ${storeGuildsCount}`,
        main_guild_id: mainGuildId || null,
        commands: (results.guild || results.global || []).map((c: any) => ({ name: c.name, id: c.id })),
        store_guilds: results.storeGuilds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[register-discord-commands] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
