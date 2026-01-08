import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { orderId, userId } = await req.json();

    if (!orderId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this user was referred and hasn't completed a referral yet
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referred_id', userId)
      .eq('status', 'pending')
      .single();

    if (referralError || !referral) {
      // No pending referral for this user
      return new Response(
        JSON.stringify({ message: "No pending referral" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update referral status to completed
    await supabaseAdmin
      .from('referrals')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        order_id: orderId 
      })
      .eq('id', referral.id);

    // Generate discount code for referrer
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
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      })
      .select()
      .single();

    if (referrerDiscountError) {
      console.error('Failed to create referrer discount:', referrerDiscountError);
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
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      })
      .select()
      .single();

    if (referredDiscountError) {
      console.error('Failed to create referred user discount:', referredDiscountError);
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

    console.log(`Referral completed: ${referral.id}. Rewards created for referrer and referred.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        referralId: referral.id,
        referrerCode: referrerDiscountCode,
        referredCode: referredDiscountCode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing referral:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
