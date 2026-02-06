import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Reminder intervals in minutes
const REMINDER_INTERVALS = [15, 30, 60, 120]; // 15min, 30min, 1hr, 2hr

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");

    console.log("Checking for claimed tickets needing response reminders...");

    // Get all claimed tickets that are still open
    const { data: claimedTickets, error: ticketsError } = await supabase
      .from("discord_modmail_tickets")
      .select(`
        id,
        discord_username,
        subject,
        claimed_by,
        claimed_at,
        status
      `)
      .eq("status", "open")
      .not("claimed_by", "is", null)
      .not("claimed_at", "is", null);

    if (ticketsError) {
      console.error("Error fetching tickets:", ticketsError);
      throw ticketsError;
    }

    if (!claimedTickets || claimedTickets.length === 0) {
      console.log("No claimed tickets found");
      return new Response(
        JSON.stringify({ success: true, reminders_sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let remindersSent = 0;

    for (const ticket of claimedTickets) {
      // Check if staff has responded since claiming
      const { data: staffMessages } = await supabase
        .from("discord_modmail_messages")
        .select("id, created_at")
        .eq("ticket_id", ticket.id)
        .eq("is_staff_reply", true)
        .gte("created_at", ticket.claimed_at)
        .limit(1);

      // If staff has responded, skip
      if (staffMessages && staffMessages.length > 0) {
        continue;
      }

      // Calculate minutes since claim
      const claimedAt = new Date(ticket.claimed_at);
      const now = new Date();
      const minutesSinceClaim = Math.floor((now.getTime() - claimedAt.getTime()) / (1000 * 60));

      // Find which reminder interval we're at
      let currentInterval: number | null = null;
      for (const interval of REMINDER_INTERVALS) {
        if (minutesSinceClaim >= interval && minutesSinceClaim < interval + 5) {
          // Within 5 min window of interval
          currentInterval = interval;
          break;
        }
      }

      if (!currentInterval) {
        continue;
      }

      console.log(`Ticket ${ticket.id} needs reminder at ${currentInterval}min interval`);

      // Get staff profile for notification
      const { data: staffProfile } = await supabase
        .from("profiles")
        .select("display_name, username, discord_id")
        .eq("user_id", ticket.claimed_by)
        .single();

      const staffName = staffProfile?.display_name || staffProfile?.username || "Staff";

      // Send push notification
      try {
        const pushPayload = {
          user_ids: [ticket.claimed_by],
          payload: {
            title: "⏰ Ticket Response Reminder",
            body: `You claimed a ticket from ${ticket.discord_username} ${currentInterval} minutes ago. Don't forget to respond!`,
            tag: `modmail-reminder-${ticket.id}-${currentInterval}`,
            url: "/admin/discord-modmail",
            requireInteraction: currentInterval >= 60,
          },
        };

        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(pushPayload),
        });

        console.log(`Push notification sent for ticket ${ticket.id}`);
      } catch (pushError) {
        console.error("Push notification error:", pushError);
      }

      // Send Discord DM to staff if they have Discord linked
      if (botToken && staffProfile?.discord_id) {
        try {
          // Create DM channel
          const dmChannelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
            method: "POST",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ recipient_id: staffProfile.discord_id }),
          });

          if (dmChannelRes.ok) {
            const dmChannel = await dmChannelRes.json();

            // Format time nicely
            const timeLabel = currentInterval >= 60 
              ? `${currentInterval / 60} hour${currentInterval >= 120 ? 's' : ''}`
              : `${currentInterval} minutes`;

            const reminderEmbed = {
              color: currentInterval >= 60 ? 0xef4444 : 0xf59e0b, // Red for 1hr+, orange for less
              title: "⏰ Ticket Response Reminder",
              description: `You claimed a support ticket **${timeLabel} ago** and haven't responded yet.`,
              fields: [
                {
                  name: "👤 Customer",
                  value: ticket.discord_username || "Unknown",
                  inline: true,
                },
                {
                  name: "📝 Subject",
                  value: ticket.subject?.substring(0, 50) || "No subject",
                  inline: true,
                },
                {
                  name: "⏱️ Time Elapsed",
                  value: timeLabel,
                  inline: true,
                },
              ],
              footer: {
                text: "Eclipse Support • Please respond to the customer",
                icon_url: "https://eclipserblx.com/favicon.ico",
              },
              timestamp: new Date().toISOString(),
            };

            const messagePayload = {
              embeds: [reminderEmbed],
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      style: 5,
                      label: "📋 Open Ticket",
                      url: "https://eclipserblx.com/admin/discord-modmail",
                    },
                  ],
                },
              ],
            };

            await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
              method: "POST",
              headers: {
                Authorization: `Bot ${botToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(messagePayload),
            });

            console.log(`Discord DM sent to ${staffProfile.discord_id} for ticket ${ticket.id}`);
          }
        } catch (dmError) {
          console.error("Discord DM error:", dmError);
        }
      }

      remindersSent++;
    }

    console.log(`Sent ${remindersSent} reminders`);

    return new Response(
      JSON.stringify({ success: true, reminders_sent: remindersSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in reminder function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
