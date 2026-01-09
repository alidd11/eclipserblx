import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, paymentIntentId } = await req.json();

    if (!sessionId && !paymentIntentId) {
      throw new Error("Session ID or Payment Intent ID is required");
    }

    logStep("Starting verification", { sessionId, paymentIntentId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let items: any[] = [];
    let customerEmail = "";
    let userId: string | null = null;
    let paymentId = "";
    let paymentMethod = "stripe";
    let amountTotal = 0;

    // Handle Stripe Checkout Session
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent"],
      });

      logStep("Session retrieved", { id: session.id, status: session.payment_status });

      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "Payment not completed" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      items = JSON.parse(session.metadata?.items || "[]");
      customerEmail = session.customer_email || session.metadata?.customer_email || "";
      userId = session.metadata?.user_id || null;
      paymentId = session.id;
      paymentMethod = session.payment_method_types?.[0] || "stripe";
      amountTotal = session.amount_total ? session.amount_total / 100 : 0;
    }
    // Handle PaymentIntent (from Apple Pay/Google Pay)
    else if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      logStep("PaymentIntent retrieved", { id: paymentIntent.id, status: paymentIntent.status });

      if (paymentIntent.status !== "succeeded") {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "Payment not completed" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      items = JSON.parse(paymentIntent.metadata?.items || "[]");
      customerEmail = paymentIntent.receipt_email || paymentIntent.metadata?.customer_email || "";
      userId = paymentIntent.metadata?.user_id || null;
      paymentId = paymentIntent.id;
      
      // Determine payment method type
      if (paymentIntent.payment_method) {
        const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);
        if (pm.type === 'card' && pm.card?.wallet?.type === 'apple_pay') {
          paymentMethod = 'apple_pay';
        } else if (pm.type === 'card' && pm.card?.wallet?.type === 'google_pay') {
          paymentMethod = 'google_pay';
        } else {
          paymentMethod = pm.type || 'card';
        }
      }
      
      amountTotal = paymentIntent.amount / 100;
    }

    // Check if order already exists
    const { data: existingOrder } = await supabaseClient
      .from("orders")
      .select("id")
      .eq("payment_id", paymentId)
      .single();

    if (existingOrder) {
      logStep("Order already exists", { orderId: existingOrder.id });
      return new Response(JSON.stringify({ 
        success: true, 
        orderId: existingOrder.id,
        alreadyProcessed: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.price, 0);
    const total = amountTotal || subtotal;

    logStep("Creating order", { customerEmail, userId, subtotal, total, paymentMethod });

    // Create order
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        customer_email: customerEmail,
        user_id: userId || null,
        subtotal: subtotal,
        total: total,
        status: "paid",
        payment_id: paymentId,
        payment_method: paymentMethod,
      })
      .select()
      .single();

    if (orderError) {
      logStep("Order creation error", orderError);
      throw orderError;
    }

    logStep("Order created", { orderId: order.id });

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      price: item.price,
    }));

    const { error: itemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      logStep("Order items error", itemsError);
      throw itemsError;
    }

    // Send order confirmation email
    logStep("Sending confirmation email");
    try {
      // Check if any item is a bot (for special installation instructions)
      const hasBotPurchase = items.some((item: any) => 
        item.category_slug === 'bots' || 
        (item.name && item.name.toLowerCase().includes('bot'))
      );

      const emailPayload = {
        orderId: order.id,
        customerEmail: customerEmail,
        items: items.map((item: any) => ({
          product_name: item.name,
          price: item.price,
          category_slug: item.category_slug,
        })),
        subtotal: subtotal,
        total: total,
        paymentMethod: paymentMethod,
        orderDate: order.created_at,
        hasBotPurchase: hasBotPurchase,
      };

      const emailResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-confirmation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify(emailPayload),
        }
      );

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        logStep("Email sending failed", errorText);
      } else {
        logStep("Email sent successfully");
      }
    } catch (emailError) {
      logStep("Email error (non-fatal)", emailError);
    }

    // Process referral if applicable
    if (userId) {
      logStep("Processing referral for user", { userId });
      try {
        const referralResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-referral`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({ orderId: order.id, userId }),
          }
        );

        if (referralResponse.ok) {
          const referralResult = await referralResponse.json();
          logStep("Referral processed", referralResult);
        } else {
          logStep("Referral processing failed (non-fatal)");
        }
      } catch (referralError) {
        logStep("Referral error (non-fatal)", referralError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      orderId: order.id 
    }), {
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
