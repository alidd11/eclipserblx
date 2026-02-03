import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RobuxAdTransaction {
  secret: string;
  roblox_user_id: string;
  roblox_username: string;
  gamepass_id: string;
  robux_amount: number;
  transaction_id: string;
  // Ad details passed from pending ad
  pending_ad_id?: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ROBUX-AD-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('ROBUX_WEBHOOK_SECRET');
    if (!webhookSecret) {
      logStep('ERROR: ROBUX_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RobuxAdTransaction = await req.json();
    logStep('Received webhook', { 
      roblox_user_id: body.roblox_user_id,
      gamepass_id: body.gamepass_id,
      robux_amount: body.robux_amount,
      transaction_id: body.transaction_id,
      pending_ad_id: body.pending_ad_id,
    });

    // Verify secret
    if (body.secret !== webhookSecret) {
      logStep('ERROR: Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Invalid secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    const requiredFields = ['roblox_user_id', 'roblox_username', 'gamepass_id', 'robux_amount', 'transaction_id'];
    for (const field of requiredFields) {
      if (!body[field as keyof RobuxAdTransaction]) {
        logStep(`ERROR: Missing required field: ${field}`);
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get configured gamepass ID from settings
    const { data: gamepassSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'robux_ad_gamepass_id')
      .single();

    const configuredGamepassId = gamepassSetting?.value?.toString().replace(/"/g, '') || '';
    
    if (!configuredGamepassId) {
      logStep('ERROR: Robux ad gamepass not configured');
      return new Response(
        JSON.stringify({ error: 'Robux ad gamepass not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify this is the correct gamepass
    if (body.gamepass_id !== configuredGamepassId) {
      logStep('ERROR: Invalid gamepass ID', { received: body.gamepass_id, expected: configuredGamepassId });
      return new Response(
        JSON.stringify({ error: 'Invalid gamepass for advertisement purchase' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate transaction
    const { data: existingAd } = await supabase
      .from('discord_advertisements')
      .select('id')
      .eq('robux_transaction_id', body.transaction_id)
      .single();

    if (existingAd) {
      logStep('Duplicate transaction detected', { transaction_id: body.transaction_id });
      return new Response(
        JSON.stringify({ error: 'Transaction already processed', duplicate: true }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by linked Roblox account
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('roblox_id', body.roblox_user_id)
      .single();

    if (!profile) {
      logStep('ERROR: No linked account found for Roblox user', { roblox_user_id: body.roblox_user_id });
      return new Response(
        JSON.stringify({ error: 'No website account linked to this Roblox user. Please link your Roblox account first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Found linked user', { user_id: profile.user_id });

    // If pending_ad_id is provided, update that ad as paid
    if (body.pending_ad_id) {
      const { data: pendingAd, error: pendingError } = await supabase
        .from('discord_advertisements')
        .select('*')
        .eq('id', body.pending_ad_id)
        .eq('user_id', profile.user_id)
        .eq('status', 'pending_robux')
        .single();

      if (pendingError || !pendingAd) {
        logStep('ERROR: Pending ad not found', { pending_ad_id: body.pending_ad_id });
        return new Response(
          JSON.stringify({ error: 'Pending advertisement not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update the pending ad to paid
      const { error: updateError } = await supabase
        .from('discord_advertisements')
        .update({
          status: 'paid',
          robux_transaction_id: body.transaction_id,
          payment_method: 'robux',
          price_paid: body.robux_amount,
        })
        .eq('id', body.pending_ad_id);

      if (updateError) {
        logStep('ERROR: Failed to update ad', updateError);
        throw updateError;
      }

      logStep('Updated pending ad to paid', { ad_id: body.pending_ad_id });

      // Trigger Discord webhook to post the ad
      const webhookResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-advertisement-discord-webhook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ advertisementId: body.pending_ad_id }),
        }
      );

      const webhookResult = await webhookResponse.json();
      logStep('Discord webhook result', webhookResult);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Advertisement paid and posted',
          ad_id: body.pending_ad_id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No pending ad - just record the transaction for manual use
    // The user will need to create an ad and it will be automatically marked as paid
    logStep('Transaction recorded without pending ad - user has credit for one ad');

    // Record in robux_transactions table
    const { error: txError } = await supabase
      .from('robux_transactions')
      .insert({
        roblox_user_id: body.roblox_user_id,
        roblox_username: body.roblox_username,
        product_id: body.gamepass_id,
        product_name: 'Advertisement Gamepass',
        robux_amount: body.robux_amount,
        robux_after_tax: Math.floor(body.robux_amount * 0.7),
        transaction_id: body.transaction_id,
        transaction_type: 'gamepass',
      });

    if (txError) {
      logStep('Warning: Failed to record transaction', txError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Transaction recorded',
        user_id: profile.user_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
