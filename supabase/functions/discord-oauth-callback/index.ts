import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[DISCORD-OAUTH] ${step}`, details ? JSON.stringify(details) : "");
};

// Whitelist of allowed redirect origins
const ALLOWED_REDIRECT_ORIGINS = [
  'https://eclipserblx.com',
  'https://www.eclipserblx.com',
  'http://localhost:5173',
  'http://localhost:8080',
];

function isValidRedirectUri(uri: string | undefined | null): boolean {
  if (!uri || typeof uri !== 'string') return false;
  try {
    const parsed = new URL(uri);
    return ALLOWED_REDIRECT_ORIGINS.some(o => uri.startsWith(o)) ||
      parsed.hostname.endsWith('.lovable.app');
  } catch {
    return false;
  }
}

const DISCORD_ID_REGEX = /^\d{17,20}$/;

async function assignDiscordRole(
  botToken: string,
  guildId: string,
  roleId: string,
  discordUserId: string,
  roleName: string
): Promise<{ success: boolean; error?: string }> {
  const discordApiUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`;
  
  logStep(`Assigning ${roleName} role`, { discordUserId, roleId });
  
  const response = await fetch(discordApiUrl, {
    method: "PUT",
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 204) {
    logStep(`${roleName} role assigned successfully`, { discordUserId });
    return { success: true };
  }

  if (response.status === 404) {
    logStep(`User not in guild for ${roleName}`, { discordUserId });
    return { success: false, error: "User not in server" };
  }

  const errorText = await response.text();
  logStep(`Failed to assign ${roleName} role`, { status: response.status, error: errorText });
  return { success: false, error: errorText };
}

async function removeDiscordRole(
  botToken: string,
  guildId: string,
  roleId: string,
  discordUserId: string,
  roleName: string
): Promise<{ success: boolean; error?: string }> {
  const discordApiUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`;
  
  logStep(`Removing ${roleName} role`, { discordUserId, roleId });
  
  const response = await fetch(discordApiUrl, {
    method: "DELETE",
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 204) {
    logStep(`${roleName} role removed successfully`, { discordUserId });
    return { success: true };
  }

  if (response.status === 404) {
    logStep(`User not in guild or doesn't have ${roleName} role`, { discordUserId });
    return { success: false, error: "User not in server or role not found" };
  }

  const errorText = await response.text();
  logStep(`Failed to remove ${roleName} role`, { status: response.status, error: errorText });
  return { success: false, error: errorText };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit - auth endpoints are sensitive
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'discord-oauth-callback' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const { code, redirect_uri, user_id } = await req.json();

    // Validate inputs
    if (!code || typeof code !== 'string' || code.length > 200) {
      return new Response(
        JSON.stringify({ error: "Valid authorization code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user_id || typeof user_id !== 'string') {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(user_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid user ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CRITICAL: Verify the calling user's JWT matches the user_id
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify JWT - the caller must be the same user as user_id
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent user_id spoofing - calling user must match the requested user_id
    if (callingUser.id !== user_id) {
      console.error(`User ID mismatch: caller=${callingUser.id}, requested=${user_id}`);
      return new Response(
        JSON.stringify({ error: "Forbidden - user mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate redirect_uri
    const safeRedirectUri = isValidRedirectUri(redirect_uri) ? redirect_uri : 'https://eclipserblx.com/auth/discord/callback';

    logStep("Starting OAuth token exchange");

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
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: safeRedirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logStep("Token exchange failed", { status: tokenResponse.status });
      return new Response(
        JSON.stringify({ error: "Failed to exchange authorization code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    logStep("Token exchange successful");

    // Fetch user info from Discord
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      logStep("Failed to fetch Discord user", { status: userResponse.status });
      return new Response(
        JSON.stringify({ error: "Failed to fetch Discord user info" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const discordUser = await userResponse.json();

    // Validate Discord user data
    if (!discordUser.id || !DISCORD_ID_REGEX.test(discordUser.id)) {
      return new Response(
        JSON.stringify({ error: "Invalid Discord user data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Fetched Discord user", { id: discordUser.id, username: discordUser.username });

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
      logStep("Discord account already linked to another user");
      return new Response(
        JSON.stringify({ 
          error: "This Discord account is already linked to another user",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize username
    const discordUsername = (discordUser.discriminator === "0" 
      ? discordUser.username 
      : `${discordUser.username}#${discordUser.discriminator}`
    ).slice(0, 100);

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

    // Check for role assignments
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    const guildId = Deno.env.get("DISCORD_GUILD_ID");
    const storeCreatorRoleId = Deno.env.get("DISCORD_STORE_CREATOR_ROLE_ID");

    const rolesAssigned: string[] = [];

    if (botToken && guildId) {
      // Check if user is a store owner
      if (storeCreatorRoleId) {
        const { data: store } = await supabase
          .from("stores")
          .select("id, name, is_verified")
          .eq("owner_id", user_id)
          .eq("is_active", true)
          .maybeSingle();

        if (store) {
          const result = await assignDiscordRole(botToken, guildId, storeCreatorRoleId, discordUser.id, "Store Creator");
          if (result.success) rolesAssigned.push("Store Creator");

          if (store.is_verified) {
            const verifiedSellerRoleId = Deno.env.get("DISCORD_VERIFIED_SELLER_ROLE_ID");
            if (verifiedSellerRoleId) {
              const vResult = await assignDiscordRole(botToken, guildId, verifiedSellerRoleId, discordUser.id, "Verified Seller");
              if (vResult.success) rolesAssigned.push("Verified Seller");
            }
          }
        }
      }

      // Check purchase count for Customer/Loyal Customer roles
      const customerRoleId = Deno.env.get("DISCORD_CUSTOMER_ROLE_ID");
      const loyalCustomerRoleId = Deno.env.get("DISCORD_LOYAL_CUSTOMER_ROLE_ID");
      
      if (customerRoleId || loyalCustomerRoleId) {
        const { count, error: ordersError } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user_id)
          .in("status", ["paid", "completed"]);

        const orderCount = count || 0;

        if (!ordersError && orderCount > 0) {
          if (orderCount >= 5 && loyalCustomerRoleId) {
            const result = await assignDiscordRole(botToken, guildId, loyalCustomerRoleId, discordUser.id, "Loyal Customer");
            if (result.success) rolesAssigned.push("Loyal Customer");
            if (customerRoleId) await removeDiscordRole(botToken, guildId, customerRoleId, discordUser.id, "Customer");
          } else if (customerRoleId) {
            const result = await assignDiscordRole(botToken, guildId, customerRoleId, discordUser.id, "Customer");
            if (result.success) rolesAssigned.push("Customer");
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        discord_id: discordUser.id,
        discord_username: discordUsername,
        discord_avatar: discordUser.avatar,
        discord_global_name: discordUser.global_name,
        roles_assigned: rolesAssigned,
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
