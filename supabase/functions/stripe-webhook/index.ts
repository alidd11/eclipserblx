import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createStripeClient, createAdminSupabase, logStep } from "../_shared/stripe-helpers.ts";
import { processPayment, PaymentData } from "../_shared/webhook-payment-handler.ts";
import { processRefund } from "../_shared/webhook-refund-handler.ts";
import { processAdSubscriptionPurchase, processAdPingPurchase, processCreditPurchase } from "../_shared/webhook-ad-handlers.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const LOG = (step: string, d?: unknown) => logStep("STRIPE-WEBHOOK", step, d);

serve(async (req) => {
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ maxRequests: 120, windowMs: 60000, identifier: clientIp, action: 'stripe-webhook' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    LOG("Webhook received");

    const stripe = createStripeClient();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const supabaseAdmin = createAdminSupabase();

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) return new Response("No signature", { status: 400 });

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      LOG("Signature verified", { eventType: event.type, eventId: event.id });
    } catch (err) {
      LOG("ERROR: Signature verification failed", { message: String(err) });
      return new Response(`Webhook signature verification failed`, { status: 400 });
    }

    // === WEBHOOK EVENT DEDUP: Prevent processing the same event twice ===
    const { error: dedupError } = await supabaseAdmin
      .from('processed_webhook_events')
      .insert({ event_id: event.id, event_type: event.type });

    if (dedupError?.code === '23505') {
      // Unique constraint violation = already processed
      LOG("Duplicate event, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" }, status: 200,
      });
    }

    // Route events to handlers
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const type = session.metadata?.type;

        if (type === "credit_purchase") await processCreditPurchase(supabaseAdmin, session);
        else if (type === "ad_ping_purchase") await processAdPingPurchase(supabaseAdmin, session);
        else if (type === "ad_subscription") await processAdSubscriptionPurchase(supabaseAdmin, stripe, session);
        else if (type === "custom_domain") {
          // Fulfill custom domain subscription
          const subId = session.subscription as string;
          const custId = session.customer as string;
          const storeId = session.metadata?.store_id;
          if (subId && storeId) {
            const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            try {
              const sub = await stripe.subscriptions.retrieve(subId);
              const realEnd = new Date(sub.current_period_end * 1000).toISOString();
              await supabaseAdmin.from("store_domain_billing").insert({
                store_id: storeId,
                stripe_subscription_id: subId,
                stripe_customer_id: custId,
                status: "active",
                current_period_end: realEnd,
              });
              LOG("Custom domain subscription fulfilled", { storeId, subId });
            } catch (e) {
              LOG("Custom domain fulfillment error", { error: String(e) });
              // Fallback insert
              await supabaseAdmin.from("store_domain_billing").insert({
                store_id: storeId,
                stripe_subscription_id: subId,
                stripe_customer_id: custId,
                status: "active",
                current_period_end: periodEnd,
              });
            }
          }
        }
        else {
          await processPayment(supabaseAdmin, stripe, {
            paymentId: session.id, paymentType: "checkout_session",
            customerEmail: session.customer_details?.email || session.customer_email || "",
            metadata: session.metadata, amountTotal: session.amount_total,
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        try {
          const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
          if (sessions.data.length > 0) {
            LOG("Skipping - has associated checkout session", { paymentIntentId: pi.id });
            break;
          }
        } catch { /* process anyway */ }

        await processPayment(supabaseAdmin, stripe, {
          paymentId: pi.id, paymentType: "payment_intent",
          customerEmail: pi.receipt_email || pi.metadata?.customer_email || "",
          metadata: pi.metadata, amountTotal: pi.amount,
        });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await processRefund(supabaseAdmin, {
          chargeId: charge.id,
          paymentIntentId: charge.payment_intent as string | null,
          refundAmount: charge.amount_refunded,
          isFullRefund: charge.refunded,
        }, stripe);
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        const purpose = payout.metadata?.purpose;
      if (purpose === 'wise_funding') {
          await supabaseAdmin.from('wise_funding_requests').update({
            status: 'paid', completed_at: new Date().toISOString(),
            notes: `Stripe payout completed at ${new Date().toISOString()}`,
          }).eq('stripe_payout_id', payout.id);
          LOG("Wise funding payout marked as paid", { payoutId: payout.id });
        } else if (purpose === 'paypal_funding') {
          await supabaseAdmin.from('wise_funding_requests').update({
            status: 'paid', completed_at: new Date().toISOString(),
            notes: `Stripe payout completed (PayPal funding) at ${new Date().toISOString()}`,
          }).eq('stripe_payout_id', payout.id);
          LOG("PayPal funding payout marked as paid", { payoutId: payout.id });
        }
        break;
      }

      default:
        LOG("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    LOG("ERROR", { message: String(error) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { "Content-Type": "application/json" }, status: 500,
    });
  }
});
