import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-AFFILIATE-PAYOUT] ${step}${detailsStr}`);
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

    // Check if request is from staff
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const staffUser = userData.user;
    if (!staffUser?.id) throw new Error("User not authenticated");

    // Check if user is staff
    const { data: isStaff } = await supabaseClient.rpc('is_staff', { _user_id: staffUser.id });
    if (!isStaff) throw new Error("Unauthorized: Staff access required");
    logStep("Staff authenticated", { staffUserId: staffUser.id });

    const { payoutId } = await req.json();
    if (!payoutId) throw new Error("Payout ID is required");

    // Get payout details
    const { data: payout, error: payoutError } = await supabaseClient
      .from('affiliate_payouts')
      .select('*')
      .eq('id', payoutId)
      .single();

    if (payoutError || !payout) throw new Error("Payout not found");
    if (payout.status !== 'pending') throw new Error("Payout is not pending");

    logStep("Processing payout", { payoutId, amount: payout.amount, userId: payout.user_id });

    // Get user's Stripe Connect account
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id')
      .eq('user_id', payout.user_id)
      .single();

    if (!profile?.stripe_account_id) {
      throw new Error("User does not have a Stripe Connect account");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check account status
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    if (!account.payouts_enabled) {
      throw new Error("User's Stripe account cannot receive payouts");
    }

    // Create transfer to connected account
    const transfer = await stripe.transfers.create({
      amount: payout.amount, // Amount in pence
      currency: 'gbp',
      destination: profile.stripe_account_id,
      transfer_group: `PAYOUT_${payoutId}`,
      metadata: {
        payout_id: payoutId,
        user_id: payout.user_id,
      },
    });

    logStep("Transfer created", { transferId: transfer.id, amount: transfer.amount });

    // Update payout record
    await supabaseClient
      .from('affiliate_payouts')
      .update({
        status: 'completed',
        stripe_account_id: profile.stripe_account_id,
        stripe_transfer_id: transfer.id,
        processed_at: new Date().toISOString(),
        processed_by: staffUser.id,
      })
      .eq('id', payoutId);

    // Update total_paid in affiliate_balances
    const { data: currentBalance } = await supabaseClient
      .from('affiliate_balances')
      .select('total_paid')
      .eq('user_id', payout.user_id)
      .single();

    if (currentBalance) {
      await supabaseClient
        .from('affiliate_balances')
        .update({
          total_paid: currentBalance.total_paid + payout.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', payout.user_id);
    }

    logStep("Payout completed", { payoutId, transferId: transfer.id });

    return new Response(JSON.stringify({ 
      success: true,
      transferId: transfer.id,
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
