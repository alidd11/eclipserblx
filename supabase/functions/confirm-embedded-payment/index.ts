import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-EMBEDDED-PAYMENT] ${step}${detailsStr}`);
};

// Validate Stripe ID format
const isValidStripeId = (id: string, prefix: string): boolean =>
  typeof id === 'string' && id.startsWith(prefix + '_') && id.length > prefix.length + 1 && id.length < 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'confirm-embedded-payment' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    logStep("Function started");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { paymentIntentId, setupIntentId, tier, billingPeriod } = await req.json();

    // Validate input formats
    if (paymentIntentId && !isValidStripeId(paymentIntentId, 'pi')) throw new Error("Invalid payment intent ID");
    if (setupIntentId && !isValidStripeId(setupIntentId, 'seti')) throw new Error("Invalid setup intent ID");
    if (tier && (typeof tier !== 'string' || tier.length > 50)) throw new Error("Invalid tier");
    if (billingPeriod && !['monthly', 'annual'].includes(billingPeriod)) throw new Error("Invalid billing period");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Handle subscription creation from SetupIntent
    if (setupIntentId && tier) {
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      
      if (setupIntent.status !== 'succeeded') {
        throw new Error("Payment method setup not completed");
      }

      // Get tier data for price ID
      const { data: tierData, error: tierError } = await supabaseAdmin
        .from('subscription_tiers')
        .select('stripe_monthly_price_id, stripe_annual_price_id')
        .eq('tier', tier)
        .eq('is_active', true)
        .maybeSingle();

      if (tierError || !tierData) throw new Error(`Tier '${tier}' not found`);

      const priceId = billingPeriod === 'annual' 
        ? tierData.stripe_annual_price_id 
        : tierData.stripe_monthly_price_id;

      if (!priceId) throw new Error("No price configured for this tier");

      // Set the payment method as default for the customer
      await stripe.customers.update(setupIntent.customer as string, {
        invoice_settings: {
          default_payment_method: setupIntent.payment_method as string,
        },
      });

      // Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: setupIntent.customer as string,
        items: [{ price: priceId }],
        default_payment_method: setupIntent.payment_method as string,
        metadata: {
          user_id: user.id,
          tier,
          billing_period: billingPeriod,
        },
      });

      logStep("Subscription created", { subscriptionId: subscription.id });

      return new Response(JSON.stringify({
        success: true,
        type: 'subscription',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle PaymentIntent confirmation
    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
      }

      const paymentType = paymentIntent.metadata?.payment_type;
      logStep("PaymentIntent verified", { paymentIntentId, status: paymentIntent.status, type: paymentType });

      // Handle different payment types
      switch (paymentType) {
        case 'credits': {
          const creditAmount = parseFloat(paymentIntent.metadata?.credit_amount || '0');
          if (creditAmount > 0) {
            // Idempotent credit fulfillment — prevents double-crediting on retry
            const { data: fulfilled } = await supabaseAdmin.rpc('fulfill_credits_idempotent', {
              p_user_id: user.id,
              p_reference_id: paymentIntentId,
              p_amount: creditAmount,
              p_description: `Purchased £${creditAmount.toFixed(2)} credits`,
            });
            if (fulfilled) {
              logStep("Credits added", { creditAmount });
            } else {
              logStep("Credits already fulfilled (idempotent skip)", { paymentIntentId });
            }
          }
          break;
        }

        case 'ad_pings': {
          const herePings = parseInt(paymentIntent.metadata?.here_pings || '0');
          const everyonePings = parseInt(paymentIntent.metadata?.everyone_pings || '0');

          if (herePings > 0 || everyonePings > 0) {
            // Atomic ping increment — prevents lost updates on concurrent calls
            const { data: updated } = await supabaseAdmin.rpc('increment_ad_ping_balance', {
              p_user_id: user.id,
              p_here_pings: herePings,
              p_everyone_pings: everyonePings,
              p_reference_id: paymentIntentId,
            });
            if (updated) {
              logStep("Ad pings added atomically", { herePings, everyonePings });
            } else {
              logStep("No active ad subscription found for ping fulfillment", { userId: user.id });
            }
          }
          break;
        }

        case 'checkout': {
          // Order creation is handled by verify-payment edge function via webhook
          // Just return success here
          logStep("Checkout payment confirmed, order will be created by webhook");
          break;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        paymentIntentId,
        type: paymentType,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("No payment intent or setup intent provided");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
