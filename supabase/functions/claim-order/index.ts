import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { paymentIntentId, sessionId } = await req.json();
    if (!paymentIntentId && !sessionId) {
      return new Response(JSON.stringify({ error: "Missing payment reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve payment intent
    let piId = paymentIntentId;
    if (!piId && sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      piId = session.payment_intent;
    }

    if (!piId) {
      return new Response(JSON.stringify({ error: "Could not resolve payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pi = await stripe.paymentIntents.retrieve(piId);

    // Verify the Stripe payment email matches the authenticated user
    const customerEmail = pi.receipt_email || (pi.customer ? (await stripe.customers.retrieve(pi.customer as string)).email : null);
    
    if (!customerEmail || customerEmail.toLowerCase() !== user.email?.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Email mismatch — this payment doesn't belong to you" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find orphaned order with this payment_id
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id")
      .eq("payment_id", piId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "No order found for this payment" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already linked to this user, no action needed
    if (order.user_id === user.id) {
      return new Response(JSON.stringify({ success: true, orderId: order.id, alreadyLinked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If linked to a different user, don't steal it
    if (order.user_id && order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Order belongs to another account" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Claim the orphaned order
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ user_id: user.id, customer_email: user.email })
      .eq("id", order.id);

    if (updateError) {
      console.error("Failed to claim order:", updateError);
      return new Response(JSON.stringify({ error: "Failed to claim order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, orderId: order.id, claimed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("claim-order error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
