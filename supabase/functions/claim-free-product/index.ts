import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bot category ID - products in this category are excluded from free claims
const BOT_CATEGORY_ID = "852838dc-adb6-4154-93fe-d1814fe46263";

// Eclipse+ Product ID
const ECLIPSE_PLUS_PRODUCT_ID = "prod_Tm3QgFo7Wjg00o";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLAIM-FREE-PRODUCT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
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

    // Get product ID from request
    const { productId } = await req.json();
    if (!productId) throw new Error("Product ID is required");
    logStep("Product ID received", { productId });

    // Verify the user has an active Eclipse+ subscription
    // First check local database for admin-granted or promotion subscriptions
    const { data: localSub } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    let hasActiveSubscription = false;

    if (localSub && !localSub.stripe_subscription_id && localSub.current_period_end) {
      // Admin-granted or promotion subscription - check if still valid
      const periodEnd = new Date(localSub.current_period_end);
      if (periodEnd > new Date()) {
        hasActiveSubscription = true;
        logStep("Eclipse+ subscription verified (admin-granted)", { userId: user.id });
      }
    }

    // If no local subscription, check Stripe
    if (!hasActiveSubscription) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) {
        throw new Error("No active Eclipse+ subscription found");
      }

      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });

      const eclipsePlusSub = subscriptions.data.find((sub: any) => {
        return sub.items.data.some((item: any) => {
          const prodId = typeof item.price.product === 'string' 
            ? item.price.product 
            : item.price.product?.id;
          return prodId === ECLIPSE_PLUS_PRODUCT_ID;
        });
      });

      if (!eclipsePlusSub) {
        throw new Error("No active Eclipse+ subscription found");
      }
      hasActiveSubscription = true;
      logStep("Eclipse+ subscription verified (Stripe)", { subscriptionId: eclipsePlusSub.id });
    }

    // Check if user has already claimed this month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const { data: existingClaim } = await supabaseClient
      .from('subscription_free_claims')
      .select('id')
      .eq('user_id', user.id)
      .eq('claim_period', currentMonth)
      .maybeSingle();

    if (existingClaim) {
      throw new Error("You have already claimed your free product this month");
    }

    // Fetch the product to validate (include store info for Eclipse+ check)
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('id, name, price, category_id, is_active, is_resellable, eclipse_free_eligible, store_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    if (!product.is_active) {
      throw new Error("This product is not available");
    }

    // Check if product is in the bot category (excluded from free claims)
    if (product.category_id === BOT_CATEGORY_ID) {
      throw new Error("Bot products cannot be claimed for free. The Eclipse+ free product benefit excludes bot products.");
    }

    // Check if product is resellable (excluded from free claims)
    if (product.is_resellable) {
      throw new Error("Resellable products cannot be claimed for free.");
    }

    // Check if seller has opted out of free claims for this product
    if (product.eclipse_free_eligible === false) {
      throw new Error("This product is not eligible for free Eclipse+ claims.");
    }

    // Check if store has opted out of Eclipse+ entirely
    if (product.store_id) {
      const { data: store } = await supabaseClient
        .from('stores')
        .select('eclipse_plus_discount_enabled')
        .eq('id', product.store_id)
        .single();

      if (store?.eclipse_plus_discount_enabled === false) {
        throw new Error("This store does not participate in Eclipse+ benefits.");
      }
    }

    logStep("Product validated", { productName: product.name, price: product.price });

    // Create an order for the free product
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        customer_email: user.email,
        subtotal: product.price,
        discount_amount: product.price,
        total: 0,
        status: 'paid',
        payment_method: 'eclipse_plus_free',
        payment_id: `eclipse_plus_claim_${currentMonth}_${user.id}`,
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`);
    }
    logStep("Order created", { orderId: order.id });

    // Create order item
    const { error: itemError } = await supabaseClient
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        price: 0, // Free
      });

    if (itemError) {
      throw new Error(`Failed to create order item: ${itemError.message}`);
    }

    // Record the free claim
    const { error: claimError } = await supabaseClient
      .from('subscription_free_claims')
      .insert({
        user_id: user.id,
        product_id: product.id,
        order_id: order.id,
        claim_period: currentMonth,
      });

    if (claimError) {
      throw new Error(`Failed to record claim: ${claimError.message}`);
    }
    logStep("Free claim recorded", { claimPeriod: currentMonth });

    // Create notification for the user
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'order',
        title: 'Free Product Claimed!',
        message: `You've claimed "${product.name}" as your free Eclipse+ product this month.`,
        link: '/downloads',
      });

    logStep("Claim complete", { 
      productId: product.id, 
      productName: product.name,
      orderId: order.id 
    });

    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
      productName: product.name,
      message: `Successfully claimed "${product.name}" for free!`,
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
