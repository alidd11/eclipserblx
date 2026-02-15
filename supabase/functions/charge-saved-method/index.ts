import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Eclipse+ discount constants - must match other payment functions
const BOT_CATEGORY_ID = "852838dc-adb6-4154-93fe-d1814fe46263";
const ECLIPSE_SAVERS_CATEGORY_ID = "26463de5-38f4-4203-a379-78f6f92be3c7";
const ECLIPSE_PLUS_DISCOUNT = 30;
const ECLIPSE_PLUS_BOT_DISCOUNT = 35;

interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  category_slug?: string;
  category_id?: string;
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

// Server-side Eclipse+ discount eligibility check
function isEligibleForDiscount(categoryId: string | null | undefined, isResellable: boolean | null | undefined, storeEclipseEnabled?: boolean): boolean {
  if (storeEclipseEnabled === false) return false;
  if (isResellable) return false;
  return categoryId !== ECLIPSE_SAVERS_CATEGORY_ID;
}

function calculateMemberPrice(originalPrice: number, categoryId: string | null | undefined, isResellable: boolean | null | undefined, storeEclipseEnabled?: boolean): number {
  if (!isEligibleForDiscount(categoryId, isResellable, storeEclipseEnabled)) {
    return originalPrice;
  }
  
  if (categoryId === BOT_CATEGORY_ID) {
    return originalPrice * (1 - ECLIPSE_PLUS_BOT_DISCOUNT / 100);
  }
  
  return originalPrice * (1 - ECLIPSE_PLUS_DISCOUNT / 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check - prevent abuse
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.WRITE,
      identifier: clientIp,
      action: 'charge-saved-method',
    });

    if (!rateLimitResult.allowed) {
      logStep("Rate limit exceeded", { ip: clientIp });
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // CRITICAL: Use SERVICE_ROLE_KEY for server-side validation
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { items, paymentMethodId, discountCodeId }: ChargeRequest = await req.json();
    logStep("Request received", { itemCount: items?.length, paymentMethodId });

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    if (!paymentMethodId) {
      throw new Error("No payment method provided");
    }

    // Get authenticated user using their token but verify with service client
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    // Create a user client to verify the token
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await userClient.auth.getUser();
    
    if (userError || !userData.user?.email) {
      throw new Error("User not authenticated");
    }

    const userEmail = userData.user.email;
    const userId = userData.user.id;
    logStep("User authenticated", { userId, email: userEmail });

    // SERVER-SIDE: Verify Eclipse+ subscription status
    let isEclipseMember = false;
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .single();
    
    if (subscription && new Date(subscription.current_period_end) > new Date()) {
      isEclipseMember = true;
      logStep("User has active Eclipse+ subscription");
    }

    // SERVER-SIDE: Fetch actual product data and calculate correct prices
    // NEVER trust frontend prices!
    const productIds = items.map(item => item.id);
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, name, price, category_id, is_resellable, slug, stores(eclipse_plus_discount_enabled)')
      .in('id', productIds);

    if (productsError) {
      logStep("Error fetching products", productsError);
      throw new Error("Failed to verify product prices");
    }

    const productMap = new Map(products?.map(p => [p.id, p]) || []);

    // Validate and calculate server-side prices
    const validatedItems: Array<{
      id: string;
      name: string;
      originalPrice: number;
      finalPrice: number;
      category_id?: string;
      category_slug?: string;
    }> = [];

    let serverSubtotal = 0;
    let serverEclipseDiscount = 0;

    for (const item of items) {
      const product = productMap.get(item.id);
      if (!product) {
        logStep("Product not found", { productId: item.id });
        throw new Error(`Product not found: ${item.id}`);
      }

      const originalPrice = product.price;
      let finalPrice = originalPrice;

      // Apply Eclipse+ discount server-side if user is a member
      if (isEclipseMember) {
        const storeEclipse = product.stores?.eclipse_plus_discount_enabled;
        finalPrice = calculateMemberPrice(originalPrice, product.category_id, product.is_resellable, storeEclipse);
        if (finalPrice < originalPrice) {
          serverEclipseDiscount += (originalPrice - finalPrice);
        }
      }

      validatedItems.push({
        id: product.id,
        name: product.name,
        originalPrice,
        finalPrice,
        category_id: product.category_id,
        category_slug: item.category_slug,
      });

      serverSubtotal += finalPrice;
    }

    logStep("Server-side price validation complete", { 
      serverSubtotal, 
      serverEclipseDiscount,
      isEclipseMember 
    });

    // Apply discount code (only if NOT an Eclipse+ member - no stacking)
    let discountAmount = 0;
    if (discountCodeId && !isEclipseMember) {
      const { data: discount } = await supabaseClient
        .from('discount_codes')
        .select('*')
        .eq('id', discountCodeId)
        .eq('is_active', true)
        .single();

      if (discount) {
        // Verify discount is still valid
        if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
          logStep("Discount code expired", { discountCodeId });
        } else if (discount.max_uses && (discount.current_uses || 0) >= discount.max_uses) {
          logStep("Discount code max uses reached", { discountCodeId });
        } else if (discount.min_order_amount && serverSubtotal < discount.min_order_amount) {
          logStep("Minimum order amount not met for discount", { discountCodeId, serverSubtotal, min: discount.min_order_amount });
        } else if (discount.store_id) {
          // Store-scoped discount: check items belong to store
          const itemStoreIds = validatedItems.map((i: any) => i.store_id).filter(Boolean);
          if (!itemStoreIds.includes(discount.store_id)) {
            logStep("Discount code rejected - store mismatch", { discountStoreId: discount.store_id });
          } else {
            if (discount.discount_type === 'percentage') {
              discountAmount = (serverSubtotal * discount.discount_value) / 100;
            } else {
              discountAmount = Math.min(discount.discount_value, serverSubtotal);
            }
            logStep("Store-scoped discount applied", { discountAmount });
          }
        } else {
          if (discount.discount_type === 'percentage') {
            discountAmount = (serverSubtotal * discount.discount_value) / 100;
          } else {
            discountAmount = Math.min(discount.discount_value, serverSubtotal);
          }
          logStep("Discount applied", { discountAmount, type: discount.discount_type });
        }
      }
    } else if (discountCodeId && isEclipseMember) {
      logStep("Discount code ignored - Eclipse+ member (no stacking)");
    }

    // Calculate final amount in pence using SERVER-VALIDATED prices
    const total = Math.max(0, serverSubtotal - discountAmount);
    const amountInPence = Math.round(total * 100);
    logStep("Calculated amount", { serverSubtotal, discountAmount, total, amountInPence });

    // Minimum order requirement: £1.00 (100 pence)
    const MINIMUM_ORDER_PENCE = 100;
    if (amountInPence < MINIMUM_ORDER_PENCE) {
      logStep("Order below minimum", { amountInPence, minimum: MINIMUM_ORDER_PENCE });
      throw new Error("Minimum order amount is £1.00");
    }

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

    // Create and confirm PaymentIntent with saved method using SERVER-VALIDATED prices
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
        items: JSON.stringify(validatedItems.map(i => ({ 
          id: i.id, 
          name: i.name, 
          price: i.finalPrice,
          originalPrice: i.originalPrice,
          category_id: i.category_id,
          category_slug: i.category_slug 
        }))),
        discount_code_id: (!isEclipseMember && discountCodeId) ? discountCodeId : "",
        discount_amount: discountAmount.toString(),
        eclipse_discount: serverEclipseDiscount.toString(),
        is_eclipse_member: isEclipseMember ? "true" : "false",
      },
    });

    logStep("PaymentIntent created and confirmed", { 
      paymentIntentId: paymentIntent.id, 
      status: paymentIntent.status,
      serverValidatedAmount: amountInPence
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }

    // Call verify-payment to create the order
    logStep("Calling verify-payment to create order");
    const verifyResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/verify-payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      }
    );

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      logStep("Order creation failed", errorText);
      // Payment succeeded but order creation failed - this is a critical issue
      throw new Error("Payment succeeded but order creation failed. Please contact support.");
    }

    const verifyResult = await verifyResponse.json();
    logStep("Order created successfully", { orderId: verifyResult.orderId });

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        orderId: verifyResult.orderId,
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
