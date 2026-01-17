import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RobuxTransaction {
  secret: string;
  roblox_user_id: string;
  roblox_username: string;
  product_id: string;
  product_name: string;
  robux_amount: number;
  transaction_id: string;
  transaction_type?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('ROBUX_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('ROBUX_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RobuxTransaction = await req.json();
    console.log('Received robux webhook:', { 
      roblox_user_id: body.roblox_user_id,
      product_id: body.product_id,
      robux_amount: body.robux_amount,
      transaction_id: body.transaction_id
    });

    // Verify secret
    if (body.secret !== webhookSecret) {
      console.error('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Invalid secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    const requiredFields = ['roblox_user_id', 'roblox_username', 'product_id', 'product_name', 'robux_amount', 'transaction_id'];
    for (const field of requiredFields) {
      if (!body[field as keyof RobuxTransaction]) {
        console.error(`Missing required field: ${field}`);
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for duplicate transaction
    const { data: existingTransaction } = await supabase
      .from('robux_transactions')
      .select('id')
      .eq('transaction_id', body.transaction_id)
      .single();

    if (existingTransaction) {
      console.log('Duplicate transaction detected:', body.transaction_id);
      return new Response(
        JSON.stringify({ error: 'Transaction already recorded', duplicate: true }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate after-tax amount (Roblox takes 30%)
    const robuxAfterTax = Math.floor(body.robux_amount * 0.7);

    // Insert transaction
    const { data, error } = await supabase
      .from('robux_transactions')
      .insert({
        roblox_user_id: body.roblox_user_id,
        roblox_username: body.roblox_username,
        product_id: body.product_id,
        product_name: body.product_name,
        robux_amount: body.robux_amount,
        robux_after_tax: robuxAfterTax,
        transaction_id: body.transaction_id,
        transaction_type: body.transaction_type || 'developer_product'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert transaction:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to record transaction', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transaction recorded successfully:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        transaction_id: data.id,
        robux_after_tax: robuxAfterTax
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
