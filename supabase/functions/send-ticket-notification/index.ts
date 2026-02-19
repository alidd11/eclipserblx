import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendBotMessage } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TICKET_CHANNEL_ID = "1469155627916984476";

// Different role pings for different ticket types
const ROLE_IDS: Record<string, string> = {
  customer: "1460220738832302151",  // Support Agent
  seller: "1460220731072712920",    // Senior Support Agent
};

const TICKET_COLOR = 0x5865F2; // Discord Blurple
const ESCALATION_COLOR = 0xF59E0B; // Amber for escalations

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticket_number, subject, category, customer_name, store_name, ticket_id, type = "customer", is_escalation = false } = await req.json();

    if (!subject) {
      return new Response(
        JSON.stringify({ error: "subject is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roleId = ROLE_IDS[type] || ROLE_IDS.customer;
    const color = is_escalation ? ESCALATION_COLOR : TICKET_COLOR;
    const title = is_escalation
      ? "⚠️ Dispute Escalated"
      : type === "seller"
        ? "🏪 New Seller Ticket"
        : "🎫 New Support Ticket";

    const ticketUrl = ticket_id && ticket_id !== "test"
      ? type === "seller"
        ? `https://roleplay-hub-shop.lovable.app/admin/seller-tickets`
        : `https://roleplay-hub-shop.lovable.app/admin/support/${ticket_id}`
      : null;

    const result = await sendBotMessage(TICKET_CHANNEL_ID, {
      content: `<@&${roleId}>`,
      embeds: [
        {
          title,
          color,
          fields: [
            {
              name: "Ticket",
              value: ticket_number || "N/A",
              inline: true,
            },
            {
              name: "Category",
              value: category || "General",
              inline: true,
            },
            {
              name: type === "seller" ? "Seller" : "Customer",
              value: customer_name || "Unknown",
              inline: true,
            },
            ...(store_name ? [{
              name: "Store",
              value: store_name,
              inline: true,
            }] : []),
            {
              name: "Subject",
              value: subject,
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
      ...(ticketUrl ? {
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: "View Ticket",
                url: ticketUrl,
                emoji: { name: "🔗" },
              },
            ],
          },
        ],
      } : {}),
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send ticket notification");
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[TICKET-NOTIFICATION] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
