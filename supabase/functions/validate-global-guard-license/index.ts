import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

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
      console.log(`[validate-global-guard-license] No valid license for guild ${guild_id}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          reason: "No active license found for this server",
          should_leave: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[validate-global-guard-license] Valid license found for ${license.discord_guild_name}`);
    return new Response(
      JSON.stringify({ 
        valid: true, 
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
