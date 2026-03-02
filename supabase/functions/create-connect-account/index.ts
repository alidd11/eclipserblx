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
  console.log(`[CREATE-CONNECT-ACCOUNT] ${step}${detailsStr}`);
};

// Allowed origins for redirect URLs
const ALLOWED_ORIGINS = ["https://eclipserblx.com", "https://www.eclipserblx.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'create-connect-account' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Payment service not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error("Authentication failed");
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    // Get the store for this user - support optional store_id param
    let body: { store_id?: string } = {};
    try { body = await req.json(); } catch { /* no body */ }

    // Validate store_id format if provided
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (body.store_id && !UUID_REGEX.test(body.store_id)) {
      throw new Error("Invalid store ID format");
    }

    let storeQuery = supabaseClient
      .from('stores')
      .select('id, name')
      .eq('owner_id', user.id);

    if (body.store_id) {
      storeQuery = storeQuery.eq('id', body.store_id);
    }

    const { data: stores, error: storeError } = await storeQuery.limit(1);

    if (storeError || !stores || stores.length === 0) {
      throw new Error("No store found for this user");
    }
    const store = stores[0];
    logStep("Found store", { storeId: store.id });

    // Get existing payment details
    const { data: paymentDetails } = await supabaseClient
      .from('store_payment_details')
      .select('stripe_account_id')
      .eq('store_id', store.id)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    let accountId = paymentDetails?.stripe_account_id;

    // If no existing account, create one
    if (!accountId) {
      logStep("Creating new Connect account");
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        metadata: {
          user_id: user.id,
          store_id: store.id,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: store.name || undefined,
        },
      });
      accountId = account.id;

      // Save to store_payment_details table (upsert in case row doesn't exist)
      const { error: updateError } = await supabaseClient
        .from('store_payment_details')
        .upsert({ 
          store_id: store.id, 
          stripe_account_id: accountId 
        }, { 
          onConflict: 'store_id' 
        });

      if (updateError) {
        logStep("Warning: Failed to save account ID", { error: updateError.message });
      }

      logStep("Created Connect account");
    } else {
      logStep("Using existing Connect account");
    }

    // Validate origin for redirect URLs
    const rawOrigin = req.headers.get("origin");
    const origin = rawOrigin && ALLOWED_ORIGINS.some(o => rawOrigin.startsWith(o))
      ? rawOrigin
      : "https://eclipserblx.com";
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/seller/settings`,
      return_url: `${origin}/seller/settings?stripe_onboarding=complete`,
      type: 'account_onboarding',
    });

    logStep("Created account link");

    // Return URL only — do NOT expose Stripe account IDs to client
    return new Response(JSON.stringify({ 
      url: accountLink.url,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    logStep("ERROR", { message: errorMessage });
    // Mask internal errors
    const safeMessage = errorMessage.includes("STRIPE") || errorMessage.includes("stripe")
      ? "Payment service error"
      : errorMessage;
    return new Response(JSON.stringify({ error: safeMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
