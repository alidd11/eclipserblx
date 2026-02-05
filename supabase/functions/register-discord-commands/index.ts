import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Discord slash command definitions
const commands = [
  {
    name: "link",
    description: "Check if your Discord is linked to Eclipse",
  },
  {
    name: "verify",
    description: "Link your Discord using a code from Eclipse",
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
  },
  {
    name: "purchases",
    description: "View your recent purchases",
  },
  {
    name: "retrieve",
    description: "Get a download link for a purchased product",
    options: [
      {
        name: "product",
        description: "Product name to download",
        type: 3, // STRING
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
