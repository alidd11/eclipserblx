import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CONNECT-ACCOUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get the store for this user
    const { data: store, error: storeError } = await supabaseClient
      .from('stores')
      .select('id, stripe_account_id, name')
      .eq('owner_id', user.id)
      .single();

    if (storeError || !store) {
      throw new Error("No store found for this user");
    }
    logStep("Found store", { storeId: store.id, storeName: store.name });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    let accountId = store.stripe_account_id;

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

      // Save to stores table
      const { error: updateError } = await supabaseClient
        .from('stores')
        .update({ stripe_account_id: accountId })
        .eq('id', store.id);

      if (updateError) {
        logStep("Warning: Failed to save stripe_account_id", { error: updateError.message });
      }

      logStep("Created Connect account", { accountId });
    } else {
      logStep("Using existing Connect account", { accountId });
    }

    // Create account link for onboarding
    const origin = req.headers.get("origin") || "https://roleplay-hub-shop.lovable.app";
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/seller/settings`,
      return_url: `${origin}/seller/settings?stripe_onboarding=complete`,
      type: 'account_onboarding',
    });

    logStep("Created account link", { url: accountLink.url });

    return new Response(JSON.stringify({ 
      url: accountLink.url,
      accountId 
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
