import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface ModmailPayload {
  discord_user_id: string;
  discord_username: string;
  discord_avatar_url?: string;
  content: string;
  discord_message_id?: string;
  attachments?: { url: string; filename: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret
    const webhookSecret = req.headers.get("x-webhook-secret");
    const expectedSecret = Deno.env.get("DISCORD_WEBHOOK_SECRET");
    
    if (!expectedSecret || webhookSecret !== expectedSecret) {
      console.error("Invalid or missing webhook secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: ModmailPayload = await req.json();
    console.log("Received modmail webhook:", JSON.stringify(payload));

    // Validate required fields
    if (!payload.discord_user_id || !payload.discord_username || !payload.content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: discord_user_id, discord_username, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if there's an open ticket for this user
    const { data: existingTicket, error: ticketError } = await supabase
      .from("discord_modmail_tickets")
      .select("id")
      .eq("discord_user_id", payload.discord_user_id)
      .in("status", ["open", "claimed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ticketError) {
      console.error("Error checking existing ticket:", ticketError);
      throw ticketError;
    }

    let ticketId: string;
    let isNewTicket = false;

    if (existingTicket) {
      // Add message to existing ticket
      ticketId = existingTicket.id;
      console.log("Adding to existing ticket:", ticketId);
    } else {
      // Create new ticket
      const { data: newTicket, error: createError } = await supabase
        .from("discord_modmail_tickets")
        .insert({
          discord_user_id: payload.discord_user_id,
          discord_username: payload.discord_username,
          discord_avatar_url: payload.discord_avatar_url,
          subject: payload.content.substring(0, 100),
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating ticket:", createError);
        throw createError;
      }

      ticketId = newTicket.id;
      isNewTicket = true;
      console.log("Created new ticket:", ticketId);
    }

    // Insert the message
    const { data: newMessage, error: messageError } = await supabase
      .from("discord_modmail_messages")
      .insert({
        ticket_id: ticketId,
        content: payload.content,
        is_staff_reply: false,
        discord_message_id: payload.discord_message_id,
        attachments: payload.attachments || [],
      })
      .select("id")
      .single();

    if (messageError) {
      console.error("Error inserting message:", messageError);
      throw messageError;
    }

    // Update ticket's updated_at
    await supabase
      .from("discord_modmail_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    // Post notification to Discord channel ONLY for new tickets
    if (isNewTicket) {
      try {
        // Fetch modmail settings
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
          // Build the embed for new ticket only
          const embed = {
            color: 0x22c55e, // Green for new ticket
            author: {
              name: payload.discord_username,
              icon_url: payload.discord_avatar_url || `https://cdn.discordapp.com/embed/avatars/0.png`,
            },
            title: "📩 New Support Ticket",
            description: payload.content.length > 500 
              ? payload.content.substring(0, 500) + "..." 
              : payload.content,
            fields: [
              {
                name: "🔖 Ticket ID",
                value: `\`${ticketId.substring(0, 8)}\``,
                inline: true,
              },
              {
                name: "📊 Status",
                value: "Open",
                inline: true,
              },
            ],
            footer: {
              text: "Eclipse Support • Click below to view",
              icon_url: "https://eclipserblx.com/favicon.ico",
            },
            timestamp: new Date().toISOString(),
          };

          // Build message payload with role ping and button
          const messagePayload: {
            content?: string;
            embeds: typeof embed[];
            components: Array<{
              type: number;
              components: Array<{
                type: number;
                style: number;
                label: string;
                url: string;
              }>;
            }>;
          } = {
            embeds: [embed],
            components: [
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 2, // Button
                    style: 5, // Link style
                    label: "📋 View Ticket",
                    url: "https://eclipserblx.com/admin/discord-modmail",
                  },
                ],
              },
            ],
          };

          // Add role ping if configured
          if (roleId) {
            messagePayload.content = `<@&${roleId}>`;
          }

          // Send to Discord channel
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

          if (discordResponse.ok) {
            console.log("Posted new ticket notification to Discord channel:", channelId);
          } else {
            const errorText = await discordResponse.text();
            console.error("Failed to post to Discord channel:", discordResponse.status, errorText);
          }
        }
      } catch (discordError) {
        // Don't fail the webhook if Discord notification fails
        console.error("Error posting Discord notification:", discordError);
      }
    } else {
      console.log("Skipping Discord channel notification for follow-up message on ticket:", ticketId);
    }

    // Send push notification to staff (admin and support_agent roles)
    try {
      const { data: staffUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "support_agent"]);

      if (staffUsers && staffUsers.length > 0) {
        const userIds = staffUsers.map((u) => u.user_id);
        
        // Use unique tag to prevent collapsing
        const notificationTag = isNewTicket 
          ? `modmail-new-${ticketId}` 
          : `modmail-msg-${ticketId}-${newMessage.id}`;
        
        const notificationPayload = {
          user_ids: userIds,
          title: isNewTicket ? "New Discord Modmail" : "New Modmail Message",
          body: `${payload.discord_username}: ${payload.content.substring(0, 100)}${payload.content.length > 100 ? "..." : ""}`,
          tag: notificationTag,
          url: "/admin/discord-modmail",
          data: {
            ticket_id: ticketId,
            message_id: newMessage.id,
            type: "modmail",
          },
        };

        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(notificationPayload),
        });

        const pushResult = await pushResponse.text();
        console.log("Push notification result:", pushResult);
      }
    } catch (pushError) {
      // Don't fail the webhook if push fails
      console.error("Error sending push notification:", pushError);
    }

    console.log("Successfully processed modmail message for ticket:", ticketId);

    return new Response(
      JSON.stringify({ success: true, ticket_id: ticketId, is_new_ticket: isNewTicket }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error processing modmail webhook:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
