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

interface PaymentIntentRequest {
  items: CartItem[];
  email?: string;
  discountCodeId?: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-INTENT] ${step}${detailsStr}`);
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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { items, email, discountCodeId }: PaymentIntentRequest = await req.json();
    logStep("Request received", { itemCount: items?.length, email, discountCodeId });

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    // Calculate subtotal in pence (smallest currency unit)
    const subtotal = items.reduce((sum, item) => sum + Math.round(item.price * 100), 0);
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
          discountAmount = Math.round((subtotal * discount.discount_value) / 100);
        } else {
          discountAmount = Math.min(Math.round(discount.discount_value * 100), subtotal);
        }
        logStep("Discount applied", { discountAmount, type: discount.discount_type });
      }
    }

    const amount = Math.max(0, subtotal - discountAmount);
    logStep("Calculated amount", { subtotal, discountAmount, amount, currency: "gbp" });

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

    // Check if customer exists in Stripe
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer", { customerId });
      }
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "gbp",
      customer: customerId,
      receipt_email: userEmail,
      metadata: {
        user_id: userId || "",
        customer_email: userEmail || "",
        items: JSON.stringify(items.map(i => ({ id: i.id, name: i.name, price: i.price, category_slug: i.category_slug }))),
        discount_code_id: discountCodeId || "",
        discount_amount: (discountAmount / 100).toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    logStep("PaymentIntent created", { paymentIntentId: paymentIntent.id });

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
