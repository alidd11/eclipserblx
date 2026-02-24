import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-IP-SHIELD-SUBSCRIPTION] ${step}${detailsStr}`);
};

const PRICE_TO_TIER: Record<string, string> = {
  "price_1T4OkOCjEHxHwNl9i1TPwCLk": "starter",
  "price_1T4OTVCjEHxHwNl9fNIFX8kG": "pro",
  "price_1T4OmYCjEHxHwNl9vLYAuHni": "enterprise",
};

const ALL_PRICE_IDS = Object.keys(PRICE_TO_TIER);

const TIER_LIMITS: Record<string, { takedowns_per_month: number; registry_limit: number; priority: boolean; monitoring: boolean; dedicated_agent: boolean }> = {
  starter: { takedowns_per_month: 3, registry_limit: 15, priority: false, monitoring: false, dedicated_agent: false },
  pro: { takedowns_per_month: 15, registry_limit: -1, priority: true, monitoring: true, dedicated_agent: false },
  enterprise: { takedowns_per_month: -1, registry_limit: -1, priority: true, monitoring: true, dedicated_agent: true },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Admin test override — grants Enterprise access for testing
    const ADMIN_TEST_EMAILS = ["alicanimir1@gmail.com"];
    if (ADMIN_TEST_EMAILS.includes(user.email)) {
      logStep("Admin test override active", { email: user.email });
      return new Response(JSON.stringify({
        subscribed: true,
        tier: "enterprise",
        limits: TIER_LIMITS["enterprise"],
        subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_id: "admin_test_override",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 100,
    });

    // Find an IP Shield subscription
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        if (ALL_PRICE_IDS.includes(item.price.id)) {
          const tier = PRICE_TO_TIER[item.price.id] || "starter";
          const limits = TIER_LIMITS[tier];
          const subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
          logStep("Active IP Shield subscription found", { subscriptionId: sub.id, tier, endDate: subscriptionEnd });
          return new Response(JSON.stringify({
            subscribed: true,
            tier,
            limits,
            subscription_end: subscriptionEnd,
            subscription_id: sub.id,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
    }

    logStep("No active IP Shield subscription");
    return new Response(JSON.stringify({ subscribed: false }), {
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
