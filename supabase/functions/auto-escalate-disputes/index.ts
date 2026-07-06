import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders }
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;
);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find pending disputes older than 48 hours with no seller response
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: disputes, error: fetchError } = await supabase
      .from("refund_requests")
      .select("id, order_id, customer_id, store_id, amount, reason, dispute_number")
      .eq("status", "pending")
      .is("seller_responded_at", null)
      .lt("created_at", cutoff);

    if (fetchError) throw fetchError;

    if (!disputes || disputes.length === 0) {
      return new Response(
        JSON.stringify({ escalated: 0, message: "No disputes to escalate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const escalationReason =
      "Auto-escalated: seller did not respond within 48 hours";
    let escalatedCount = 0;

    for (const dispute of disputes) {
      const { error: updateError } = await supabase
        .from("refund_requests")
        .update({
          status: "escalated",
          escalated_at: new Date().toISOString(),
          escalation_reason: escalationReason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dispute.id);

      if (updateError) {
        console.error(`Failed to escalate dispute ${dispute.id}:`, updateError);
        continue;
      }

      escalatedCount++;

      // Send seller notification
      if (dispute.store_id) {
        const { data: store } = await supabase
          .from("stores")
          .select("owner_id, name")
          .eq("id", dispute.store_id)
          .single();

        if (store?.owner_id) {
          await supabase.from("seller_notifications").insert({
            user_id: store.owner_id,
            type: "refund_request",
            title: "Dispute Auto-Escalated",
            message: `A dispute has been auto-escalated because you didn't respond within 48 hours. Amount: £${Number(dispute.amount).toFixed(2)}`,
            action_url: "/seller/refunds",
          });

          // Push notification to seller
          try {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                user_ids: [store.owner_id],
                payload: {
                  title: "⚠️ Dispute Escalated",
                  body: `A dispute (£${Number(dispute.amount).toFixed(2)}) was auto-escalated — you didn't respond within 48 hours.`,
                  tag: `dispute-escalated-${dispute.id}`,
                  url: "/seller/refunds",
                  requireInteraction: true,
                },
              },
            });
          } catch (err) {
            console.error("Failed to send seller push notification:", err);
          }
        }

        // Push notification to buyer
        if (dispute.customer_id) {
          await supabase.from("notifications").insert({
            user_id: dispute.customer_id,
            type: "order_update",
            title: "Dispute Escalated",
            message: `Your dispute (£${Number(dispute.amount).toFixed(2)}) has been escalated to our team for review.`,
            link: "/account/orders",
          });

          try {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                user_ids: [dispute.customer_id],
                payload: {
                  title: "Dispute Update",
                  body: `Your dispute (£${Number(dispute.amount).toFixed(2)}) has been escalated to our team for review.`,
                  tag: `dispute-escalated-buyer-${dispute.id}`,
                  url: "/account/orders",
                },
              },
            });
          } catch (err) {
            console.error("Failed to send buyer push notification:", err);
          }
        }

        // Send Discord notification
        try {
          await supabase.functions.invoke("send-ticket-notification", {
            body: {
              ticket_number: dispute.dispute_number || `DSP-${dispute.id.substring(0, 6).toUpperCase()}`,
              subject: `Auto-Escalated Dispute`,
              category: "Dispute",
              customer_name: "System",
              store_name: store?.name || "Unknown",
              type: "system",
              is_escalation: true,
            },
          });
        } catch (err) {
          console.error("Failed to send Discord notification:", err);
        }
      }
    }

    console.log(`Auto-escalated ${escalatedCount} disputes`);

    return new Response(
      JSON.stringify({ escalated: escalatedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-escalation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
