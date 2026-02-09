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

    // Rate limiting for free tier users (6 commands per 24 hours)
    const FREE_TIER_LIMIT = 6;
    const RATE_LIMIT_WINDOW = 1440; // 24 hours in minutes
    
    if (!tierInfo.is_premium) {
      const { data: canProceed } = await supabase.rpc("check_rate_limit", {
        p_identifier: `gg_${discordUserId}`,
        p_action_type: "global_guard_command",
        p_max_requests: FREE_TIER_LIMIT,
        p_window_minutes: RATE_LIMIT_WINDOW,
      });

      if (!canProceed) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "⏱️ Daily Limit Reached",
                description: `You've used all **${FREE_TIER_LIMIT} commands** for today.\n\nUpgrade to **Eclipse+** for unlimited commands!`,
                color: COLORS.WARNING,
                footer: { text: "Limit resets in 24 hours" },
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Record this command usage
      await supabase.rpc("record_rate_limit", {
        p_identifier: `gg_${discordUserId}`,
        p_action_type: "global_guard_command",
      });
    }

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

    // ==================== EVIDENCE COMMAND ====================
    if (commandName === "evidence") {
      const userInput = interaction.data.options?.find((o: any) => o.name === "user")?.value;
      const evidenceUrl = interaction.data.options?.find((o: any) => o.name === "url")?.value;
      const notes = interaction.data.options?.find((o: any) => o.name === "notes")?.value;
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

      if (!evidenceUrl && !notes) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "❌ No Evidence Provided",
                description: "Please provide at least a URL or notes.",
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

      // Update ban with evidence
      const currentEvidence = ban.evidence || [];
      const newEvidence = {
        url: evidenceUrl || null,
        notes: notes || null,
        added_at: new Date().toISOString(),
        added_by: discordUserId,
      };

      const { error: updateError } = await supabase
        .from("global_bans")
        .update({ 
          evidence: [...currentEvidence, newEvidence],
          updated_at: new Date().toISOString(),
        })
        .eq("id", ban.id);

      if (updateError) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "❌ Update Failed",
                description: updateError.message,
                color: COLORS.ERROR,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          type: RESPONSE_TYPE.CHANNEL_MESSAGE,
          data: {
            embeds: [{
              title: "📎 Evidence Added",
              description: `Evidence added to ban for **${ban.banned_username}**.`,
              color: COLORS.SUCCESS,
              fields: [
                evidenceUrl ? { name: "URL", value: evidenceUrl, inline: false } : null,
                notes ? { name: "Notes", value: notes, inline: false } : null,
              ].filter(Boolean),
              footer: { text: `Total evidence: ${currentEvidence.length + 1} items` },
            }],
            flags: 64,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== BANINFO COMMAND ====================
    if (commandName === "baninfo") {
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

      const { data: ban } = await supabase
        .from("global_bans")
        .select("*")
        .eq("owner_user_id", profile.user_id)
        .eq("banned_discord_id", targetUserId)
        .eq("is_active", true)
        .single();

      if (!ban) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "ℹ️ No Active Ban",
                description: `No active global ban found for \`${targetUserId}\`.`,
                color: COLORS.PRIMARY,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const evidenceCount = ban.evidence?.length || 0;
      const fields = [
        { name: "User ID", value: ban.banned_discord_id, inline: true },
        { name: "Username", value: ban.banned_username || "Unknown", inline: true },
        { name: "Type", value: ban.ban_type === "permanent" ? "Permanent" : "Temporary", inline: true },
        { name: "Reason", value: ban.reason || "No reason provided", inline: false },
        { name: "Created", value: `<t:${Math.floor(new Date(ban.created_at).getTime() / 1000)}:R>`, inline: true },
        ban.expires_at ? { name: "Expires", value: `<t:${Math.floor(new Date(ban.expires_at).getTime() / 1000)}:R>`, inline: true } : null,
        { name: "Evidence", value: `${evidenceCount} item(s)`, inline: true },
        { name: "Created Via", value: ban.created_via || "dashboard", inline: true },
      ].filter(Boolean);

      return new Response(
        JSON.stringify({
          type: RESPONSE_TYPE.CHANNEL_MESSAGE,
          data: {
            embeds: [{
              title: `🛡️ Ban Info: ${ban.banned_username}`,
              color: COLORS.PRIMARY,
              thumbnail: ban.banned_avatar_url ? { url: ban.banned_avatar_url } : undefined,
              fields,
              footer: { text: `Ban ID: ${ban.id.slice(0, 8)}` },
            }],
            flags: 64,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== BANHISTORY COMMAND ====================
    if (commandName === "banhistory") {
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

      const { data: bans } = await supabase
        .from("global_bans")
        .select("*")
        .eq("owner_user_id", profile.user_id)
        .eq("banned_discord_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!bans || bans.length === 0) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "📜 Ban History",
                description: `No ban history found for \`${targetUserId}\`.`,
                color: COLORS.PRIMARY,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const historyList = bans.map((b, i) => {
        const status = b.is_active ? "🟢 Active" : "⚫ Expired/Removed";
        const date = `<t:${Math.floor(new Date(b.created_at).getTime() / 1000)}:d>`;
        return `**${i + 1}.** ${status} • ${date}\n   └ ${b.reason?.slice(0, 40) || "No reason"}${b.reason?.length > 40 ? "..." : ""}`;
      }).join("\n\n");

      return new Response(
        JSON.stringify({
          type: RESPONSE_TYPE.CHANNEL_MESSAGE,
          data: {
            embeds: [{
              title: `📜 Ban History: ${bans[0]?.banned_username || targetUserId}`,
              description: historyList,
              color: COLORS.PRIMARY,
              footer: { text: `${bans.length} record(s) found` },
            }],
            flags: 64,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== IMPORTBANS COMMAND ====================
    if (commandName === "importbans") {
      const urlInput = interaction.data.options?.find((o: any) => o.name === "url")?.value;

      if (!urlInput) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "📥 Import Bans",
                description: "To import bans, provide a URL to a JSON file with this format:\n```json\n[\n  {\n    \"user_id\": \"123456789\",\n    \"reason\": \"Spam\"\n  }\n]\n```\nOr visit your dashboard to import via file upload.",
                color: COLORS.PRIMARY,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const response = await fetch(urlInput);
        if (!response.ok) throw new Error("Failed to fetch URL");
        
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Invalid format - expected array");

        let imported = 0;
        let skipped = 0;

        for (const item of data.slice(0, 50)) { // Limit to 50 at a time
          const userId = item.user_id || item.userId || item.id;
          if (!userId) { skipped++; continue; }

          const { error } = await supabase
            .from("global_bans")
            .insert({
              owner_user_id: profile.user_id,
              banned_discord_id: String(userId),
              banned_username: item.username || "Imported User",
              reason: item.reason || "Imported ban",
              ban_type: "permanent",
              created_via: "discord_import",
              is_active: true,
            });

          if (error) { skipped++; } else { imported++; }
        }

        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "📥 Import Complete",
                description: `Successfully imported **${imported}** ban(s).\n${skipped > 0 ? `Skipped: ${skipped} (duplicates or errors)` : ""}`,
                color: imported > 0 ? COLORS.SUCCESS : COLORS.WARNING,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "❌ Import Failed",
                description: `Could not import bans: ${e.message}`,
                color: COLORS.ERROR,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ==================== EXPORTBANS COMMAND ====================
    if (commandName === "exportbans") {
      const { data: bans } = await supabase
        .from("global_bans")
        .select("banned_discord_id, banned_username, reason, ban_type, expires_at, created_at")
        .eq("owner_user_id", profile.user_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!bans || bans.length === 0) {
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "📤 Export Bans",
                description: "You have no active bans to export.",
                color: COLORS.PRIMARY,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Format for export
      const exportData = bans.map(b => ({
        user_id: b.banned_discord_id,
        username: b.banned_username,
        reason: b.reason,
        type: b.ban_type,
        expires_at: b.expires_at,
        created_at: b.created_at,
      }));

      // Create a simple text representation for Discord
      const jsonPreview = JSON.stringify(exportData.slice(0, 3), null, 2);
      const isTruncated = bans.length > 3;

      return new Response(
        JSON.stringify({
          type: RESPONSE_TYPE.CHANNEL_MESSAGE,
          data: {
            embeds: [{
              title: "📤 Export Bans",
              description: `Found **${bans.length}** active ban(s).\n\n**Preview:**\n\`\`\`json\n${jsonPreview.slice(0, 800)}${isTruncated ? "\n..." : ""}\n\`\`\`\n\nVisit your dashboard for the full export file.`,
              color: COLORS.SUCCESS,
              footer: { text: "Full JSON export available on dashboard" },
            }],
            flags: 64,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== DASHBOARD COMMAND ====================
    if (commandName === "dashboard") {
      const botToken = Deno.env.get("DISCORD_GLOBAL_GUARD_BOT_TOKEN");
      const dashboardUrl = "https://roleplay-hub-shop.lovable.app/guard";
      
      // Try to send DM to user
      try {
        // Create DM channel
        const dmChannelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipient_id: discordUserId }),
        });

        if (!dmChannelRes.ok) {
          throw new Error("Could not create DM channel");
        }

        const dmChannel = await dmChannelRes.json();

        // Send DM with dashboard link
        const dmRes = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            embeds: [{
              title: "🛡️ Global Guard Dashboard",
              description: `Manage your global bans, view analytics, and configure your servers all in one place.\n\n**[Open Dashboard](${dashboardUrl})**`,
              color: COLORS.PRIMARY,
              fields: [
                { name: "Quick Actions", value: "• View & manage all bans\n• Add evidence to bans\n• Configure server settings\n• Export ban lists", inline: false },
              ],
              footer: { text: "Global Guard by Eclipse" },
            }],
          }),
        });

        if (!dmRes.ok) {
          throw new Error("Could not send DM");
        }

        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "✅ Check Your DMs!",
                description: "I've sent you the dashboard link via DM.",
                color: COLORS.SUCCESS,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("[global-guard-bot] DM failed:", e);
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "❌ Couldn't Send DM",
                description: `Please make sure your DMs are open.\n\n**[Open Dashboard](${dashboardUrl})**`,
                color: COLORS.WARNING,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ==================== UPGRADE COMMAND ====================
    if (commandName === "upgrade") {
      const botToken = Deno.env.get("DISCORD_GLOBAL_GUARD_BOT_TOKEN");
      const upgradeUrl = "https://roleplay-hub-shop.lovable.app/guard";
      
      const upgradeEmbed = {
        title: "⭐ Upgrade to Global Guard Premium",
        description: "Unlock the full power of cross-server moderation with premium features.",
        color: COLORS.PRIMARY,
        fields: [
          { 
            name: "🆓 Free Tier", 
            value: "• 2 servers max\n• 6 commands/day\n• Basic ban management", 
            inline: true 
          },
          { 
            name: "⭐ Premium", 
            value: "• Unlimited servers\n• Unlimited commands\n• Priority sync\n• Ban templates\n• Advanced analytics", 
            inline: true 
          },
          { 
            name: "💰 Pricing", 
            value: "**£2.99/month** for 2 servers\n+£1.00/month per additional server\n\n*Or get **Eclipse+** for unlimited access!*", 
            inline: false 
          },
          {
            name: "🔗 Ready to Upgrade?",
            value: `**[Upgrade Now](${upgradeUrl})**`,
            inline: false,
          },
        ],
        footer: { text: "Global Guard by Eclipse" },
      };

      // Try to send DM to user
      try {
        // Create DM channel
        const dmChannelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recipient_id: discordUserId }),
        });

        if (!dmChannelRes.ok) {
          throw new Error("Could not create DM channel");
        }

        const dmChannel = await dmChannelRes.json();

        // Send DM with upgrade info
        const dmRes = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ embeds: [upgradeEmbed] }),
        });

        if (!dmRes.ok) {
          throw new Error("Could not send DM");
        }

        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: "✅ Check Your DMs!",
                description: "I've sent you the upgrade information via DM.",
                color: COLORS.SUCCESS,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("[global-guard-bot] DM failed:", e);
        // Fall back to showing in channel if DM fails
        return new Response(
          JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                ...upgradeEmbed,
                title: "❌ Couldn't Send DM - Here's the Info",
                description: "Please make sure your DMs are open.\n\n" + upgradeEmbed.description,
              }],
              flags: 64,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
