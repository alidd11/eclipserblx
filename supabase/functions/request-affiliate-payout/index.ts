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
  console.log(`[REQUEST-AFFILIATE-PAYOUT] ${step}${detailsStr}`);
};

const MINIMUM_PAYOUT_AMOUNT = 1000; // £10.00 minimum in pence
const MAXIMUM_PAYOUT_AMOUNT = 1000000; // £10,000 max safety cap

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit - strict for financial operations
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'request-affiliate-payout' });
    if (!rl.allowed) {
      logStep("Rate limit exceeded", { ip: clientIp });
      return rateLimitResponse(rl, corsHeaders);
    }

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

    // Validate amount is a number
    if (typeof amount !== 'number' || !Number.isFinite(amount) || !Number.isInteger(amount)) {
      throw new Error("Invalid amount");
    }

    if (amount < MINIMUM_PAYOUT_AMOUNT) {
      throw new Error(`Minimum payout amount is £${(MINIMUM_PAYOUT_AMOUNT / 100).toFixed(2)}`);
    }

    if (amount > MAXIMUM_PAYOUT_AMOUNT) {
      throw new Error(`Maximum payout amount is £${(MAXIMUM_PAYOUT_AMOUNT / 100).toFixed(2)}`);
    }

    // Validate method
    if (method && !['stripe', 'paypal', 'bank_transfer'].includes(method)) {
      throw new Error("Invalid payout method");
    }

    // Check for pending payouts FIRST (before touching balance)
    const { data: pendingPayouts } = await supabaseClient
      .from('affiliate_payouts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (pendingPayouts && pendingPayouts.length > 0) {
      throw new Error("You already have a pending payout request");
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

    // Get user's profile for payout method and details
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id, paypal_email, preferred_payout_method, bank_account_holder, bank_account_number, bank_swift_bic, bank_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("No profile found");
    }

    // Determine which payout method to use
    const payoutMethod = method || profile.preferred_payout_method || 'paypal';
    logStep("Payout method determined", { payoutMethod });

    // Validate based on payout method
    if (payoutMethod === 'stripe') {
      if (!profile.stripe_account_id) {
        throw new Error("Please connect your Stripe account first to receive automatic payouts.");
      }
    } else if (payoutMethod === 'bank_transfer') {
      if (!profile.bank_account_holder || !profile.bank_account_number) {
        throw new Error("Please add your bank details to receive bank transfer payouts.");
      }
    } else {
      if (!profile.paypal_email) {
        throw new Error("Please add your PayPal email to receive payouts. Update your payout settings.");
      }
    }

    // Deduct from available balance first
    const newBalance = balance.available_balance - amount;
    const { error: updateBalanceError } = await supabaseClient
      .from('affiliate_balances')
      .update({ 
        available_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      // Optimistic concurrency: only update if balance hasn't changed
      .gte('available_balance', amount);

    if (updateBalanceError) {
      throw new Error("Failed to update balance - please try again");
    }

    logStep("Balance deducted", { previousBalance: balance.available_balance, newBalance, amount });

    // For Stripe payouts, attempt automatic transfer
    if (payoutMethod === 'stripe' && profile.stripe_account_id) {
      try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
        
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

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

        const { data: payout } = await supabaseClient
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

        // Update total_paid
        await supabaseClient
          .from('affiliate_balances')
          .update({
            total_paid: (balance.available_balance - newBalance) + amount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

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
        logStep("Stripe transfer failed, balance rolled back", { error: errorMsg });
        throw new Error(`Stripe transfer failed: ${errorMsg}`);
      }
    }

    // Non-Stripe payout (PayPal or Bank Transfer) - create pending request
    const payoutData: any = {
      user_id: user.id,
      amount: amount,
      payout_method: payoutMethod,
      status: 'pending',
    };
    
    if (payoutMethod === 'paypal') {
      payoutData.paypal_email = profile.paypal_email;
    }
    if (payoutMethod === 'bank_transfer') {
      payoutData.notes = `Bank: ${profile.bank_name || 'N/A'}, Holder: ${profile.bank_account_holder}, Account: ${profile.bank_account_number}, SWIFT: ${profile.bank_swift_bic || 'N/A'}`;
    }

    const { data: payout, error: payoutError } = await supabaseClient
      .from('affiliate_payouts')
      .insert(payoutData)
      .select()
      .single();

    if (payoutError) {
      await supabaseClient
        .from('affiliate_balances')
        .update({ 
          available_balance: balance.available_balance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      throw new Error("Failed to create payout request");
    }

    const methodLabel = payoutMethod === 'bank_transfer' ? 'bank transfer' : 'PayPal';
    logStep(`${methodLabel} payout request created`, { payoutId: payout.id, amount });

    return new Response(JSON.stringify({ 
      success: true,
      payoutId: payout.id,
      method: payoutMethod,
      message: `Payout request submitted! Your ${methodLabel} payment will be processed today.`,
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
