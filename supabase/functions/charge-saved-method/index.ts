import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  category_slug?: string;
}

interface ChargeRequest {
  items: CartItem[];
  paymentMethodId: string;
  discountCodeId?: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHARGE-SAVED-METHOD] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { items, paymentMethodId, discountCodeId }: ChargeRequest = await req.json();
    logStep("Request received", { itemCount: items?.length, paymentMethodId });

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    if (!paymentMethodId) {
      throw new Error("No payment method provided");
    }

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      throw new Error("User not authenticated");
    }

    const userEmail = userData.user.email;
    const userId = userData.user.id;
    logStep("User authenticated", { userId, email: userEmail });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Verify the payment method belongs to this customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== customerId) {
      throw new Error("Payment method does not belong to this customer");
    }
    logStep("Payment method verified");

    // Calculate total
    let subtotal = items.reduce((sum, item) => sum + item.price, 0);
    let discountAmount = 0;

    // Apply discount if provided
    if (discountCodeId) {
      const { data: discount } = await supabaseClient
        .from('discount_codes')
        .select('*')
        .eq('id', discountCodeId)
        .eq('is_active', true)
        .single();

      if (discount) {
        if (discount.discount_type === 'percentage') {
          discountAmount = (subtotal * discount.discount_value) / 100;
        } else {
          discountAmount = Math.min(discount.discount_value, subtotal);
        }
        logStep("Discount applied", { discountAmount });
      }
    }

    const total = Math.max(0, subtotal - discountAmount);
    const amountInPence = Math.round(total * 100);
    logStep("Calculated amount", { subtotal, discountAmount, total, amountInPence });

    // Create and confirm PaymentIntent with saved method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: "gbp",
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      receipt_email: userEmail,
      metadata: {
        user_id: userId,
        customer_email: userEmail,
        items: JSON.stringify(items.map(i => ({ id: i.id, name: i.name, price: i.price, category_slug: i.category_slug }))),
        discount_code_id: discountCodeId || "",
      },
    });

    logStep("PaymentIntent created and confirmed", { 
      paymentIntentId: paymentIntent.id, 
      status: paymentIntent.status 
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        amount: total,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Handle Stripe-specific errors
    const stripeError = error as { type?: string; message?: string; code?: string };
    if (stripeError.type === 'StripeCardError') {
      return new Response(
        JSON.stringify({ error: stripeError.message, code: stripeError.code }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
