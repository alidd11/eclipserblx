import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendBotMessage } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TICKET_CHANNEL_ID = "1469155627916984476";
const STAFF_ROLE_ID = "1460220738832302151";
const TICKET_COLOR = 0x5865F2; // Discord Blurple

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticket_number, subject, category, customer_name, ticket_id } = await req.json();

    if (!subject) {
      return new Response(
        JSON.stringify({ error: "subject is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await sendBotMessage(TICKET_CHANNEL_ID, {
      content: `<@&${STAFF_ROLE_ID}>`,
      embeds: [
        {
          title: "🎫 New Support Ticket",
          color: TICKET_COLOR,
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
              name: "Customer",
              value: customer_name || "Unknown",
              inline: true,
            },
            {
              name: "Subject",
              value: subject,
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
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
