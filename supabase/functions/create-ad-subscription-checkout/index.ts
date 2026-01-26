import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-AD-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tier, billingPeriod } = await req.json();

    if (!tier || !['basic', 'pro', 'premium'].includes(tier)) {
      throw new Error("Invalid tier selected");
    }

    if (!billingPeriod || !['monthly', 'annual'].includes(billingPeriod)) {
      throw new Error("Invalid billing period");
    }

    logStep("Request received", { tier, billingPeriod });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get tier details
    const { data: tierData, error: tierError } = await supabaseClient
      .from("advertisement_tiers")
      .select("*")
      .eq("tier", tier)
      .eq("is_active", true)
      .maybeSingle();

    if (tierError || !tierData) {
      throw new Error("Tier not found or inactive");
    }

    const priceId = billingPeriod === 'annual' 
      ? tierData.stripe_annual_price_id 
      : tierData.stripe_monthly_price_id;

    if (!priceId) {
      throw new Error("Price not configured for this tier");
    }

    logStep("Tier found", { tier: tierData.name, priceId });

    // Check if user already has an active subscription
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: existingSub } = await supabaseAdmin
      .from("advertisement_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingSub) {
      throw new Error("You already have an active advertisement subscription. Please manage it from your account.");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    logStep("Creating checkout session", { customerId, priceId });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/advertise?subscription_success=true`,
      cancel_url: `${req.headers.get("origin")}/advertise?subscription_cancelled=true`,
      metadata: {
        type: "ad_subscription",
        tier: tier,
        billing_period: billingPeriod,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          type: "ad_subscription",
          tier: tier,
          user_id: user.id,
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
