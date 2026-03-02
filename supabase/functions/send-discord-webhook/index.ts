import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOG = (step: string, d?: Record<string, unknown>) => {
  const s = d ? ` - ${JSON.stringify(d)}` : '';
  console.log(`[send-discord-webhook] ${step}${s}`);
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'send-discord-webhook' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    // Auth guard: require service-role or authenticated staff
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    // Allow service-role calls (internal)
    const isServiceRole = token === supabaseServiceKey;

    if (!isServiceRole) {
      // Verify caller is authenticated staff
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims?.sub) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = claimsData.claims.sub;
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", userId);
      const staffRoles = new Set(["admin", "owner", "moderator"]);
      const isStaff = roles?.some((r: any) => staffRoles.has(r.role));
      if (!isStaff) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    const guildId = Deno.env.get("DISCORD_GUILD_ID");
    const roleId = Deno.env.get("DISCORD_ROLE_ID");

    if (!botToken || !guildId || !roleId) {
      LOG("ERROR: Missing Discord configuration");
      return new Response(
        JSON.stringify({ error: "Discord not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, event, subscription_end, granted_by_admin = false } = await req.json();

    // Validate inputs
    if (!user_id || !UUID_RE.test(user_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!['subscription_activated', 'subscription_deactivated'].includes(event)) {
      return new Response(
        JSON.stringify({ error: "Invalid event type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    LOG("Processing", { user_id, event });

    // Get user profile with Discord ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, customer_id, discord_id, discord_username')
      .eq('user_id', user_id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.discord_id) {
      return new Response(
        JSON.stringify({ success: false, message: "User has not linked their Discord account", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Manage Discord role
    const discordApiUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${profile.discord_id}/roles/${roleId}`;
    const method = event === 'subscription_activated' ? 'PUT' : 'DELETE';

    const discordResponse = await fetch(discordApiUrl, {
      method,
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (discordResponse.status === 204) {
      LOG("Discord role updated", {
        discord_id: profile.discord_id,
        action: event === 'subscription_activated' ? 'added' : 'removed',
      });
      return new Response(
        JSON.stringify({
          success: true,
          message: `Discord role ${event === 'subscription_activated' ? 'assigned' : 'removed'} successfully`,
          discord_id: profile.discord_id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle Discord API errors
    const errorText = await discordResponse.text();
    let errorJson: any;
    try { errorJson = JSON.parse(errorText); } catch { errorJson = { message: errorText }; }

    LOG("Discord API error", { status: discordResponse.status });

    if (discordResponse.status === 404) {
      return new Response(
        JSON.stringify({ success: false, error: "User not found in Discord server.", code: "USER_NOT_IN_GUILD" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (discordResponse.status === 403) {
      return new Response(
        JSON.stringify({ success: false, error: "Bot lacks permission to manage this role.", code: "MISSING_PERMISSIONS" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (discordResponse.status === 429) {
      const retryAfter = discordResponse.headers.get('Retry-After') || '5';
      return new Response(
        JSON.stringify({ success: false, error: "Rate limited by Discord.", code: "RATE_LIMITED", retry_after: parseInt(retryAfter) }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Discord API error", status: discordResponse.status }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    LOG("ERROR", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
