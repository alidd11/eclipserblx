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
  console.log(`[CREATE-AD-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

const VALID_TIERS = ['basic', 'pro', 'premium'];
const VALID_PERIODS = ['monthly', 'annual'];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'create-ad-subscription-checkout' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const { tier, billingPeriod } = await req.json();

    if (!tier || !VALID_TIERS.includes(tier)) {
      throw new Error("Invalid tier selected");
    }

    if (!billingPeriod || !VALID_PERIODS.includes(billingPeriod)) {
      throw new Error("Invalid billing period");
    }

    logStep("Request received", { tier, billingPeriod });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) throw new Error("User not authenticated");

    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Get tier details
    const { data: tierData, error: tierError } = await supabaseClient
      .from("advertisement_tiers")
      .select("*")
      .eq("tier", tier)
      .eq("is_active", true)
      .maybeSingle();

    if (tierError || !tierData) throw new Error("Tier not found or inactive");

    const priceId = billingPeriod === 'annual' 
      ? tierData.stripe_annual_price_id 
      : tierData.stripe_monthly_price_id;

    if (!priceId) throw new Error("Price not configured for this tier");

    logStep("Tier found", { tier: tierData.name, priceId });

    // Check if user already has an active subscription
    const { data: existingSub } = await supabaseClient
      .from("advertisement_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingSub) {
      throw new Error("You already have an active advertisement subscription.");
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Validate origin
    const origin = req.headers.get("origin");
    const allowedOrigins = ["https://eclipserblx.com", "https://www.eclipserblx.com"];
    const returnOrigin = origin && allowedOrigins.some(o => origin!.startsWith(o))
      ? origin
      : "https://eclipserblx.com";

    logStep("Creating checkout session", { customerId, priceId });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${returnOrigin}/advertise?subscription_success=true`,
      cancel_url: `${returnOrigin}/advertise?subscription_cancelled=true`,
      metadata: {
        type: "ad_subscription",
        tier,
        billing_period: billingPeriod,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          type: "ad_subscription",
          tier,
          user_id: user.id,
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
      status: 400,
    });
  }
});
