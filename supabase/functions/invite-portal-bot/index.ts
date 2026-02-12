import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PORTAL_BOT_CLIENT_ID = "1466778545039741072";
const PORTAL_BOT_PERMISSIONS = "2147534848"; // Send Messages, Embed Links, Slash Commands, Manage Roles
const PORTAL_BOT_SCOPES = "bot applications.commands";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET = OAuth callback from Discord
  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const guildId = url.searchParams.get("guild_id");
    const error = url.searchParams.get("error");

    if (error) {
      return redirectWithError("Discord authorization was cancelled");
    }

    if (!guildId || !state) {
      return redirectWithError("Missing guild_id or state parameter");
    }

    // Decode state to get store_id
    let storeId: string;
    try {
      const decoded = JSON.parse(atob(state));
      storeId = decoded.store_id;
      if (!storeId) throw new Error("No store_id");
    } catch {
      return redirectWithError("Invalid state parameter");
    }

    // Use service role to update store records
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch guild name from Discord API
    let guildName = "Connected Server";
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    if (botToken) {
      try {
        const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (guildRes.ok) {
          const guildData = await guildRes.json();
          guildName = guildData.name || guildName;
        }
      } catch {
        // Non-fatal, use default name
      }
    }

    // Update stores table
    const { error: storeError } = await supabase
      .from("stores")
      .update({ discord_guild_id: guildId })
      .eq("id", storeId);

    if (storeError) {
      console.error("Failed to update stores:", storeError);
      return redirectWithError("Failed to save server connection");
    }

    // Update store_credentials table
    const { error: credError } = await supabase
      .from("store_credentials")
      .update({ discord_guild_id: guildId })
      .eq("store_id", storeId);

    if (credError) {
      console.error("Failed to update store_credentials:", credError);
      // Non-fatal since stores was already updated
    }

    // Redirect back to seller discord page with success
    const siteUrl = Deno.env.get("SITE_URL") || "https://eclipserblx.com";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${siteUrl}/seller/discord?connected=true&guild_name=${encodeURIComponent(guildName)}`,
      },
    });
  }

  // POST = Generate invite URL
  if (req.method === "POST") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Get the seller's store
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", userId)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: "No approved store found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create state parameter with store_id
    const state = btoa(JSON.stringify({ store_id: store.id }));

    // Build the function URL for the callback
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/invite-portal-bot`;

    // Build Discord OAuth2 URL
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${PORTAL_BOT_CLIENT_ID}&permissions=${PORTAL_BOT_PERMISSIONS}&scope=${encodeURIComponent(PORTAL_BOT_SCOPES)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;

    return new Response(JSON.stringify({ url: inviteUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function redirectWithError(message: string) {
  const siteUrl = Deno.env.get("SITE_URL") || "https://eclipserblx.com";
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${siteUrl}/seller/discord?error=${encodeURIComponent(message)}`,
    },
  });
}
