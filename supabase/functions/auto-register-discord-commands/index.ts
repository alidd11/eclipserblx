import { createClient } from "npm:@supabase/supabase-js@2";

// Automated Discord command registration - runs daily via cron
// This ensures commands are always properly registered even after Discord outages or drift

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  console.log("[auto-register-discord-commands] Starting automated command registration...");

  try {
    const results: { portalBot?: any; funBot?: any; globalGuardBot?: any; errors: string[] } = { errors: [] };

    // 1. Register Portal Bot commands
    try {
      const portalResponse = await fetch(`${supabaseUrl}/functions/v1/register-discord-commands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": supabaseServiceKey,
        },
        body: JSON.stringify({}),
      });

      if (portalResponse.ok) {
        results.portalBot = await portalResponse.json();
        console.log("[auto-register-discord-commands] Portal Bot commands registered:", results.portalBot.commands?.length);
      } else {
        const errorText = await portalResponse.text();
        results.errors.push(`Portal Bot: ${errorText}`);
        console.error("[auto-register-discord-commands] Portal Bot registration failed:", errorText);
      }
    } catch (err) {
      results.errors.push(`Portal Bot: ${err}`);
      console.error("[auto-register-discord-commands] Portal Bot error:", err);
    }

    // 2. Register Fun Bot commands
    try {
      const funResponse = await fetch(`${supabaseUrl}/functions/v1/register-fun-bot-commands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": supabaseServiceKey,
        },
        body: JSON.stringify({}),
      });

      if (funResponse.ok) {
        results.funBot = await funResponse.json();
        console.log("[auto-register-discord-commands] Fun Bot commands registered:", results.funBot.commands?.length);
      } else {
        const errorText = await funResponse.text();
        results.errors.push(`Fun Bot: ${errorText}`);
        console.error("[auto-register-discord-commands] Fun Bot registration failed:", errorText);
      }
    } catch (err) {
      results.errors.push(`Fun Bot: ${err}`);
      console.error("[auto-register-discord-commands] Fun Bot error:", err);
    }

    // 3. Register Global Guard Bot commands
    try {
      const guardResponse = await fetch(`${supabaseUrl}/functions/v1/register-global-guard-commands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": supabaseServiceKey,
        },
        body: JSON.stringify({}),
      });

      if (guardResponse.ok) {
        results.globalGuardBot = await guardResponse.json();
        console.log("[auto-register-discord-commands] Global Guard Bot commands registered:", results.globalGuardBot.global_commands?.length);
      } else {
        const errorText = await guardResponse.text();
        results.errors.push(`Global Guard Bot: ${errorText}`);
        console.error("[auto-register-discord-commands] Global Guard Bot registration failed:", errorText);
      }
    } catch (err) {
      results.errors.push(`Global Guard Bot: ${err}`);
      console.error("[auto-register-discord-commands] Global Guard Bot error:", err);
    }

    // Log the registration to audit
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from("audit_logs").insert({
      action: "auto_register_discord_commands",
      resource: "discord_commands",
      details: {
        portal_bot_commands: results.portalBot?.commands?.length || 0,
        fun_bot_commands: results.funBot?.commands?.length || 0,
        global_guard_commands: results.globalGuardBot?.global_commands?.length || 0,
        store_guilds: results.portalBot?.store_guilds?.length || 0,
        errors: results.errors,
      },
    });

    const success = results.errors.length === 0;
    console.log(`[auto-register-discord-commands] Complete. Success: ${success}, Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success,
        message: success 
          ? "All Discord commands registered successfully" 
          : "Some registrations failed",
        portal_bot: results.portalBot ? {
          commands: results.portalBot.commands?.length || 0,
          store_guilds: results.portalBot.store_guilds?.length || 0,
        } : null,
        fun_bot: results.funBot ? {
          commands: results.funBot.commands?.length || 0,
        } : null,
        global_guard_bot: results.globalGuardBot ? {
          commands: results.globalGuardBot.global_commands?.length || 0,
          guild_registrations: results.globalGuardBot.guild_registrations || 0,
        } : null,
        errors: results.errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[auto-register-discord-commands] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
