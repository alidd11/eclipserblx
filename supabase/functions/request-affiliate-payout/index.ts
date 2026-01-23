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

    const { amount, method } = await req.json();
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

    // Get user's affiliate application to check payout method and details
    const { data: application, error: appError } = await supabaseClient
      .from('affiliate_applications')
      .select('paypal_email, preferred_payout_method')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single();

    if (appError || !application) {
      throw new Error("No approved affiliate application found");
    }

    // Determine which payout method to use
    const payoutMethod = method || application.preferred_payout_method || 'paypal';
    logStep("Payout method determined", { payoutMethod, requestedMethod: method, preferredMethod: application.preferred_payout_method });

    // Get user's profile for stripe_account_id
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    // Validate based on payout method
    if (payoutMethod === 'stripe') {
      if (!profile?.stripe_account_id) {
        throw new Error("Please connect your Stripe account first to receive automatic payouts.");
      }
    } else {
      // PayPal
      if (!application.paypal_email) {
        throw new Error("Please add your PayPal email to receive payouts. Contact support to update your details.");
      }
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

    // For Stripe payouts, attempt automatic transfer
    if (payoutMethod === 'stripe' && profile?.stripe_account_id) {
      try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
        
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

        // Create a transfer to the connected account
        const transfer = await stripe.transfers.create({
          amount: amount,
          currency: 'gbp',
          destination: profile.stripe_account_id,
          metadata: {
            user_id: user.id,
            type: 'affiliate_payout',
          },
        });

        logStep("Stripe transfer created", { transferId: transfer.id, amount });

        // Create completed payout record
        const { data: payout, error: payoutError } = await supabaseClient
          .from('affiliate_payouts')
          .insert({
            user_id: user.id,
            amount: amount,
            stripe_account_id: profile.stripe_account_id,
            payout_method: 'stripe',
            status: 'completed',
            processed_at: new Date().toISOString(),
            notes: `Automatic Stripe transfer: ${transfer.id}`,
          })
          .select()
          .single();

        if (payoutError) {
          logStep("Warning: Failed to create payout record", { error: payoutError.message });
        }

        // Update total_paid in affiliate_balances
        const { data: currentBalance } = await supabaseClient
          .from('affiliate_balances')
          .select('total_paid')
          .eq('user_id', user.id)
          .single();

        if (currentBalance) {
          await supabaseClient
            .from('affiliate_balances')
            .update({
              total_paid: currentBalance.total_paid + amount,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        }

        return new Response(JSON.stringify({ 
          success: true,
          payoutId: payout?.id,
          transferId: transfer.id,
          method: 'stripe',
          message: "Payout completed! Funds have been transferred to your Stripe account.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      } catch (stripeError) {
        // Rollback balance deduction on Stripe failure
        await supabaseClient
          .from('affiliate_balances')
          .update({ 
            available_balance: balance.available_balance,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        const errorMsg = stripeError instanceof Error ? stripeError.message : String(stripeError);
        logStep("Stripe transfer failed", { error: errorMsg });
        throw new Error(`Stripe transfer failed: ${errorMsg}`);
      }
    }

    // PayPal payout - create pending request
    const { data: payout, error: payoutError } = await supabaseClient
      .from('affiliate_payouts')
      .insert({
        user_id: user.id,
        amount: amount,
        paypal_email: application.paypal_email,
        payout_method: 'paypal',
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

    logStep("PayPal payout request created", { payoutId: payout.id, amount, paypalEmail: application.paypal_email });

    return new Response(JSON.stringify({ 
      success: true,
      payoutId: payout.id,
      method: 'paypal',
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
