import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

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

interface CheckoutRequest {
  items: CartItem[];
  email?: string;
  discountCodeId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { items, email, discountCodeId, successUrl, cancelUrl }: CheckoutRequest = await req.json();
    logStep("Request received", { itemCount: items?.length, discountCodeId });

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
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
        logStep("Discount applied", { discountAmount, type: discount.discount_type });
      }
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

    // Check if customer exists in Stripe
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer", { customerId });
      }
    }

    // Create line items for Stripe Checkout
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
          metadata: {
            product_id: item.id,
          },
        },
        unit_amount: Math.round(item.price * 100),
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
        items: JSON.stringify(items.map(i => ({ id: i.id, name: i.name, price: i.price, category_slug: i.category_slug }))),
        discount_code_id: discountCodeId || "",
        discount_amount: discountAmount.toString(),
      },
      billing_address_collection: "auto",
    };

    // Apply discount using Stripe coupons if there's a discount
    if (discountAmount > 0) {
      // Create a one-time coupon for this specific discount amount
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

    logStep("Checkout session created", { sessionId: session.id });

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
