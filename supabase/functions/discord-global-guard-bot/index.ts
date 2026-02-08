import { createClient } from "npm:@supabase/supabase-js@2";
import nacl from "npm:tweetnacl@1.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature-ed25519, x-signature-timestamp",
};

// Discord interaction types
const INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
};

// Discord response types
const RESPONSE_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE: 4,
  DEFERRED_CHANNEL_MESSAGE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
};

// Shield colors for Global Guard branding
const COLORS = {
  PRIMARY: 0x3b82f6, // Blue
  SUCCESS: 0x22c55e, // Green
  ERROR: 0xef4444, // Red
  WARNING: 0xf59e0b, // Amber
};

// Duration parsing helper
function parseDuration(duration: string): Date | null {
  const now = new Date();
  const match = duration.match(/^(\d+)(h|d)$/);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  if (unit === 'h') {
    now.setHours(now.getHours() + value);
  } else if (unit === 'd') {
    now.setDate(now.getDate() + value);
  }
  
  return now;
}

// Extract user ID from mention or raw ID
function extractUserId(input: string): string {
  const mentionMatch = input.match(/<@!?(\d+)>/);
  if (mentionMatch) return mentionMatch[1];
  return input.replace(/\D/g, '');
}

// Verify Discord signature
function verifySignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  try {
    const message = new TextEncoder().encode(timestamp + body);
    const signatureBytes = hexToBytes(signature);
    const publicKeyBytes = hexToBytes(publicKey);
    return nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const publicKey = Deno.env.get("DISCORD_GLOBAL_GUARD_BOT_PUBLIC_KEY");
  
  if (!publicKey) {
    console.error("[global-guard-bot] Missing DISCORD_GLOBAL_GUARD_BOT_PUBLIC_KEY");
    return new Response("Server configuration error", { status: 500 });
  }

  // Verify Discord signature
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const body = await req.text();

  if (!signature || !timestamp) {
    return new Response("Missing signature headers", { status: 401 });
  }

  if (!verifySignature(body, signature, timestamp, publicKey)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Handle PING
  if (interaction.type === INTERACTION_TYPE.PING) {
    return new Response(JSON.stringify({ type: RESPONSE_TYPE.PONG }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Handle slash commands
  if (interaction.type === INTERACTION_TYPE.APPLICATION_COMMAND) {
    const commandName = interaction.data.name;
    const discordUserId = interaction.member?.user?.id || interaction.user?.id;
    const guildId = interaction.guild_id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get linked Eclipse account
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, display_name, discord_id")
      .eq("discord_id", discordUserId)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({
          type: RESPONSE_TYPE.CHANNEL_MESSAGE,
          data: {
            embeds: [
              {
                title: "🔗 Account Required",
                description: "You need to link your Discord to Eclipse first.\n\nUse `/link` to get started.",
                color: COLORS.ERROR,
              },
            ],
            flags: 64, // Ephemeral
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's tier limits
    const { data: limits } = await supabase.rpc("get_global_guard_limits", {
      _user_id: profile.user_id,
    });

    const tierInfo = limits?.[0] || { is_premium: false, max_servers: 2 };

    // ==================== GLOBALBAN COMMAND ====================
    if (commandName === "globalban") {
      const userInput = interaction.data.options?.find((o: any) => o.name === "user")?.value;
      const reason = interaction.data.options?.find((o: any) => o.name === "reason")?.value || "No reason provided";
      const duration = interaction.data.options?.find((o: any) => o.name === "duration")?.value;

      const targetUserId = extractUserId(userInput);
      if (!targetUserId) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "❌ Invalid User",
                description: "Please provide a valid Discord user ID or mention.",
                color: COLORS.ERROR,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate expiration
      let expiresAt: string | null = null;
      let banType = "permanent";
      if (duration) {
        const expDate = parseDuration(duration);
        if (expDate) {
          expiresAt = expDate.toISOString();
          banType = "temporary";
        }
      }

      // Try to fetch user info from Discord
      let bannedUsername = "Unknown User";
      let bannedAvatarUrl: string | null = null;
      try {
        const botToken = Deno.env.get("DISCORD_GLOBAL_GUARD_BOT_TOKEN");
        const userRes = await fetch(`https://discord.com/api/v10/users/${targetUserId}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          bannedUsername = userData.username;
          if (userData.avatar) {
            bannedAvatarUrl = `https://cdn.discordapp.com/avatars/${targetUserId}/${userData.avatar}.png`;
          }
        }
      } catch (e) {
        console.warn("[global-guard-bot] Could not fetch user info:", e);
      }

      // Create the global ban
      const { data: ban, error: banError } = await supabase
        .from("global_bans")
        .insert({
          owner_user_id: profile.user_id,
          banned_discord_id: targetUserId,
          banned_username: bannedUsername,
          banned_avatar_url: bannedAvatarUrl,
          reason,
          ban_type: banType,
          expires_at: expiresAt,
          created_via: "discord_command",
          is_active: true,
        })
        .select()
        .single();

      if (banError) {
        console.error("[global-guard-bot] Ban insert error:", banError);
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "❌ Ban Failed",
                description: banError.message || "Could not create global ban.",
                color: COLORS.ERROR,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Trigger sync in background
      supabase.functions.invoke("sync-global-bans", {
        body: { ban_id: ban.id, action: "ban" },
      }).catch(console.error);

      return new Response(
        JSON.stringify({
          type: RESPONSE_TYPE.CHANNEL_MESSAGE,
          data: {
            embeds: [{
              title: "🛡️ Global Ban Created",
              description: `**${bannedUsername}** has been globally banned.`,
              color: COLORS.SUCCESS,
              fields: [
                { name: "User ID", value: targetUserId, inline: true },
                { name: "Type", value: banType === "permanent" ? "Permanent" : `Expires <t:${Math.floor(new Date(expiresAt!).getTime() / 1000)}:R>`, inline: true },
                { name: "Reason", value: reason, inline: false },
              ],
              thumbnail: bannedAvatarUrl ? { url: bannedAvatarUrl } : undefined,
              footer: { text: tierInfo.is_premium ? "Eclipse+ • Priority Sync" : "Global Guard • Free Tier" },
            }],
            flags: 64,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== GLOBALUNBAN COMMAND ====================
    if (commandName === "globalunban") {
      const userInput = interaction.data.options?.find((o: any) => o.name === "user")?.value;
      const targetUserId = extractUserId(userInput);

      if (!targetUserId) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "❌ Invalid User",
                description: "Please provide a valid Discord user ID or mention.",
                color: COLORS.ERROR,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find active ban
      const { data: ban, error: findError } = await supabase
        .from("global_bans")
        .select("*")
        .eq("owner_user_id", profile.user_id)
        .eq("banned_discord_id", targetUserId)
        .eq("is_active", true)
        .single();

      if (findError || !ban) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "❌ No Active Ban",
                description: `No active global ban found for user ID \`${targetUserId}\`.`,
                color: COLORS.ERROR,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deactivate the ban
      const { error: updateError } = await supabase
        .from("global_bans")
        .update({ is_active: false })
        .eq("id", ban.id);

      if (updateError) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "❌ Unban Failed",
                description: updateError.message,
                color: COLORS.ERROR,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Trigger sync in background
      supabase.functions.invoke("sync-global-bans", {
        body: { ban_id: ban.id, action: "unban" },
      }).catch(console.error);

      return new Response(
        JSON.stringify({
          type: RESPONSE_TYPE.CHANNEL_MESSAGE,
          data: {
            embeds: [{
              title: "✅ Global Ban Removed",
              description: `**${ban.banned_username}** has been unbanned across all servers.`,
              color: COLORS.SUCCESS,
              fields: [
                { name: "User ID", value: targetUserId, inline: true },
              ],
              footer: { text: "Global Guard" },
            }],
            flags: 64,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== GLOBALBANS COMMAND ====================
    if (commandName === "globalbans") {
      const { data: bans, error: bansError } = await supabase
        .from("global_bans")
        .select("*")
        .eq("owner_user_id", profile.user_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (bansError || !bans || bans.length === 0) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "🛡️ Global Bans",
                description: "You have no active global bans.",
                color: COLORS.PRIMARY,
                footer: { text: tierInfo.is_premium ? "Eclipse+ Member" : "Free Tier • 2 servers max" },
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const banList = bans.map((b, i) => {
        const expiry = b.expires_at 
          ? `Expires <t:${Math.floor(new Date(b.expires_at).getTime() / 1000)}:R>` 
          : "Permanent";
        return `**${i + 1}.** ${b.banned_username} (\`${b.banned_discord_id}\`)\n   └ ${expiry} • ${b.reason?.slice(0, 50) || "No reason"}`;
      }).join("\n\n");

      return new Response(
        JSON.stringify({
          type: RESPONSE_TYPE.CHANNEL_MESSAGE,
          data: {
            embeds: [{
              title: "🛡️ Your Global Bans",
              description: banList,
              color: COLORS.PRIMARY,
              footer: { 
                text: tierInfo.is_premium 
                  ? `Eclipse+ • ${bans.length} active bans` 
                  : `Free Tier • ${bans.length} active bans • 2 servers max` 
              },
            }],
            flags: 64,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown command
    return new Response(
      JSON.stringify({
        type: RESPONSE_TYPE.CHANNEL_MESSAGE,
        data: {
          content: "Unknown command.",
          flags: 64,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response("Unhandled interaction type", { status: 400 });
});
