import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Discord slash command definitions
// contexts: 0 = Guild, 1 = Bot DM, 2 = Private Channel (Group DM)
// integration_types: 0 = Guild Install, 1 = User Install
const commands = [
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
];

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
  
  // Option 1: Service key via x-api-key header (for automated calls)
  if (apiKey && botghostKey && apiKey.trim() === botghostKey.trim()) {
    // Authorized via API key - proceed
  } else {
    // Option 2: User auth with admin role
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

  if (!discordBotToken || !discordClientId) {
    return new Response(
      JSON.stringify({ error: "Discord Customer Bot credentials not configured. Required: DISCORD_CUSTOMER_BOT_TOKEN, DISCORD_CUSTOMER_BOT_CLIENT_ID" }),
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
      console.error("[register-discord-commands] Discord API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to register commands", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("[register-discord-commands] Commands registered:", result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Discord commands registered successfully",
        commands: result.map((c: any) => ({ name: c.name, id: c.id })),
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
