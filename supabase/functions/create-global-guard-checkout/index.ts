import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Global Guard Stripe Price IDs
const GLOBAL_GUARD_PRICES = {
  monthly: "price_1SyeCoCjEHxHwNl9YROPHdNC",
  annual: "price_TBD",
  additionalServerEclipsePlus: "price_1SyhypCjEHxHwNl9gA3bzFls",
  additionalServerStandard: "price_1SyjeZCjEHxHwNl9gWiP3gqd",
};

const MAX_ADDITIONAL_SERVERS = 50; // Safety cap

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-GLOBAL-GUARD-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'create-global-guard-checkout' });
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
    const billingPeriod = body.billingPeriod || 'monthly';
    const additionalServers = Math.max(0, Math.min(parseInt(body.additionalServers) || 0, MAX_ADDITIONAL_SERVERS));

    if (!['monthly', 'annual'].includes(billingPeriod)) {
      throw new Error("Invalid billing period");
    }

    // SERVER-SIDE: Verify Eclipse+ status (don't trust client)
    let isEclipsePlus = false;
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single();
    
    if (subscription && new Date(subscription.current_period_end) > new Date()) {
      isEclipsePlus = true;
    }

    logStep("Subscription request", { billingPeriod, additionalServers, isEclipsePlus });

    const basePriceId = billingPeriod === 'annual' 
      ? GLOBAL_GUARD_PRICES.annual 
      : GLOBAL_GUARD_PRICES.monthly;

    if (!basePriceId || basePriceId === "price_TBD") {
      throw new Error("Annual billing is not yet available. Please choose monthly.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if user already has an active Global Guard subscription
    const { data: existingUsage } = await supabaseClient
      .from('global_guard_server_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingUsage) {
      throw new Error("You already have an active Global Guard subscription.");
    }

    // Check/create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
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

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: basePriceId, quantity: 1 },
    ];

    if (additionalServers > 0) {
      const additionalServerPriceId = isEclipsePlus 
        ? GLOBAL_GUARD_PRICES.additionalServerEclipsePlus 
        : GLOBAL_GUARD_PRICES.additionalServerStandard;
      
      lineItems.push({ price: additionalServerPriceId, quantity: additionalServers });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      customer_creation: customerId ? undefined : 'always',
      line_items: lineItems,
      mode: "subscription",
      success_url: `${returnOrigin}/guard?subscription=success`,
      cancel_url: `${returnOrigin}/guard?subscription=canceled`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        product_type: 'global_guard',
        additional_servers: additionalServers.toString(),
        billing_period: billingPeriod,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          user_email: user.email,
          product_type: 'global_guard',
          additional_servers: additionalServers.toString(),
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
