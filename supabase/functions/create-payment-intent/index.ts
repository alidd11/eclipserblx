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
  image?: string;
  category_slug?: string;
  category_id?: string;
}

interface PaymentIntentRequest {
  items: CartItem[];
  email?: string;
  discountCodeId?: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-INTENT] ${step}${detailsStr}`);
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
      action: 'create-payment-intent',
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { items, email, discountCodeId }: PaymentIntentRequest = await req.json();
    logStep("Request received", { itemCount: items?.length, email, discountCodeId });

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
        logStep("User authenticated", { userId, email: userEmail });
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
      .select('id, name, price, category_id, is_resellable, slug')
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
        category_id: product.category_id,
        category_slug: item.category_slug, // Keep original category_slug for bot detection
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
        if (discount.discount_type === 'percentage') {
          discountAmount = (serverSubtotal * discount.discount_value) / 100;
        } else {
          discountAmount = Math.min(discount.discount_value, serverSubtotal);
        }
        logStep("Discount applied", { discountAmount, type: discount.discount_type });
      }
    } else if (discountCodeId && isEclipseMember) {
      logStep("Discount code ignored - Eclipse+ member (no stacking)");
    }

    // Calculate final amount in pence
    const amount = Math.max(0, Math.round((serverSubtotal - discountAmount) * 100));
    logStep("Calculated amount", { serverSubtotal, discountAmount, amount, currency: "gbp" });

    // Minimum order requirement: £1.00 (100 pence)
    const MINIMUM_ORDER_PENCE = 100;
    if (amount < MINIMUM_ORDER_PENCE) {
      logStep("Order below minimum", { amount, minimum: MINIMUM_ORDER_PENCE });
      throw new Error("Minimum order amount is £1.00");
    }

    // Check if customer exists in Stripe
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer", { customerId });
      }
    }

    // Create PaymentIntent with SERVER-VALIDATED prices
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "gbp",
      customer: customerId,
      receipt_email: userEmail,
      metadata: {
        user_id: userId || "",
        customer_email: userEmail || "",
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
      automatic_payment_methods: {
        enabled: true,
      },
    });

    logStep("PaymentIntent created", { paymentIntentId: paymentIntent.id, finalAmount: amount });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
