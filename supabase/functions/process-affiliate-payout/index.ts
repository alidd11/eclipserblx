import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    if (!payout.paypal_email) {
      throw new Error("No PayPal email associated with this payout request");
    }

    logStep("Processing payout", { 
      payoutId, 
      amount: payout.amount, 
      userId: payout.user_id,
      paypalEmail: payout.paypal_email 
    });

    // Mark as completed - staff will manually send PayPal payment
    // This function just updates the status for record keeping
    const { error: updateError } = await supabaseClient
      .from('affiliate_payouts')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        processed_by: staffUser.id,
        notes: `PayPal payment to be sent to: ${payout.paypal_email}`,
      })
      .eq('id', payoutId);

    if (updateError) {
      throw new Error("Failed to update payout status");
    }

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

    logStep("Payout marked as completed", { 
      payoutId, 
      paypalEmail: payout.paypal_email,
      amount: `£${(payout.amount / 100).toFixed(2)}` 
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Payout marked as completed. Please send £${(payout.amount / 100).toFixed(2)} to ${payout.paypal_email} via PayPal.`,
      paypalEmail: payout.paypal_email,
      amount: payout.amount,
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
