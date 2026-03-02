import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const DISCORD_GUILD_ID_REGEX = /^\d{17,20}$/;

const FREE_FEATURES = [
  "ban_check",
  "server_info",
];

const PREMIUM_FEATURES = [
  "ban_check",
  "server_info",
  "ban_add",
  "ban_remove",
  "ban_sync",
  "ban_import",
  "ban_export",
  "evidence",
  "appeal_system",
  "audit_log",
  "priority_sync",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limit
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.API, identifier: clientIp, action: 'validate-global-guard-license' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const { guild_id } = await req.json();

    if (!guild_id || !DISCORD_GUILD_ID_REGEX.test(String(guild_id))) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid guild_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedGuildId = String(guild_id);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: license, error } = await supabase
      .from("bot_installation_codes")
      .select("id, guild_id, license_status, discord_guild_name")
      .eq("guild_id", sanitizedGuildId)
      .eq("license_status", "active")
      .single();

    if (error || !license) {
      return new Response(
        JSON.stringify({ 
          valid: true, 
          licensed: false,
          tier: "free",
          features: FREE_FEATURES,
          message: "Server running in free mode. Upgrade at roleplay-hub-shop.lovable.app/guard for full features.",
          should_leave: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        valid: true,
        licensed: true,
        tier: "premium",
        features: PREMIUM_FEATURES,
        guild_name: license.discord_guild_name,
        should_leave: false 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[validate-global-guard-license] Error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
