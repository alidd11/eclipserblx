import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function logStep(step: string, details?: Record<string, unknown>) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[send-discord-webhook] ${step}${detailsStr}`);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    const guildId = Deno.env.get("DISCORD_GUILD_ID");
    const roleId = Deno.env.get("DISCORD_ROLE_ID");

    if (!botToken || !guildId || !roleId) {
      logStep("ERROR: Missing Discord configuration", {
        hasBotToken: !!botToken,
        hasGuildId: !!guildId,
        hasRoleId: !!roleId,
      });
      return new Response(
        JSON.stringify({ error: "Discord not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      user_id, 
      event, 
      subscription_end, 
      granted_by_admin = false 
    } = await req.json();

    logStep("Received request", { user_id, event, granted_by_admin });

    if (!user_id || !event) {
      return new Response(
        JSON.stringify({ error: "user_id and event are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!['subscription_activated', 'subscription_deactivated'].includes(event)) {
      return new Response(
        JSON.stringify({ error: "Invalid event type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile with Discord ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, customer_id, discord_id, discord_username')
      .eq('user_id', user_id)
      .maybeSingle();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError.message });
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile) {
      logStep("Profile not found", { user_id });
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.discord_id) {
      logStep("User has no Discord ID linked", { user_id });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "User has not linked their Discord account",
          skipped: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construct Discord API URL for role management
    const discordApiUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${profile.discord_id}/roles/${roleId}`;
    
    // Use PUT to add role, DELETE to remove role
    const method = event === 'subscription_activated' ? 'PUT' : 'DELETE';
    
    logStep("Calling Discord API", { 
      discord_id: profile.discord_id, 
      event, 
      method,
      url: discordApiUrl 
    });

    const discordResponse = await fetch(discordApiUrl, {
      method,
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Discord returns 204 No Content on success
    if (discordResponse.status === 204) {
      logStep("Discord role updated successfully", { 
        discord_id: profile.discord_id, 
        event,
        action: event === 'subscription_activated' ? 'added' : 'removed'
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Discord role ${event === 'subscription_activated' ? 'assigned' : 'removed'} successfully`,
          discord_id: profile.discord_id
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle specific Discord API errors
    const errorText = await discordResponse.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      errorJson = { message: errorText };
    }

    logStep("Discord API error", { 
      status: discordResponse.status, 
      error: errorJson,
      discord_id: profile.discord_id
    });

    // Specific error messages for common cases
    if (discordResponse.status === 404) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "User not found in Discord server. They must join the server first.",
          discord_id: profile.discord_id,
          code: "USER_NOT_IN_GUILD"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (discordResponse.status === 403) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Bot lacks permission to manage this role. Check role hierarchy.",
          discord_id: profile.discord_id,
          code: "MISSING_PERMISSIONS"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (discordResponse.status === 429) {
      const retryAfter = discordResponse.headers.get('Retry-After') || '5';
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Rate limited by Discord. Retry after ${retryAfter} seconds.`,
          discord_id: profile.discord_id,
          code: "RATE_LIMITED",
          retry_after: parseInt(retryAfter)
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generic error for other cases
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorJson.message || "Discord API error",
        discord_id: profile.discord_id,
        status: discordResponse.status
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Unexpected error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
