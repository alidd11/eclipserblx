import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API_BASE = "https://discord.com/api/v10";

interface BotControlRequest {
  action: "guild-channels" | "guild-roles";
  guild_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !authData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authData.claims.sub as string;

    const { action, guild_id } = (await req.json()) as BotControlRequest;
    if (!action || !guild_id) {
      return new Response(JSON.stringify({ error: "Missing action or guild_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit({
      ...RATE_LIMITS.READ,
      identifier: `${userId}:${clientIp}`,
      action: "bot-control",
    });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck, corsHeaders);
    }

    // Only allow querying a guild the caller actually owns or is an accepted team member on
    const { data: ownedStore } = await supabase
      .from("stores")
      .select("id")
      .eq("discord_guild_id", guild_id)
      .eq("owner_id", userId)
      .maybeSingle();

    let authorized = !!ownedStore;
    if (!authorized) {
      const { data: teamStore } = await supabase
        .from("stores")
        .select("id, store_team_members!inner(user_id, accepted_at)")
        .eq("discord_guild_id", guild_id)
        .eq("store_team_members.user_id", userId)
        .not("store_team_members.accepted_at", "is", null)
        .maybeSingle();
      authorized = !!teamStore;
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "You do not have access to this Discord server" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    if (!botToken) {
      console.error("[bot-control] DISCORD_CUSTOMER_BOT_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Bot is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = action === "guild-channels" ? "channels" : "roles";
    const discordResponse = await fetch(`${DISCORD_API_BASE}/guilds/${guild_id}/${endpoint}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error(`[bot-control] Discord API error (${endpoint}):`, discordResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "The bot may not be installed on this server, or lacks access" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const discordData = await discordResponse.json();

    if (action === "guild-channels") {
      // Text-capable channel types: 0 = text, 5 = announcement, 15 = forum
      const channels = (discordData as any[])
        .filter((c) => [0, 5, 15].includes(c.type))
        .map((c) => ({ id: c.id, name: c.name, type: c.type, position: c.position }))
        .sort((a, b) => a.position - b.position);
      return new Response(JSON.stringify({ channels }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roles = (discordData as any[])
      .filter((r) => r.name !== "@everyone")
      .map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position }))
      .sort((a, b) => b.position - a.position);
    return new Response(JSON.stringify({ roles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[bot-control] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
