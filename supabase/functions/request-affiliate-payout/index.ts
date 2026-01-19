import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REQUEST-AFFILIATE-PAYOUT] ${step}${detailsStr}`);
};

const MINIMUM_PAYOUT_AMOUNT = 1000; // £10.00 minimum in pence

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

    const { amount } = await req.json();
    if (!amount || amount < MINIMUM_PAYOUT_AMOUNT) {
      throw new Error(`Minimum payout amount is £${(MINIMUM_PAYOUT_AMOUNT / 100).toFixed(2)}`);
    }

    // Check user's available balance
    const { data: balance, error: balanceError } = await supabaseClient
      .from('affiliate_balances')
      .select('available_balance')
      .eq('user_id', user.id)
      .single();

    if (balanceError || !balance) {
      throw new Error("No affiliate balance found");
    }

    if (balance.available_balance < amount) {
      throw new Error("Insufficient balance");
    }

    logStep("Balance check passed", { available: balance.available_balance, requested: amount });

    // Check user has a valid Stripe Connect account
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.stripe_account_id) {
      throw new Error("Please set up your payout account first");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Verify account can receive payouts
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    if (!account.payouts_enabled) {
      throw new Error("Your payout account is not fully set up. Please complete onboarding.");
    }

    // Check for pending payouts
    const { data: pendingPayouts } = await supabaseClient
      .from('affiliate_payouts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (pendingPayouts && pendingPayouts.length > 0) {
      throw new Error("You already have a pending payout request");
    }

    // Deduct from available balance first
    const newBalance = balance.available_balance - amount;
    const { error: updateBalanceError } = await supabaseClient
      .from('affiliate_balances')
      .update({ 
        available_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateBalanceError) {
      throw new Error("Failed to update balance");
    }

    logStep("Balance deducted", { previousBalance: balance.available_balance, newBalance, amount });

    // Create payout request
    const { data: payout, error: payoutError } = await supabaseClient
      .from('affiliate_payouts')
      .insert({
        user_id: user.id,
        amount: amount,
        stripe_account_id: profile.stripe_account_id,
        status: 'pending',
      })
      .select()
      .single();

    if (payoutError) {
      // Rollback balance deduction
      await supabaseClient
        .from('affiliate_balances')
        .update({ 
          available_balance: balance.available_balance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      throw new Error("Failed to create payout request");
    }

    logStep("Payout request created", { payoutId: payout.id, amount });

    return new Response(JSON.stringify({ 
      success: true,
      payoutId: payout.id,
      message: "Payout request submitted successfully",
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
