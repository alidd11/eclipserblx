import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResolutionPayload {
  ticket_id: string;
  resolution_message?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated and is staff
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is staff
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: user.id });
    if (!isStaff) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - staff only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: ResolutionPayload = await req.json();
    console.log("[send-modmail-resolution] Processing:", JSON.stringify(payload));

    if (!payload.ticket_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: ticket_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("discord_modmail_tickets")
      .select("*")
      .eq("id", payload.ticket_id)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get staff profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", user.id)
      .single();

    const staffName = profile?.display_name || profile?.username || "Staff";

    // Close the ticket in the database
    const { error: updateError } = await supabase
      .from("discord_modmail_tickets")
      .update({
        status: "closed",
        closed_by: user.id,
        closed_at: new Date().toISOString(),
      })
      .eq("id", payload.ticket_id);

    if (updateError) {
      console.error("[send-modmail-resolution] Failed to update ticket:", updateError);
      throw updateError;
    }

    // Send DM via Discord API
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    if (!botToken) {
      console.error("[send-modmail-resolution] DISCORD_CUSTOMER_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({ success: true, dm_sent: false, reason: "Bot token not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create DM channel with the user
    const dmChannelResponse = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: ticket.discord_user_id }),
    });

    if (!dmChannelResponse.ok) {
      const errorText = await dmChannelResponse.text();
      console.error("[send-modmail-resolution] Failed to create DM channel:", errorText);
      return new Response(
        JSON.stringify({ success: true, dm_sent: false, reason: "Could not create DM channel" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dmChannel = await dmChannelResponse.json();

    // Build the resolution embed
    const ticketRef = ticket.subject 
      ? ticket.subject.substring(0, 40) + (ticket.subject.length > 40 ? "..." : "")
      : `Ticket #${ticket.id.substring(0, 8)}`;

    const embed = {
      color: 0x22c55e, // Green for resolved
      title: "✅ Ticket Resolved",
      description: payload.resolution_message || "Your support ticket has been resolved. Thank you for contacting Eclipse Support!",
      fields: [
        {
          name: "📋 Subject",
          value: ticketRef,
          inline: true,
        },
        {
          name: "👤 Resolved by",
          value: staffName,
          inline: true,
        },
      ],
      footer: {
        text: "Need more help? Use /support in Discord to open a new ticket",
        icon_url: "https://eclipserblx.com/favicon.ico",
      },
      timestamp: new Date().toISOString(),
    };

    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      console.error("[send-modmail-resolution] Failed to send message:", errorText);
      return new Response(
        JSON.stringify({ success: true, dm_sent: false, reason: "Failed to send DM" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-modmail-resolution] Resolution DM sent to:", ticket.discord_user_id);

    // Post notification to staff Discord channel
    try {
      const { data: settingsData } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["modmail_discord_channel_id"]);

      const settings: Record<string, string> = {};
      settingsData?.forEach((s: { key: string; value: unknown }) => {
        const val = typeof s.value === "string" ? s.value.replace(/^"|"$/g, "") : String(s.value || "");
        settings[s.key] = val;
      });

      const channelId = settings.modmail_discord_channel_id;

      if (channelId) {
        const staffEmbed = {
          color: 0x22c55e, // Green for resolved
          title: "✅ Ticket Resolved",
          description: `**${staffName}** has resolved a support ticket.`,
          fields: [
            {
              name: "👤 Customer",
              value: ticket.discord_username || "Unknown",
              inline: true,
            },
            {
              name: "📋 Subject",
              value: ticketRef,
              inline: true,
            },
            {
              name: "🔖 Ticket ID",
              value: `\`${ticket.id.substring(0, 8)}\``,
              inline: true,
            },
          ],
          footer: {
            text: "Eclipse Support",
            icon_url: "https://eclipserblx.com/favicon.ico",
          },
          timestamp: new Date().toISOString(),
        };

        await fetch(
          `https://discord.com/api/v10/channels/${channelId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ embeds: [staffEmbed] }),
          }
        );
        console.log("[send-modmail-resolution] Posted resolution notice to staff channel");
      }
    } catch (discordError) {
      console.error("[send-modmail-resolution] Error posting to staff channel:", discordError);
    }

    return new Response(
      JSON.stringify({ success: true, dm_sent: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[send-modmail-resolution] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
