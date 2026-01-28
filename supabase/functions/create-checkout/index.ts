import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Eclipse+ discount constants - must match frontend
const BOT_CATEGORY_ID = "852838dc-adb6-4154-93fe-d1814fe46263";
const ECLIPSE_SAVERS_CATEGORY_ID = "26463de5-38f4-4203-a379-78f6f92be3c7";
const ECLIPSE_PLUS_DISCOUNT = 30;
const ECLIPSE_PLUS_BOT_DISCOUNT = 35;

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  category_slug?: string;
  category_id?: string;
}

interface CheckoutRequest {
  items: CartItem[];
  email?: string;
  discountCodeId?: string;
  successUrl?: string;
  cancelUrl?: string;
  eclipseDiscount?: number;
  isEclipseMember?: boolean;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Server-side Eclipse+ discount eligibility check
function isEligibleForDiscount(categoryId: string | null | undefined, isResellable: boolean | null | undefined): boolean {
  if (isResellable) return false;
  return categoryId !== ECLIPSE_SAVERS_CATEGORY_ID;
}

// Server-side member price calculation
function calculateMemberPrice(originalPrice: number, categoryId: string | null | undefined, isResellable: boolean | null | undefined): number {
  if (!isEligibleForDiscount(categoryId, isResellable)) {
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
    // Rate limit check - prevent DDoS on payment endpoints
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.WRITE,
      identifier: clientIp,
      action: 'create-checkout',
    });

    if (!rateLimitResult.allowed) {
      logStep("Rate limit exceeded", { ip: clientIp });
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    logStep("Function started");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { items, email, discountCodeId, successUrl, cancelUrl }: CheckoutRequest = await req.json();
    logStep("Request received", { itemCount: items?.length, discountCodeId });

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    // Try to get authenticated user
    let userEmail = email;
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        userEmail = data.user.email || email;
        userId = data.user.id;
        logStep("User authenticated", { userId });
      }
    }

    // SERVER-SIDE: Verify Eclipse+ subscription status
    let isEclipseMember = false;
    if (userId) {
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
    }

    // SERVER-SIDE: Fetch actual product data and calculate correct prices
    const productIds = items.map(item => item.id);
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, name, price, category_id, is_resellable, images')
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
      image?: string;
      category_id?: string;
      is_resellable?: boolean;
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
        finalPrice = calculateMemberPrice(originalPrice, product.category_id, product.is_resellable);
        if (finalPrice < originalPrice) {
          serverEclipseDiscount += (originalPrice - finalPrice);
        }
      }

      validatedItems.push({
        id: product.id,
        name: product.name,
        originalPrice,
        finalPrice,
        image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : undefined,
        category_id: product.category_id,
        is_resellable: product.is_resellable,
      });

      serverSubtotal += finalPrice;
    }

    logStep("Server-side price validation complete", { 
      serverSubtotal, 
      serverEclipseDiscount,
      isEclipseMember 
    });

    // Apply discount code (on top of member pricing)
    let discountAmount = 0;
    if (discountCodeId && !isEclipseMember) {
      // Discount codes only apply if NOT an Eclipse+ member (no stacking)
      const { data: discount } = await supabaseClient
        .from('discount_codes')
        .select('*')
        .eq('id', discountCodeId)
        .eq('is_active', true)
        .single();

      if (discount) {
        if (discount.discount_type === 'percentage') {
          discountAmount = (serverSubtotal * discount.discount_value) / 100;
        } else {
          discountAmount = Math.min(discount.discount_value, serverSubtotal);
        }
        logStep("Discount code applied", { discountAmount, type: discount.discount_type });
      }
    } else if (discountCodeId && isEclipseMember) {
      logStep("Discount code ignored - Eclipse+ member (no stacking)");
    }

    // Calculate final total after discounts
    const finalTotal = serverSubtotal - discountAmount;
    const finalTotalPence = Math.round(finalTotal * 100);

    // Minimum order requirement: £1.00 (100 pence)
    const MINIMUM_ORDER_PENCE = 100;
    if (finalTotalPence < MINIMUM_ORDER_PENCE) {
      logStep("Order below minimum", { finalTotalPence, minimum: MINIMUM_ORDER_PENCE });
      throw new Error("Minimum order amount is £1.00");
    }

    // Check if customer exists in Stripe
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer", { customerId });
      }
    }

    // Create line items for Stripe Checkout using SERVER-VALIDATED prices
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = validatedItems.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
          metadata: {
            product_id: item.id,
          },
        },
        unit_amount: Math.round(item.finalPrice * 100),
      },
      quantity: 1,
    }));

    // Store order info in metadata
    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      customer_creation: customerId ? undefined : 'always',
      line_items: lineItems,
      mode: "payment",
      payment_intent_data: {
        setup_future_usage: 'on_session',
      },
      success_url: successUrl || `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${origin}/checkout`,
      metadata: {
        user_id: userId || "",
        customer_email: userEmail || "",
        items: JSON.stringify(validatedItems.map(i => ({ 
          id: i.id, 
          name: i.name, 
          price: i.finalPrice, 
          originalPrice: i.originalPrice, 
          category_id: i.category_id 
        }))),
        discount_code_id: (!isEclipseMember && discountCodeId) ? discountCodeId : "",
        discount_amount: discountAmount.toString(),
        eclipse_discount: serverEclipseDiscount.toString(),
        is_eclipse_member: isEclipseMember ? "true" : "false",
      },
      billing_address_collection: "auto",
    };

    // Apply discount code using Stripe coupons (only if not Eclipse+ member)
    if (discountAmount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discountAmount * 100),
        currency: 'gbp',
        duration: 'once',
        name: 'Applied Discount',
      });
      sessionConfig.discounts = [{ coupon: coupon.id }];
      logStep("Created Stripe coupon", { couponId: coupon.id, amountOff: discountAmount });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, finalTotal: serverSubtotal - discountAmount });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
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
