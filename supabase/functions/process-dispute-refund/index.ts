import Stripe from "https://esm.sh/stripe@18.5.0";
import { createStripeClient, createAdminSupabase, logStep } from "../_shared/stripe-helpers.ts";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const LOG = (step: string, d?: unknown) => logStep("PROCESS-DISPUTE-REFUND", step, d);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createAdminSupabase();
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: hasPermission } = await supabase.rpc("has_permission", {
      _user_id: user.id,
      _permission_name: "manage_orders",
    });
    if (!hasPermission) {
      return jsonResponse({ error: "You do not have permission to process refunds" }, 403);
    }

    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit({
      ...RATE_LIMITS.WRITE,
      identifier: `${user.id}:${clientIp}`,
      action: "process-dispute-refund",
    });
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck, corsHeaders);

    const { refundRequestId, adminResponse } = await req.json();
    if (!refundRequestId) {
      return jsonResponse({ error: "Missing refundRequestId" }, 400);
    }

    const { data: disputeRow, error: disputeError } = await supabase
      .from("refund_requests")
      .select("id, order_id, amount, status, stripe_refund_id, customer_id")
      .eq("id", refundRequestId)
      .maybeSingle();

    if (disputeError || !disputeRow) {
      return jsonResponse({ error: "Dispute not found" }, 404);
    }

    if (disputeRow.stripe_refund_id) {
      LOG("Already refunded, skipping Stripe call", { refundRequestId, stripeRefundId: disputeRow.stripe_refund_id });
      return jsonResponse({ success: true, alreadyProcessed: true });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, payment_id, total, refunded_at")
      .eq("id", disputeRow.order_id)
      .maybeSingle();

    if (orderError || !order) {
      return jsonResponse({ error: "Order not found for this dispute" }, 404);
    }
    if (!order.payment_id) {
      return jsonResponse({ error: "This order has no payment on file — cannot process a Stripe refund" }, 400);
    }
    if (order.refunded_at) {
      LOG("Order already refunded (likely via a different flow)", { orderId: order.id });
      await supabase.from("refund_requests").update({
        refund_processed_at: new Date().toISOString(),
      }).eq("id", refundRequestId);
      return jsonResponse({ success: true, alreadyProcessed: true });
    }

    const refundAmount = Number(disputeRow.amount);
    if (!refundAmount || refundAmount <= 0) {
      return jsonResponse({ error: "Invalid refund amount" }, 400);
    }
    if (refundAmount > Number(order.total) + 0.01) {
      return jsonResponse({ error: "Refund amount exceeds the order total" }, 400);
    }

    const stripe = createStripeClient();

    let paymentIntentId: string | null = null;
    if (order.payment_id.startsWith("pi_")) {
      paymentIntentId = order.payment_id;
    } else if (order.payment_id.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(order.payment_id);
      paymentIntentId = (session.payment_intent as string) || null;
    }

    if (!paymentIntentId) {
      LOG("Could not resolve a payment intent for order", { orderId: order.id, paymentId: order.payment_id });
      return jsonResponse({ error: "Could not resolve a Stripe payment for this order" }, 400);
    }

    LOG("Issuing Stripe refund", { orderId: order.id, paymentIntentId, refundAmount });

    let refund: Stripe.Refund;
    try {
      refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          amount: Math.round(refundAmount * 100),
          reason: "requested_by_customer",
          metadata: { refund_request_id: refundRequestId, order_id: order.id },
        },
        { idempotencyKey: `dispute-refund-${refundRequestId}` }
      );
    } catch (stripeError) {
      const message = stripeError instanceof Error ? stripeError.message : "Stripe refund failed";
      LOG("Stripe refund failed", { error: message });
      return jsonResponse({ error: message }, 502);
    }

    await supabase.from("refund_requests").update({
      stripe_refund_id: refund.id,
      refund_processed_at: new Date().toISOString(),
      admin_response: adminResponse || null,
    }).eq("id", refundRequestId);

    LOG("Refund issued successfully", { orderId: order.id, stripeRefundId: refund.id });

    // Order status, seller-earnings reversal, and affiliate-commission reversal are
    // handled by the stripe-webhook's charge.refunded handler once Stripe confirms.
    return jsonResponse({ success: true, stripeRefundId: refund.id });
  } catch (error) {
    console.error("[process-dispute-refund] Unexpected error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
