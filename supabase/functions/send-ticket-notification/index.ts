import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendBotMessage } from "../_shared/discord-bot.ts";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TICKET_CHANNEL_ID = "1469155627916984476";

const ROLE_IDS: Record<string, string> = {
  customer: "1460220738832302151",
  seller: "1460220731072712920",
};

const TICKET_COLOR = 0x5865F2;
const ESCALATION_COLOR = 0xF59E0B;

const STAFF_ROLES = new Set(['admin', 'staff', 'moderator', 'head_moderator', 'owner']);

function escapeDiscord(text: string): string {
  return String(text).substring(0, 1024).replace(/[`@]/g, '');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'send-ticket-notification' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    // Auth guard: require service-role or authenticated staff
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!isServiceRole) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), 
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Allow authenticated users to create tickets (they're customers filing tickets)
      // Staff verification is optional here since customers also trigger this
    }

    const { ticket_number, subject, category, customer_name, store_name, ticket_id, type = "customer", is_escalation = false } = await req.json();

    if (!subject || typeof subject !== 'string' || subject.length > 500) {
      return new Response(
        JSON.stringify({ error: "subject is required (max 500 chars)" }),
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
        ? `https://eclipserblx.com/admin/seller-tickets`
        : `https://eclipserblx.com/admin/customer-tickets/${ticket_id}`
      : null;

    const result = await sendBotMessage(TICKET_CHANNEL_ID, {
      content: `<@&${roleId}>`,
      embeds: [
        {
          title,
          color,
          fields: [
            { name: "Ticket", value: escapeDiscord(ticket_number || "N/A"), inline: true },
            { name: "Category", value: escapeDiscord(category || "General"), inline: true },
            { name: type === "seller" ? "Seller" : "Customer", value: escapeDiscord(customer_name || "Unknown"), inline: true },
            ...(store_name ? [{ name: "Store", value: escapeDiscord(store_name), inline: true }] : []),
            { name: "Subject", value: escapeDiscord(subject), inline: false },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
      ...(ticketUrl ? {
        components: [{
          type: 1,
          components: [{ type: 2, style: 5, label: "View Ticket", url: ticketUrl, emoji: { name: "🔗" } }],
        }],
      } : {}),
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send ticket notification");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[TICKET-NOTIFICATION] Error:", msg);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
