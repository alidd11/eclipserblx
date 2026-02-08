import { createClient } from "npm:@supabase/supabase-js@2";

// Sync Global Bans - Propagates bans across all servers where user has licensed bots
// Uses DISCORD_CUSTOMER_BOT_TOKEN to execute bans via Discord API

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BanSyncRequest {
  banId: string;
  action: "ban" | "unban";
  userId?: string; // Eclipse user ID - if provided, only sync for this user's servers
}

interface SyncResult {
  guildId: string;
  guildName: string | null;
  status: "success" | "failed" | "missing_permissions";
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (!botToken) {
    console.error("[sync-global-bans] DISCORD_CUSTOMER_BOT_TOKEN not configured");
    return new Response(
      JSON.stringify({ error: "Bot token not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: BanSyncRequest = await req.json();
    const { banId, action, userId } = body;

    if (!banId) {
      return new Response(
        JSON.stringify({ error: "Ban ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-global-bans] Processing ${action} for ban ${banId}`);

    // Get the ban details
    const { data: ban, error: banError } = await supabase
      .from("global_bans")
      .select("*")
      .eq("id", banId)
      .single();

    if (banError || !ban) {
      console.error("[sync-global-bans] Ban not found:", banError);
      return new Response(
        JSON.stringify({ error: "Ban not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's linked Discord ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("discord_id")
      .eq("user_id", ban.owner_user_id)
      .single();

    if (profileError || !profile?.discord_id) {
      console.error("[sync-global-bans] User profile not found or no Discord linked");
      return new Response(
        JSON.stringify({ error: "User must have Discord linked to use Global Guard" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all servers where user has active bot licenses
    const { data: installations, error: installError } = await supabase
      .from("bot_installation_codes")
      .select("guild_id, discord_guild_name")
      .eq("user_id", ban.owner_user_id)
      .eq("license_status", "active")
      .not("guild_id", "is", null);

    if (installError) {
      console.error("[sync-global-bans] Failed to get installations:", installError);
      return new Response(
        JSON.stringify({ error: "Failed to get server list" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!installations || installations.length === 0) {
      console.log("[sync-global-bans] No servers found for user");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No servers to sync",
          synced: 0,
          results: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate by guild_id
    const uniqueGuilds = new Map<string, string | null>();
    installations.forEach(i => {
      if (i.guild_id && !uniqueGuilds.has(i.guild_id)) {
        uniqueGuilds.set(i.guild_id, i.discord_guild_name);
      }
    });

    // Check user's tier limits
    const { data: limits } = await supabase.rpc("get_global_guard_limits", { 
      _user_id: ban.owner_user_id 
    });
    
    const isPremium = limits?.[0]?.is_premium ?? false;
    const maxServers = limits?.[0]?.max_servers ?? 2;
    const hasPrioritySync = limits?.[0]?.has_priority_sync ?? false;

    // Limit servers for free users
    let guildsToSync = Array.from(uniqueGuilds.entries());
    let limitedGuilds: string[] = [];
    
    if (!isPremium && maxServers !== null && guildsToSync.length > maxServers) {
      limitedGuilds = guildsToSync.slice(maxServers).map(([id]) => id);
      guildsToSync = guildsToSync.slice(0, maxServers);
      console.log(`[sync-global-bans] Free tier: limiting to ${maxServers} servers, ${limitedGuilds.length} excluded`);
    }

    console.log(`[sync-global-bans] Syncing to ${guildsToSync.length} servers (premium: ${isPremium}, priority: ${hasPrioritySync})`);

    const results: SyncResult[] = [];

    // Process each server
    for (const [guildId, guildName] of guildsToSync) {
      const result = await syncBanToGuild(
        botToken,
        guildId,
        ban.banned_discord_id,
        action,
        ban.reason
      );

      results.push({
        guildId,
        guildName,
        status: result.status,
        error: result.error,
      });

      // Record sync status
      await supabase.from("global_ban_sync_status").upsert({
        ban_id: banId,
        guild_id: guildId,
        guild_name: guildName,
        status: result.status,
        error_message: result.error || null,
        synced_at: new Date().toISOString(),
      }, {
        onConflict: "ban_id,guild_id",
      });

      // Log the action
      await supabase.from("global_ban_logs").insert({
        ban_id: banId,
        action: action === "ban" ? "synced" : "unsynced",
        guild_id: guildId,
        performed_by: ban.owner_user_id,
        details: { 
          status: result.status, 
          error: result.error,
          guild_name: guildName,
        },
      });

      // Delay: priority sync gets faster processing
      const delayMs = hasPrioritySync ? 100 : 300;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Record skipped servers for free tier
    for (const guildId of limitedGuilds) {
      const guildName = uniqueGuilds.get(guildId) || null;
      results.push({
        guildId,
        guildName,
        status: "failed",
        error: "Server limit exceeded - upgrade to Eclipse+ for unlimited servers",
      });
    }

    const successCount = results.filter(r => r.status === "success").length;
    const failedCount = results.filter(r => r.status === "failed").length;
    const permissionCount = results.filter(r => r.status === "missing_permissions").length;

    console.log(`[sync-global-bans] Completed: ${successCount} success, ${failedCount} failed, ${permissionCount} missing permissions`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: successCount,
        failed: failedCount,
        missingPermissions: permissionCount,
        total: guildsToSync.length,
        limitedServers: limitedGuilds.length,
        isPremium,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[sync-global-bans] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function syncBanToGuild(
  botToken: string,
  guildId: string,
  discordUserId: string,
  action: "ban" | "unban",
  reason?: string | null
): Promise<{ status: "success" | "failed" | "missing_permissions"; error?: string }> {
  try {
    const url = `https://discord.com/api/v10/guilds/${guildId}/bans/${discordUserId}`;
    
    const options: RequestInit = {
      method: action === "ban" ? "PUT" : "DELETE",
      headers: {
        "Authorization": `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
    };

    if (action === "ban") {
      options.body = JSON.stringify({
        delete_message_seconds: 0, // Don't delete messages
        reason: reason ? `[Global Guard] ${reason}`.substring(0, 512) : "[Global Guard] Global ban",
      });
    }

    const response = await fetch(url, options);

    if (response.ok || response.status === 204) {
      console.log(`[sync-global-bans] ${action} successful for ${discordUserId} in ${guildId}`);
      return { status: "success" };
    }

    const errorText = await response.text();
    console.error(`[sync-global-bans] Discord API error ${response.status}:`, errorText);

    // Check for permission errors
    if (response.status === 403) {
      return { 
        status: "missing_permissions", 
        error: "Bot lacks ban permissions in this server" 
      };
    }

    // User not found or already banned/unbanned
    if (response.status === 404 && action === "unban") {
      return { status: "success" }; // Already unbanned
    }

    return { 
      status: "failed", 
      error: `Discord API error: ${response.status}` 
    };
  } catch (error) {
    console.error(`[sync-global-bans] Error syncing to ${guildId}:`, error);
    return { 
      status: "failed", 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
