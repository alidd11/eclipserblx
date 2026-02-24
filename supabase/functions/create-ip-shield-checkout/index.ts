import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-IP-SHIELD-CHECKOUT] ${step}${detailsStr}`);
};

const IP_SHIELD_PRICES: Record<string, string> = {
  starter: "price_1T4QCOCjEHxHwNl9Hr9uHeWe",
  pro: "price_1T4OTVCjEHxHwNl9fNIFX8kG",
  enterprise: "price_1T4OmYCjEHxHwNl9vLYAuHni",
};

const ALL_PRICE_IDS = Object.values(IP_SHIELD_PRICES);

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

    const body = await req.json().catch(() => ({}));
    const tier = body.tier || "starter";
    const priceId = IP_SHIELD_PRICES[tier];
    if (!priceId) throw new Error(`Invalid tier: ${tier}`);
    logStep("Selected tier", { tier, priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });

      // Check if already has any active IP Shield subscription
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 100,
      });
      const existingSub = subs.data.find(sub =>
        sub.items.data.some(item => ALL_PRICE_IDS.includes(item.price.id))
      );
      if (existingSub) {
        return new Response(JSON.stringify({ error: "You already have an active IP Shield subscription. Manage it from your account settings." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    const origin = req.headers.get("origin") || "https://eclipserblx.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/ip-shield?subscription=success`,
      cancel_url: `${origin}/ip-shield?subscription=cancelled`,
      metadata: { user_id: user.id, product: "ip_shield", tier },
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
