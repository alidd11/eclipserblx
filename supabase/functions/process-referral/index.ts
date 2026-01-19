import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMMISSION_RATE = 0.10; // 10% commission

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-REFERRAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { orderId, userId, orderTotal } = await req.json();

    if (!orderId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Processing referral", { orderId, userId, orderTotal });

    // Check if this user was referred and hasn't completed a referral yet
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referred_id', userId)
      .eq('status', 'pending')
      .single();

    if (referralError || !referral) {
      logStep("No pending referral for this user");
      return new Response(
        JSON.stringify({ message: "No pending referral" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found pending referral", { referralId: referral.id, referrerId: referral.referrer_id });

    // Update referral status to completed
    await supabaseAdmin
      .from('referrals')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        order_id: orderId 
      })
      .eq('id', referral.id);

    // Calculate commission (order total should be in pence)
    const orderTotalPence = orderTotal ? Math.round(orderTotal * 100) : 0;
    const commissionAmount = Math.round(orderTotalPence * COMMISSION_RATE);

    logStep("Calculated commission", { orderTotalPence, commissionRate: COMMISSION_RATE, commissionAmount });

    // Create affiliate commission record
    if (commissionAmount > 0) {
      const { error: commissionError } = await supabaseAdmin
        .from('affiliate_commissions')
        .insert({
          affiliate_id: referral.referrer_id,
          referred_user_id: userId,
          order_id: orderId,
          order_total: orderTotalPence,
          commission_rate: COMMISSION_RATE,
          commission_amount: commissionAmount,
          status: 'pending',
        });

      if (commissionError) {
        logStep("Failed to create commission", { error: commissionError });
      } else {
        logStep("Commission created successfully");
      }
    }

    // Generate discount code for referrer (existing logic)
    const referrerDiscountCode = `REF${referral.referrer_id.substring(0, 4).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
    
    // Create discount code for referrer (10% off)
    const { data: referrerDiscount, error: referrerDiscountError } = await supabaseAdmin
      .from('discount_codes')
      .insert({
        code: referrerDiscountCode,
        discount_type: 'percentage',
        discount_value: 10,
        max_uses: 1,
        current_uses: 0,
        is_active: true,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (referrerDiscountError) {
      logStep('Failed to create referrer discount', { error: referrerDiscountError });
    } else {
      // Create reward record for referrer
      await supabaseAdmin
        .from('referral_rewards')
        .insert({
          user_id: referral.referrer_id,
          referral_id: referral.id,
          reward_type: 'percentage_discount',
          reward_value: 10,
          discount_code_id: referrerDiscount.id,
          expires_at: referrerDiscount.expires_at,
        });
    }

    // Generate discount code for referred user
    const referredDiscountCode = `WELCOME${userId.substring(0, 4).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
    
    // Create discount code for referred user (10% off)
    const { data: referredDiscount, error: referredDiscountError } = await supabaseAdmin
      .from('discount_codes')
      .insert({
        code: referredDiscountCode,
        discount_type: 'percentage',
        discount_value: 10,
        max_uses: 1,
        current_uses: 0,
        is_active: true,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (referredDiscountError) {
      logStep('Failed to create referred user discount', { error: referredDiscountError });
    } else {
      // Create reward record for referred user
      await supabaseAdmin
        .from('referral_rewards')
        .insert({
          user_id: userId,
          referral_id: referral.id,
          reward_type: 'percentage_discount',
          reward_value: 10,
          discount_code_id: referredDiscount.id,
          expires_at: referredDiscount.expires_at,
        });
    }

    logStep(`Referral completed: ${referral.id}. Commission: £${(commissionAmount / 100).toFixed(2)}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        referralId: referral.id,
        referrerCode: referrerDiscountCode,
        referredCode: referredDiscountCode,
        commissionAmount: commissionAmount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error processing referral", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
