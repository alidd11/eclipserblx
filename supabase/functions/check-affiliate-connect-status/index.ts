import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-AFFILIATE-CONNECT-STATUS] ${step}${detailsStr}`);
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
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get user's stripe_account_id from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error("Failed to fetch profile");
    }

    if (!profile?.stripe_account_id) {
      logStep("No Connect account found");
      return new Response(JSON.stringify({ 
        hasAccount: false,
        isOnboarded: false,
        canReceivePayments: false,
        accountId: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found stripe_account_id", { accountId: profile.stripe_account_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the account from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    const isOnboarded = account.details_submitted === true;
    const canReceivePayments = account.payouts_enabled === true || account.transfers_enabled === true;

    logStep("Account status retrieved", { 
      isOnboarded, 
      canReceivePayments,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      transfersEnabled: account.transfers_enabled,
    });

    return new Response(JSON.stringify({ 
      hasAccount: true,
      isOnboarded,
      canReceivePayments,
      accountId: profile.stripe_account_id,
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
