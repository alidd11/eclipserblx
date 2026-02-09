import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Define which features are available for each tier
const FREE_FEATURES = [
  "ban_check",      // Can check if user is banned
  "server_info",    // Basic server info
];

const PREMIUM_FEATURES = [
  "ban_check",
  "server_info",
  "ban_add",        // Add bans
  "ban_remove",     // Remove bans
  "ban_sync",       // Sync bans across servers
  "ban_import",     // Import ban lists
  "ban_export",     // Export ban lists
  "evidence",       // Attach evidence to bans
  "appeal_system",  // Ban appeal handling
  "audit_log",      // Full audit logging
  "priority_sync",  // Priority ban synchronization
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { guild_id } = await req.json();

    if (!guild_id) {
      return new Response(
        JSON.stringify({ valid: false, error: "Missing guild_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[validate-global-guard-license] Checking license for guild: ${guild_id}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check for active license
    const { data: license, error } = await supabase
      .from("bot_installation_codes")
      .select("id, guild_id, license_status, discord_guild_name")
      .eq("guild_id", guild_id)
      .eq("license_status", "active")
      .single();

    if (error || !license) {
      console.log(`[validate-global-guard-license] No active license for guild ${guild_id} - returning free tier`);
      
      // Return free tier access instead of rejecting
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

    console.log(`[validate-global-guard-license] Valid license found for ${license.discord_guild_name}`);
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