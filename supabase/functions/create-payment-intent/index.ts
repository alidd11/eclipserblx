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

type PaymentType = 'checkout' | 'credits' | 'subscription' | 'ad_pings';

interface PaymentIntentRequest {
  type?: PaymentType;
  // For checkout
  items?: CartItem[];
  email?: string;
  discountCodeId?: string;
  // For credits
  amount?: number;
  // For subscription
  tier?: string;
  billingPeriod?: 'monthly' | 'annual';
  // For ad pings
  herePings?: number;
  everyonePings?: number;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-INTENT] ${step}${detailsStr}`);
};

// Server-side Eclipse+ discount eligibility check
function isEligibleForDiscount(categoryId: string | null | undefined, isResellable: boolean | null | undefined, storeEclipseEnabled?: boolean): boolean {
  if (storeEclipseEnabled === false) return false;
  if (isResellable) return false;
  return categoryId !== ECLIPSE_SAVERS_CATEGORY_ID;
}

// Server-side member price calculation
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
    // Rate limit check
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

    const requestBody: PaymentIntentRequest = await req.json();
    const { type = 'checkout', items, email, discountCodeId, amount, tier, billingPeriod, herePings, everyonePings } = requestBody;
    
    logStep("Request received", { type, itemCount: items?.length, email, amount, tier });

    // Authenticate user
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

    if (!userId && type !== 'checkout') {
      throw new Error("Authentication required");
    }

    // Get or create Stripe customer
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else if (userId) {
        const customer = await stripe.customers.create({ email: userEmail });
        customerId = customer.id;
      }
      logStep("Customer ready", { customerId });
    }

    let amountInPence: number;
    let description: string;
    const metadata: Record<string, string> = {
      user_id: userId || "",
      customer_email: userEmail || "",
      payment_type: type,
    };

    // Calculate amount based on payment type
    switch (type) {
      case 'checkout': {
        if (!items || items.length === 0) throw new Error("No items provided");

        // Check Eclipse+ subscription
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
          }
        }

        // Fetch and validate products
        const productIds = items.map(item => item.id);
        const { data: products, error: productsError } = await supabaseClient
          .from('products')
      .select('id, name, price, category_id, is_resellable, store_id, stores(eclipse_plus_discount_enabled)')
      .in('id', productIds);

        if (productsError) throw new Error("Failed to verify product prices");

        const productMap = new Map(products?.map(p => [p.id, p]) || []);
        let serverSubtotal = 0;
        let serverEclipseDiscount = 0;
        const validatedItems: Array<{ id: string; name: string; finalPrice: number; originalPrice: number; category_id?: string; category_slug?: string }> = [];

        for (const item of items) {
          const product = productMap.get(item.id);
          if (!product) throw new Error(`Product not found: ${item.id}`);

          const originalPrice = product.price;
          let finalPrice = originalPrice;
          
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
            finalPrice,
            originalPrice,
            category_id: product.category_id,
            category_slug: item.category_slug,
          });
          serverSubtotal += finalPrice;
        }

        // Apply discount code
        let discountAmount = 0;
        if (discountCodeId && !isEclipseMember) {
          const { data: discount } = await supabaseClient
            .from('discount_codes')
            .select('*')
            .eq('id', discountCodeId)
            .eq('is_active', true)
            .single();

          if (discount) {
            // Verify user restriction
            if (discount.restricted_to_user_id && discount.restricted_to_user_id !== userId) {
              // Skip - user not allowed to use this code
            } else {
              // Check if this is a BOOST code - restrict to Eclipse & Vino stores only
              const isBoostCode = discount.code?.startsWith('BOOST-');
              const ADMIN_STORE_IDS = ['83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a', '9b842052-e1fd-4dfe-99bf-c7625df3e17d'];
              
              if (isBoostCode) {
                const itemStoreIds = validatedItems.map((i: any) => productMap.get(i.id)?.store_id).filter(Boolean);
                const allFromAdminStores = itemStoreIds.length > 0 && itemStoreIds.every((sid: string) => ADMIN_STORE_IDS.includes(sid));
                
                if (!allFromAdminStores) {
                  logStep("Boost discount rejected - items not from Eclipse/Vino stores");
                } else {
                  if (discount.discount_type === 'percentage') {
                    discountAmount = (serverSubtotal * discount.discount_value) / 100;
                  } else {
                    discountAmount = Math.min(discount.discount_value, serverSubtotal);
                  }
                }
              } else if (discount.store_id) {
                const itemStoreIds = validatedItems.map((i: any) => productMap.get(i.id)?.store_id).filter(Boolean);
                if (!itemStoreIds.includes(discount.store_id)) {
                  // Skip - store mismatch
                } else {
                  if (discount.discount_type === 'percentage') {
                    discountAmount = (serverSubtotal * discount.discount_value) / 100;
                  } else {
                    discountAmount = Math.min(discount.discount_value, serverSubtotal);
                  }
                }
              } else {
                if (discount.discount_type === 'percentage') {
                  discountAmount = (serverSubtotal * discount.discount_value) / 100;
                } else {
                  discountAmount = Math.min(discount.discount_value, serverSubtotal);
                }
              }
            }
          }
        }

        amountInPence = Math.round((serverSubtotal - discountAmount) * 100);
        
        if (amountInPence < 100) throw new Error("Minimum order amount is £1.00");

        description = `Purchase: ${validatedItems.map(i => i.name).join(', ')}`;
        // Truncate items metadata to fit Stripe's 500-char limit
        const compactItems = validatedItems.map(i => ({ id: i.id, name: i.name, finalPrice: i.finalPrice }));
        let itemsJson = JSON.stringify(compactItems);
        if (itemsJson.length > 490) {
          // Further reduce: just IDs and prices
          const minimalItems = validatedItems.map(i => ({ id: i.id, p: i.finalPrice }));
          itemsJson = JSON.stringify(minimalItems);
          if (itemsJson.length > 490) {
            itemsJson = itemsJson.substring(0, 490);
          }
        }
        metadata.items = itemsJson;
        metadata.discount_code_id = discountCodeId || '';
        metadata.discount_amount = discountAmount.toString();
        metadata.eclipse_discount = serverEclipseDiscount.toString();
        metadata.is_eclipse_member = isEclipseMember ? "true" : "false";
        break;
      }

      case 'credits': {
        const amountNum = parseFloat(String(amount));
        if (isNaN(amountNum) || amountNum < 1 || amountNum > 500) {
          throw new Error("Amount must be between £1.00 and £500.00");
        }
        amountInPence = Math.round(amountNum * 100);
        description = `Store Credit - £${amountNum.toFixed(2)}`;
        metadata.credit_amount = amountNum.toString();
        break;
      }

      case 'subscription': {
        const tierName = tier || 'pro';
        const period = billingPeriod || 'monthly';
        
        const { data: tierData, error: tierError } = await supabaseClient
          .from('subscription_tiers')
          .select('*')
          .eq('tier', tierName)
          .eq('is_active', true)
          .maybeSingle();

        if (tierError || !tierData) throw new Error(`Tier '${tierName}' not found`);

        // For subscriptions, we'll use SetupIntent to collect payment method
        const setupIntent = await stripe.setupIntents.create({
          customer: customerId,
          payment_method_types: ['card'],
          metadata: {
            ...metadata,
            tier: tierName,
            billing_period: period,
          },
        });

        logStep("SetupIntent created for subscription", { setupIntentId: setupIntent.id });

        return new Response(JSON.stringify({
          clientSecret: setupIntent.client_secret,
          intentType: 'setup_intent',
          customerId,
          tier: tierName,
          billingPeriod: period,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'ad_pings': {
        const hereCount = Math.max(0, Math.min(100, parseInt(String(herePings)) || 0));
        const everyoneCount = Math.max(0, Math.min(100, parseInt(String(everyonePings)) || 0));

        if (hereCount === 0 && everyoneCount === 0) {
          throw new Error("Please select at least one ping to purchase");
        }

        // Check subscription requirement
        const { data: adSub } = await supabaseClient
          .from("advertisement_subscriptions")
          .select("*")
          .eq("user_id", userId!)
          .eq("status", "active")
          .maybeSingle();

        // Allow test user to bypass
        const isTestUser = userEmail === "alicanimir1@gmail.com";
        if (!adSub && !isTestUser) {
          throw new Error("You need an active advertisement subscription to purchase pings");
        }

        // Pricing with bulk discounts
        const HERE_PING_BASE = 79;
        const EVERYONE_PING_BASE = 149;
        const BULK_DISCOUNTS = [
          { minQty: 50, discount: 0.30 },
          { minQty: 25, discount: 0.20 },
          { minQty: 10, discount: 0.10 },
          { minQty: 5, discount: 0.05 },
        ];

        const getDiscountedPrice = (base: number, qty: number) => {
          const tier = BULK_DISCOUNTS.find(t => qty >= t.minQty);
          return tier ? Math.round(base * (1 - tier.discount)) : base;
        };

        let totalPence = 0;
        if (hereCount > 0) {
          totalPence += getDiscountedPrice(HERE_PING_BASE, hereCount) * hereCount;
        }
        if (everyoneCount > 0) {
          totalPence += getDiscountedPrice(EVERYONE_PING_BASE, everyoneCount) * everyoneCount;
        }

        amountInPence = totalPence;
        description = `Ad Pings: ${hereCount} @here, ${everyoneCount} @everyone`;
        metadata.here_pings = hereCount.toString();
        metadata.everyone_pings = everyoneCount.toString();
        break;
      }

      default:
        throw new Error("Invalid payment type");
    }

    // Create PaymentIntent for one-time payments
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: 'gbp',
      customer: customerId,
      receipt_email: userEmail,
      description,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
      setup_future_usage: 'on_session', // Save card for future use
    });

    logStep("PaymentIntent created", { paymentIntentId: paymentIntent.id, amount: amountInPence });

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      intentType: 'payment_intent',
      paymentIntentId: paymentIntent.id,
      amount: amountInPence,
    }), {
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
