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
  console.log(`[DELETE-PAYMENT-METHOD] ${step}${detailsStr}`);
};

// Validate Stripe payment method ID format
const isValidPaymentMethodId = (id: string): boolean => /^pm_[a-zA-Z0-9_]+$/.test(id);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'delete-payment-method' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("User not authenticated");

    const { paymentMethodId } = await req.json();
    
    if (!paymentMethodId || typeof paymentMethodId !== 'string') {
      throw new Error("Payment method ID is required");
    }

    // Validate format to prevent injection
    if (!isValidPaymentMethodId(paymentMethodId)) {
      throw new Error("Invalid payment method ID format");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find customer by email
    const customers = await stripe.customers.list({
      email: userData.user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found");
    }

    const customerId = customers.data[0].id;

    // Verify the payment method belongs to this customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    if (paymentMethod.customer !== customerId) {
      throw new Error("Payment method does not belong to this customer");
    }

    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(paymentMethodId);

    logStep("Deleted payment method", { paymentMethodId, customerId });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
