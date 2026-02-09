import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Global Guard Stripe Price IDs
const GLOBAL_GUARD_PRICES = {
  monthly: "price_1SyeCoCjEHxHwNl9YROPHdNC", // £2.99/month for 2 servers
  annual: "price_TBD", // £24.99/year - needs to be created
  additionalServerEclipsePlus: "price_1SyhypCjEHxHwNl9gA3bzFls", // £1.00/month per extra server (Eclipse+ members)
  additionalServerStandard: "price_1SyhypCjEHxHwNl9gA3bzFls", // £1.50/month per extra server (non-Eclipse+ members) - TODO: Create new price in Stripe
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-GLOBAL-GUARD-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const billingPeriod = body.billingPeriod || 'monthly';
    const additionalServers = Math.max(0, parseInt(body.additionalServers) || 0);
    const isEclipsePlus = body.isEclipsePlus === true;

    logStep("Subscription request", { billingPeriod, additionalServers, isEclipsePlus });

    // Get the appropriate base price
    const basePriceId = billingPeriod === 'annual' 
      ? GLOBAL_GUARD_PRICES.annual 
      : GLOBAL_GUARD_PRICES.monthly;

    if (!basePriceId || basePriceId === "price_TBD") {
      throw new Error(`Annual billing is not yet available. Please choose monthly.`);
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
      throw new Error("You already have an active Global Guard subscription. Please manage your existing subscription from your account settings.");
    }

    // Check/create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://eclipserblx.com";

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: basePriceId,
        quantity: 1,
      },
    ];

    // Add additional server slots if requested
    // Eclipse+ members get £1.00/server, non-members pay £1.50/server
    if (additionalServers > 0) {
      const additionalServerPriceId = isEclipsePlus 
        ? GLOBAL_GUARD_PRICES.additionalServerEclipsePlus 
        : GLOBAL_GUARD_PRICES.additionalServerStandard;
      
      lineItems.push({
        price: additionalServerPriceId,
        quantity: additionalServers,
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      customer_creation: customerId ? undefined : 'always',
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/guard?subscription=success`,
      cancel_url: `${origin}/guard?subscription=canceled`,
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
      status: 500,
    });
  }
});
