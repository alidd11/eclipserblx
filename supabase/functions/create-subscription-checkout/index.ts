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
  console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

const ALLOWED_TIERS = ['pro', 'premium', 'starter'];
const ALLOWED_PERIODS = ['monthly', 'annual'];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'create-subscription-checkout' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    // Parse and validate request body
    const body = await req.json().catch(() => ({}));
    const tier = body.tier || 'pro';
    const billingPeriod = body.billingPeriod || 'monthly';

    if (!ALLOWED_TIERS.includes(tier)) throw new Error("Invalid subscription tier");
    if (!ALLOWED_PERIODS.includes(billingPeriod)) throw new Error("Invalid billing period");

    logStep("Subscription request", { tier, billingPeriod });

    // Fetch tier configuration from database
    const { data: tierData, error: tierError } = await supabaseClient
      .from('subscription_tiers')
      .select('*')
      .eq('tier', tier)
      .eq('is_active', true)
      .maybeSingle();

    if (tierError) throw new Error(`Error fetching tier: ${tierError.message}`);
    if (!tierData) throw new Error(`Tier '${tier}' not found or inactive`);

    // Get the appropriate Stripe price ID
    const priceId = billingPeriod === 'annual' 
      ? tierData.stripe_annual_price_id 
      : tierData.stripe_monthly_price_id;

    if (!priceId) {
      throw new Error(`No Stripe price configured for ${tier} ${billingPeriod}.`);
    }

    logStep("Using price", { tier, billingPeriod, priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if user already has an active subscription
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });

      // Check for active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        throw new Error("You already have an active Eclipse+ subscription. Please manage your existing subscription from your account settings.");
      }
    }

    // Validate origin
    const origin = req.headers.get("origin");
    const allowedOrigins = ["https://eclipserblx.com", "https://www.eclipserblx.com"];
    const returnOrigin = origin && allowedOrigins.some(o => origin.startsWith(o))
      ? origin
      : "https://eclipserblx.com";

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      customer_creation: customerId ? undefined : 'always',
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${returnOrigin}/account?subscription=success&tier=${tier}`,
      cancel_url: `${returnOrigin}/eclipse-plus?canceled=true`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        tier,
        billing_period: billingPeriod,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          user_email: user.email,
          tier,
          billing_period: billingPeriod,
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
