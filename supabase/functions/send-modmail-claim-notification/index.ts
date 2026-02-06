import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ClaimNotificationPayload {
  ticket_id: string;
  staff_user_id: string;
  discord_username?: string;
  subject?: string;
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

    const payload: ClaimNotificationPayload = await req.json();
    console.log("Processing claim notification:", JSON.stringify(payload));

    if (!payload.ticket_id || !payload.staff_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the staff member's name
    const { data: staffProfile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", payload.staff_user_id)
      .single();

    const staffName = staffProfile?.display_name || staffProfile?.username || "A staff member";

    // Get modmail Discord settings
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
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");

    // Send Discord notification
    if (channelId && botToken) {
      const embed = {
        color: 0x3b82f6, // Blue for claimed
        title: "🔒 Ticket Claimed",
        description: `**${staffName}** has claimed a support ticket.`,
        fields: [
          {
            name: "👤 Customer",
            value: payload.discord_username || "Unknown",
            inline: true,
          },
          {
            name: "📝 Subject",
            value: payload.subject?.substring(0, 50) || "No subject",
            inline: true,
          },
          {
            name: "🔖 Ticket ID",
            value: `\`${payload.ticket_id.substring(0, 8)}\``,
            inline: true,
          },
        ],
        footer: {
          text: "Eclipse Support",
          icon_url: "https://eclipserblx.com/favicon.ico",
        },
        timestamp: new Date().toISOString(),
      };

      const messagePayload = {
        embeds: [embed],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: "📋 View Ticket",
                url: "https://eclipserblx.com/admin/discord-modmail",
              },
            ],
          },
        ],
      };

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
        console.log("Posted claim notification to Discord");
      } else {
        const errorText = await discordResponse.text();
        console.error("Failed to post to Discord:", discordResponse.status, errorText);
      }
    }

    // Send push notification to all staff (except the claimer)
    try {
      const { data: staffUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "support_agent"]);

      if (staffUsers && staffUsers.length > 0) {
        const userIds = staffUsers
          .map((u) => u.user_id)
          .filter((id) => id !== payload.staff_user_id); // Exclude the claimer

        if (userIds.length > 0) {
          const notificationPayload = {
            user_ids: userIds,
            payload: {
              title: "Ticket Claimed",
              body: `${staffName} claimed ticket from ${payload.discord_username || "a user"}`,
              tag: `modmail-claim-${payload.ticket_id}`,
              url: "/admin/discord-modmail",
              data: {
                ticket_id: payload.ticket_id,
                type: "modmail_claim",
              },
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
      }
    } catch (pushError) {
      console.error("Error sending push notification:", pushError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error processing claim notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
