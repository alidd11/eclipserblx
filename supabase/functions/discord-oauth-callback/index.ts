import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[DISCORD-OAUTH] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirect_uri, user_id } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Authorization code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Starting OAuth token exchange", { code: code.substring(0, 10) + "..." });

    const clientId = Deno.env.get("DISCORD_CLIENT_ID");
    const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      logStep("Missing Discord OAuth credentials");
      return new Response(
        JSON.stringify({ error: "Discord OAuth not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logStep("Token exchange failed", { status: tokenResponse.status, error: errorText });
      return new Response(
        JSON.stringify({ error: "Failed to exchange authorization code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    logStep("Token exchange successful");

    // Fetch user info from Discord
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      logStep("Failed to fetch Discord user", { status: userResponse.status, error: errorText });
      return new Response(
        JSON.stringify({ error: "Failed to fetch Discord user info" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const discordUser = await userResponse.json();
    logStep("Fetched Discord user", { id: discordUser.id, username: discordUser.username });

    // Update the user's profile with Discord info
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this Discord account is already linked to another user
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("discord_id", discordUser.id)
      .neq("user_id", user_id)
      .maybeSingle();

    if (checkError) {
      logStep("Error checking existing Discord link", { error: checkError.message });
    }

    if (existingProfile) {
      logStep("Discord account already linked to another user", { existingUserId: existingProfile.user_id });
      return new Response(
        JSON.stringify({ 
          error: "This Discord account is already linked to another user",
          existing_username: existingProfile.display_name
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construct username (handle new username system vs legacy discriminator)
    const discordUsername = discordUser.discriminator === "0" 
      ? discordUser.username 
      : `${discordUser.username}#${discordUser.discriminator}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        discord_id: discordUser.id,
        discord_username: discordUsername,
      })
      .eq("user_id", user_id);

    if (updateError) {
      logStep("Failed to update profile", { error: updateError.message });
      return new Response(
        JSON.stringify({ error: "Failed to link Discord account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Successfully linked Discord account", { userId: user_id, discordId: discordUser.id });

    return new Response(
      JSON.stringify({
        success: true,
        discord_id: discordUser.id,
        discord_username: discordUsername,
        discord_avatar: discordUser.avatar,
        discord_global_name: discordUser.global_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Unexpected error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
