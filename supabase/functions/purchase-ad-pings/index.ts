import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-AD-PINGS] ${step}${detailsStr}`);
};

// Prices for ping packs (in pence)
const HERE_PING_PRICE_PENCE = 79; // £0.79 per ping
const EVERYONE_PING_PRICE_PENCE = 149; // £1.49 per ping

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { herePings = 0, everyonePings = 0 } = await req.json();

    // Validate inputs
    const herePingsCount = Math.max(0, Math.min(100, parseInt(herePings) || 0));
    const everyonePingsCount = Math.max(0, Math.min(100, parseInt(everyonePings) || 0));

    if (herePingsCount === 0 && everyonePingsCount === 0) {
      throw new Error("Please select at least one ping to purchase");
    }

    logStep("Request received", { herePings: herePingsCount, everyonePings: everyonePingsCount });

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

    // Check if user has an active subscription
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: subscription } = await supabaseAdmin
      .from("advertisement_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!subscription) {
      throw new Error("You need an active advertisement subscription to purchase pings");
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

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (herePingsCount > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: '@here Ping Credits',
            description: `${herePingsCount} @here ping${herePingsCount > 1 ? 's' : ''} for your ads`,
          },
          unit_amount: HERE_PING_PRICE_PENCE,
        },
        quantity: herePingsCount,
      });
    }

    if (everyonePingsCount > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: '@everyone Ping Credits',
            description: `${everyonePingsCount} @everyone ping${everyonePingsCount > 1 ? 's' : ''} for your ads`,
          },
          unit_amount: EVERYONE_PING_PRICE_PENCE,
        },
        quantity: everyonePingsCount,
      });
    }

    logStep("Creating checkout session", { customerId, lineItems: lineItems.length });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/advertise?pings_purchased=true&here=${herePingsCount}&everyone=${everyonePingsCount}`,
      cancel_url: `${req.headers.get("origin")}/advertise?pings_cancelled=true`,
      metadata: {
        type: "ad_ping_purchase",
        user_id: user.id,
        here_pings: herePingsCount.toString(),
        everyone_pings: everyonePingsCount.toString(),
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
