import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-EMBEDDED-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { paymentIntentId, setupIntentId, tier, billingPeriod } = await req.json();
    
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

      if (!priceId) throw new Error("No Stripe price configured for this tier");

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
        subscriptionId: subscription.id,
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
            // Add credits to user's balance
            await supabaseAdmin.rpc('add_credits', {
              p_user_id: user.id,
              p_amount: creditAmount,
              p_type: 'purchase',
              p_description: `Purchased £${creditAmount.toFixed(2)} credits`,
              p_reference_id: paymentIntentId,
            });
            logStep("Credits added", { creditAmount });
          }
          break;
        }

        case 'ad_pings': {
          const herePings = parseInt(paymentIntent.metadata?.here_pings || '0');
          const everyonePings = parseInt(paymentIntent.metadata?.everyone_pings || '0');

          if (herePings > 0 || everyonePings > 0) {
            const { error: updateError } = await supabaseAdmin
              .from('advertisement_subscriptions')
              .update({
                here_pings_balance: supabaseAdmin.rpc('increment_here_pings', { amount: herePings }),
                everyone_pings_balance: supabaseAdmin.rpc('increment_everyone_pings', { amount: everyonePings }),
              })
              .eq('user_id', user.id)
              .eq('status', 'active');

            // Fallback: direct update with raw SQL approach
            if (updateError) {
              await supabaseAdmin.from('advertisement_subscriptions')
                .select('here_pings_balance, everyone_pings_balance')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single()
                .then(async ({ data }) => {
                  if (data) {
                    await supabaseAdmin
                      .from('advertisement_subscriptions')
                      .update({
                        here_pings_balance: (data.here_pings_balance || 0) + herePings,
                        everyone_pings_balance: (data.everyone_pings_balance || 0) + everyonePings,
                      })
                      .eq('user_id', user.id)
                      .eq('status', 'active');
                  }
                });
            }

            logStep("Ad pings added", { herePings, everyonePings });
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
