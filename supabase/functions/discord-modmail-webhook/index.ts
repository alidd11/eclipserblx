import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const LOG = (step: string, d?: unknown) => {
  const s = d ? ` - ${JSON.stringify(d)}` : '';
  console.log(`[DISCORD-MODMAIL-WEBHOOK] ${step}${s}`);
};

interface ModmailPayload {
  discord_user_id: string;
  discord_username: string;
  discord_avatar_url?: string;
  content: string;
  discord_message_id?: string;
  attachments?: { url: string; filename: string }[];
}

// Input validation
const isValidDiscordId = (id: string): boolean =>
  typeof id === 'string' && /^\d{17,20}$/.test(id);

const sanitizeString = (str: string, maxLen: number): string =>
  typeof str === 'string' ? str.slice(0, maxLen) : '';

const isValidUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch { return false; }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'modmail-webhook' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    // Verify webhook secret
    const webhookSecret = req.headers.get("x-webhook-secret");
    const expectedSecret = Deno.env.get("DISCORD_WEBHOOK_SECRET");

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      LOG("Invalid or missing webhook secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: ModmailPayload = await req.json();

    // Validate discord_user_id format
    if (!isValidDiscordId(payload.discord_user_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid discord_user_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!payload.discord_username || typeof payload.discord_username !== 'string' || payload.discord_username.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid discord_username" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload.content || typeof payload.content !== 'string' || payload.content.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize inputs
    const sanitizedContent = sanitizeString(payload.content, 4000);
    const sanitizedUsername = sanitizeString(payload.discord_username, 100);
    const sanitizedAvatarUrl = payload.discord_avatar_url && isValidUrl(payload.discord_avatar_url)
      ? payload.discord_avatar_url : undefined;

    // Validate attachments
    const sanitizedAttachments = (payload.attachments || [])
      .filter(a => a.url && isValidUrl(a.url) && a.filename && a.filename.length <= 255)
      .slice(0, 10) // Max 10 attachments
      .map(a => ({ url: a.url, filename: sanitizeString(a.filename, 255) }));

    LOG("Received modmail", { discord_user_id: payload.discord_user_id, contentLen: sanitizedContent.length });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for existing open ticket
    const { data: existingTicket, error: ticketError } = await supabase
      .from("discord_modmail_tickets")
      .select("id")
      .eq("discord_user_id", payload.discord_user_id)
      .in("status", ["open", "claimed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ticketError) throw ticketError;

    let ticketId: string;
    let isNewTicket = false;

    if (existingTicket) {
      ticketId = existingTicket.id;
    } else {
      const { data: newTicket, error: createError } = await supabase
        .from("discord_modmail_tickets")
        .insert({
          discord_user_id: payload.discord_user_id,
          discord_username: sanitizedUsername,
          discord_avatar_url: sanitizedAvatarUrl,
          subject: sanitizedContent.substring(0, 100),
        })
        .select("id")
        .single();

      if (createError) throw createError;
      ticketId = newTicket.id;
      isNewTicket = true;
    }

    // Insert message
    const { data: newMessage, error: messageError } = await supabase
      .from("discord_modmail_messages")
      .insert({
        ticket_id: ticketId,
        content: sanitizedContent,
        is_staff_reply: false,
        discord_message_id: payload.discord_message_id?.slice(0, 30),
        attachments: sanitizedAttachments,
      })
      .select("id")
      .single();

    if (messageError) throw messageError;

    // Update ticket timestamp
    await supabase
      .from("discord_modmail_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    // Discord notification for new tickets only
    if (isNewTicket) {
      try {
        const { data: settingsData } = await supabase
          .from("settings")
          .select("key, value")
          .in("key", ["modmail_discord_channel_id", "modmail_discord_role_id"]);

        const settings: Record<string, string> = {};
        settingsData?.forEach((s) => {
          const val = typeof s.value === "string" ? s.value.replace(/^"|"$/g, "") : String(s.value || "");
          settings[s.key] = val;
        });

        const channelId = settings.modmail_discord_channel_id;
        const roleId = settings.modmail_discord_role_id;
        const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");

        if (channelId && botToken) {
          const embed = {
            color: 0x22c55e,
            author: {
              name: sanitizedUsername,
              icon_url: sanitizedAvatarUrl || `https://cdn.discordapp.com/embed/avatars/0.png`,
            },
            title: "📩 New Support Ticket",
            description: sanitizedContent.length > 500
              ? sanitizedContent.substring(0, 500) + "..."
              : sanitizedContent,
            fields: [
              { name: "🔖 Ticket ID", value: `\`${ticketId.substring(0, 8)}\``, inline: true },
              { name: "📊 Status", value: "Open", inline: true },
            ],
            footer: { text: "Eclipse Support", icon_url: "https://eclipserblx.com/favicon.ico" },
            timestamp: new Date().toISOString(),
          };

          const messagePayload: any = {
            embeds: [embed],
            components: [{
              type: 1,
              components: [{
                type: 2, style: 5,
                label: "📋 View Ticket",
                url: "https://eclipserblx.com/admin/discord-modmail",
              }],
            }],
          };

          if (roleId) messagePayload.content = `<@&${roleId}>`;

          const discordResponse = await fetch(
            `https://discord.com/api/v10/channels/${channelId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bot ${botToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(messagePayload),
            }
          );

          if (!discordResponse.ok) {
            const errorText = await discordResponse.text();
            LOG("Failed to post to Discord", { status: discordResponse.status });
          }
        }
      } catch (discordError) {
        LOG("Discord notification error (non-fatal)", { error: String(discordError) });
      }
    }

    // Push notifications to staff
    try {
      const { data: staffUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "support_agent"]);

      if (staffUsers && staffUsers.length > 0) {
        const userIds = staffUsers.map((u) => u.user_id);
        const notificationTag = isNewTicket
          ? `modmail-new-${ticketId}`
          : `modmail-msg-${ticketId}-${newMessage.id}`;

        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            user_ids: userIds,
            title: isNewTicket ? "New Discord Modmail" : "New Modmail Message",
            body: `${sanitizedUsername}: ${sanitizedContent.substring(0, 100)}`,
            tag: notificationTag,
            url: "/admin/discord-modmail",
            data: { ticket_id: ticketId, message_id: newMessage.id, type: "modmail" },
          }),
        });
      }
    } catch {
      // Non-fatal
    }

    return new Response(
      JSON.stringify({ success: true, ticket_id: ticketId, is_new_ticket: isNewTicket }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    LOG("ERROR", { message: error instanceof Error ? error.message : "Unknown error" });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
