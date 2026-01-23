import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    // Get user's affiliate application to check PayPal email
    const { data: application } = await supabaseClient
      .from('affiliate_applications')
      .select('paypal_email')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single();

    if (!application?.paypal_email) {
      throw new Error("Please add your PayPal email to receive payouts. Contact support to update your details.");
    }

    logStep("PayPal email verified", { email: application.paypal_email });

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

    // Create payout request with PayPal email
    const { data: payout, error: payoutError } = await supabaseClient
      .from('affiliate_payouts')
      .insert({
        user_id: user.id,
        amount: amount,
        paypal_email: application.paypal_email,
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

    logStep("Payout request created", { payoutId: payout.id, amount, paypalEmail: application.paypal_email });

    return new Response(JSON.stringify({ 
      success: true,
      payoutId: payout.id,
      message: "Payout request submitted successfully. Payment will be sent to your PayPal.",
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
