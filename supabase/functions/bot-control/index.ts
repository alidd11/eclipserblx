import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISCORD_API = "https://discord.com/api/v10";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate admin JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = claimsData.claims.sub as string;

    // Check admin role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const BOT_TOKEN = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    if (!BOT_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Bot token not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "list-guilds": {
        const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
          headers: { Authorization: `Bot ${BOT_TOKEN}` },
        });
        const guilds = await res.json();
        return new Response(JSON.stringify({ guilds }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "guild-channels": {
        const { guild_id } = body;
        if (!guild_id) {
          return new Response(
            JSON.stringify({ error: "guild_id required" }),
            { status: 400, headers: corsHeaders }
          );
        }
        const res = await fetch(
          `${DISCORD_API}/guilds/${guild_id}/channels`,
          { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
        );
        const channels = await res.json();
        // Filter to text channels only (type 0)
        const textChannels = Array.isArray(channels)
          ? channels.filter((c: any) => c.type === 0)
          : [];
        return new Response(JSON.stringify({ channels: textChannels }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send-message": {
        const { channel_id, content, embed } = body;
        if (!channel_id || (!content && !embed)) {
          return new Response(
            JSON.stringify({ error: "channel_id and content/embed required" }),
            { status: 400, headers: corsHeaders }
          );
        }
        const msgBody: any = {};
        if (content) msgBody.content = content;
        if (embed) msgBody.embeds = [embed];

        const res = await fetch(
          `${DISCORD_API}/channels/${channel_id}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(msgBody),
          }
        );
        const msg = await res.json();
        return new Response(JSON.stringify({ message: msg }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "register-commands": {
        const APP_ID = Deno.env.get("DISCORD_CUSTOMER_BOT_CLIENT_ID");
        if (!APP_ID) {
          return new Response(
            JSON.stringify({ error: "Bot client ID not configured" }),
            { status: 500, headers: corsHeaders }
          );
        }

        // Get enabled commands from DB
        const { data: cmdSettings } = await adminClient
          .from("bot_command_settings")
          .select("command_name, enabled");

        const enabledMap = new Map(
          (cmdSettings || []).map((c: any) => [c.command_name, c.enabled])
        );

        // Full command definitions
        const allCommands = getCommandDefinitions();
        const enabledCommands = allCommands.filter(
          (cmd: any) => enabledMap.get(cmd.name) !== false
        );

        const res = await fetch(
          `${DISCORD_API}/applications/${APP_ID}/commands`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bot ${BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(enabledCommands),
          }
        );
        const result = await res.json();
        return new Response(
          JSON.stringify({
            registered: Array.isArray(result) ? result.length : 0,
            commands: result,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      case "bot-health": {
        const { data: hostSetting } = await adminClient
          .from("bot_settings")
          .select("value")
          .eq("key", "bot_host_url")
          .maybeSingle();

        const hostUrl = hostSetting?.value;
        if (!hostUrl) {
          return new Response(
            JSON.stringify({
              online: false,
              error: "Bot host URL not configured",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(`${hostUrl}/health`, {
            signal: controller.signal,
          });
          clearTimeout(timeout);
          const health = await res.json();
          return new Response(
            JSON.stringify({ online: true, ...health }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } catch {
          return new Response(
            JSON.stringify({ online: false, error: "Bot unreachable" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      case "guild-roles": {
        const { guild_id } = body;
        if (!guild_id) {
          return new Response(
            JSON.stringify({ error: "guild_id required" }),
            { status: 400, headers: corsHeaders }
          );
        }
        const res = await fetch(
          `${DISCORD_API}/guilds/${guild_id}/roles`,
          { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
        );
        const roles = await res.json();
        // Filter out @everyone and bot roles, sort by position desc
        const filteredRoles = Array.isArray(roles)
          ? roles
              .filter((r: any) => r.name !== "@everyone" && !r.managed)
              .sort((a: any, b: any) => b.position - a.position)
              .map((r: any) => ({
                id: r.id,
                name: r.name,
                color: r.color,
                position: r.position,
              }))
          : [];
        return new Response(JSON.stringify({ roles: filteredRoles }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: corsHeaders }
        );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function getCommandDefinitions() {
  return [
    { name: "link", description: "Check if your Discord is linked to your Eclipse account" },
    { name: "verify", description: "Link your Discord using a verification code", options: [{ name: "code", description: "Your verification code from Eclipse", type: 3, required: true }] },
    { name: "profile", description: "View your Eclipse profile and stats" },
    { name: "purchases", description: "View your recent purchases" },
    { name: "retrieve", description: "Get a download link for a purchased product", options: [{ name: "product", description: "Product name to download", type: 3, required: false }] },
    { name: "getrole", description: "Sync your Discord roles based on your Eclipse account" },
    { name: "store", description: "View this server's store information" },
    { name: "unlink", description: "Disconnect your Discord from your Eclipse account" },
    { name: "showcase", description: "Showcase your store or product" },
    { name: "walletbalance", description: "Check your Eclipse wallet balance (sent via DM)" },
    { name: "help", description: "View all available bot commands" },
    { name: "update", description: "Admin: sync Eclipse roles for a user", options: [{ name: "user", description: "The user to sync roles for", type: 6, required: true }] },
    { name: "globalban", description: "Ban a user across all your servers (Global Guard)", options: [
      { name: "user", description: "Discord user ID or @mention", type: 3, required: true },
      { name: "reason", description: "Reason for the ban", type: 3, required: false },
      { name: "duration", description: "Ban duration (leave empty for permanent)", type: 3, required: false, choices: [
        { name: "1 Hour", value: "1h" }, { name: "12 Hours", value: "12h" },
        { name: "1 Day", value: "1d" }, { name: "7 Days", value: "7d" },
        { name: "30 Days", value: "30d" }, { name: "90 Days", value: "90d" },
      ] },
    ] },
    { name: "globalunban", description: "Remove a global ban from a user", options: [{ name: "user", description: "Discord user ID or @mention", type: 3, required: true }] },
    { name: "globalbans", description: "View your active global bans" },
    { name: "daily", description: "Claim your daily XP reward (streak bonuses!)" },
    { name: "leaderboard", description: "View the Eclipse XP leaderboard" },
    { name: "balance", description: "View your Eclipse credits and XP in one place" },
    { name: "newdrops", description: "View the latest product drops on Eclipse" },
  ];
}
