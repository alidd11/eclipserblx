import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CREDIT-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'create-credit-checkout' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { amount } = await req.json();
    
    // Validate amount (minimum £1.00, maximum £500.00)
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || !isFinite(amountNum) || amountNum < 1 || amountNum > 500) {
      throw new Error("Amount must be between £1.00 and £500.00");
    }

    // Round to 2 decimal places
    const creditAmount = Math.round(amountNum * 100) / 100;
    const stripeAmount = Math.round(creditAmount * 100); // Convert to pence

    if (stripeAmount < 100) throw new Error("Minimum amount is £1.00");

    logStep("Credit purchase request", { creditAmount, stripeAmount });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Validate origin
    const rawOrigin = req.headers.get("origin");
    const allowedOrigins = ["https://eclipserblx.com", "https://www.eclipserblx.com"];
    const origin = rawOrigin && allowedOrigins.some(o => rawOrigin.startsWith(o))
      ? rawOrigin
      : "https://eclipserblx.com";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Store Credit - £${creditAmount.toFixed(2)}`,
              description: `Add £${creditAmount.toFixed(2)} credit to your account`,
            },
            unit_amount: stripeAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/credits?success=true&amount=${creditAmount}`,
      cancel_url: `${origin}/credits?canceled=true`,
      metadata: {
        type: "credit_purchase",
        user_id: user.id,
        credit_amount: creditAmount.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
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
