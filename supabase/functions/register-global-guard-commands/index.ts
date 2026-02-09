import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Global Guard slash commands
const commands = [
  {
    name: "ban",
    description: "Ban a user across all your Global Guard servers",
    options: [
      {
        name: "user",
        description: "Discord user ID or @mention to ban",
        type: 3, // STRING
        required: true,
      },
      {
        name: "reason",
        description: "Reason for the ban",
        type: 3, // STRING
        required: false,
      },
      {
        name: "duration",
        description: "Ban duration (leave empty for permanent)",
        type: 3, // STRING
        required: false,
        choices: [
          { name: "1 hour", value: "1h" },
          { name: "12 hours", value: "12h" },
          { name: "1 day", value: "1d" },
          { name: "7 days", value: "7d" },
          { name: "30 days", value: "30d" },
          { name: "90 days", value: "90d" },
        ],
      },
    ],
  },
  {
    name: "unban",
    description: "Remove a global ban from a user",
    options: [
      {
        name: "user",
        description: "Discord user ID or @mention to unban",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "globalban",
    description: "Ban a user across all your servers with Global Guard",
    options: [
      {
        name: "user",
        description: "Discord user ID or @mention to ban",
        type: 3, // STRING
        required: true,
      },
      {
        name: "reason",
        description: "Reason for the ban",
        type: 3, // STRING
        required: false,
      },
      {
        name: "duration",
        description: "Ban duration (leave empty for permanent)",
        type: 3, // STRING
        required: false,
        choices: [
          { name: "1 hour", value: "1h" },
          { name: "12 hours", value: "12h" },
          { name: "1 day", value: "1d" },
          { name: "7 days", value: "7d" },
          { name: "30 days", value: "30d" },
          { name: "90 days", value: "90d" },
        ],
      },
    ],
  },
  {
    name: "globalunban",
    description: "Remove a global ban from a user",
    options: [
      {
        name: "user",
        description: "Discord user ID or @mention to unban",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "bans",
    description: "View your active global bans",
  },
  {
    name: "globalbans",
    description: "View your active global bans",
  },
  {
    name: "evidence",
    description: "Add evidence to an existing global ban",
    options: [
      {
        name: "user",
        description: "Discord user ID or @mention of the banned user",
        type: 3, // STRING
        required: true,
      },
      {
        name: "url",
        description: "URL to evidence (screenshot, video, etc.)",
        type: 3, // STRING
        required: false,
      },
      {
        name: "notes",
        description: "Additional notes about the evidence",
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: "baninfo",
    description: "View detailed information about a user's ban",
    options: [
      {
        name: "user",
        description: "Discord user ID or @mention",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "banhistory",
    description: "View a user's ban history across your servers",
    options: [
      {
        name: "user",
        description: "Discord user ID or @mention",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "importbans",
    description: "Import bans from a JSON URL or paste",
    options: [
      {
        name: "url",
        description: "URL to a JSON file with ban data",
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: "exportbans",
    description: "Export your global bans to JSON format",
  },
  {
    name: "dashboard",
    description: "Get your Global Guard dashboard link",
  },
  {
    name: "upgrade",
    description: "Learn about premium benefits and upgrade options",
  },
  {
    name: "help",
    description: "View all Global Guard commands and their usage",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth check - service key, internal key, or admin user
  const authHeader = req.headers.get("Authorization");
  const apiKey = req.headers.get("x-api-key");
  const botghostKey = Deno.env.get("BOTGHOST_API_KEY");
  const internalKey = req.headers.get("x-internal-key");

  const isApiKeyAuth = apiKey && botghostKey && apiKey.trim() === botghostKey.trim();
  const isInternalAuth = internalKey && internalKey === supabaseServiceKey;

  if (!isApiKeyAuth && !isInternalAuth) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

  const botToken = Deno.env.get("DISCORD_GLOBAL_GUARD_BOT_TOKEN")?.trim();
  const clientId = Deno.env.get("DISCORD_GLOBAL_GUARD_BOT_CLIENT_ID")?.trim();

  console.log("[register-global-guard-commands] Credentials present", {
    hasBotToken: !!botToken,
    botTokenLength: botToken?.length || 0,
    hasClientId: !!clientId,
    clientIdLength: clientId?.length || 0,
  });

  if (!botToken || !clientId) {
    return new Response(
      JSON.stringify({ 
        error: "Global Guard bot credentials not configured",
        required: ["DISCORD_GLOBAL_GUARD_BOT_TOKEN", "DISCORD_GLOBAL_GUARD_BOT_CLIENT_ID"]
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Register commands globally ONLY (no per-guild registration to avoid duplicates)
    console.log("[register-global-guard-commands] Registering global commands only (no guild-specific)...");
    
    const response = await fetch(
      `https://discord.com/api/v10/applications/${clientId}/commands`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[register-global-guard-commands] Discord API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to register commands", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const registeredCommands = await response.json();
    console.log(`[register-global-guard-commands] Registered ${registeredCommands.length} global commands`);

    // Clear any existing guild-specific commands to prevent duplicates
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const clearedGuilds: string[] = [];

    // Clear from main Eclipse guild
    const mainGuildId = Deno.env.get("DISCORD_GUILD_ID");
    if (mainGuildId) {
      try {
        const clearRes = await fetch(
          `https://discord.com/api/v10/applications/${clientId}/guilds/${mainGuildId}/commands`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify([]), // Empty array clears all guild commands
          }
        );
        if (clearRes.ok) {
          clearedGuilds.push(mainGuildId);
          console.log(`[register-global-guard-commands] Cleared guild commands from main guild ${mainGuildId}`);
        } else {
          console.warn(`[register-global-guard-commands] Could not clear main guild:`, await clearRes.text());
        }
      } catch (e) {
        console.warn(`[register-global-guard-commands] Error clearing main guild:`, e);
      }
    }

    // Clear from any licensed guilds
    const { data: installations } = await supabase
      .from("bot_installation_codes")
      .select("guild_id")
      .eq("license_status", "active")
      .not("guild_id", "is", null);

    if (installations) {
      for (const install of installations) {
        if (install.guild_id && install.guild_id !== mainGuildId) {
          try {
            const clearRes = await fetch(
              `https://discord.com/api/v10/applications/${clientId}/guilds/${install.guild_id}/commands`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bot ${botToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify([]),
              }
            );
            if (clearRes.ok) {
              clearedGuilds.push(install.guild_id);
              console.log(`[register-global-guard-commands] Cleared guild commands from ${install.guild_id}`);
            }
          } catch (e) {
            console.warn(`[register-global-guard-commands] Error clearing guild ${install.guild_id}:`, e);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Global Guard commands registered globally only (no duplicates). May take up to 1 hour to propagate.",
        global_commands: registeredCommands.map((c: any) => ({ name: c.name, id: c.id })),
        cleared_guild_commands: clearedGuilds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[register-global-guard-commands] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
