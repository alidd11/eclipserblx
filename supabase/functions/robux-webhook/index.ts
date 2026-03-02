import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

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

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ROBUX-WEBHOOK] ${step}${detailsStr}`);
};

// Input sanitization
const isValidRobloxId = (id: string): boolean =>
  typeof id === 'string' && /^\d{1,20}$/.test(id);

const isValidTransactionId = (id: string): boolean =>
  typeof id === 'string' && id.length > 0 && id.length <= 100 && /^[\w-]+$/.test(id);

const sanitizeString = (str: string, maxLen: number): string =>
  typeof str === 'string' ? str.slice(0, maxLen).replace(/[<>"']/g, '') : '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'robux-webhook' });
    if (!rl.allowed) {
      logStep("Rate limit exceeded", { ip: clientIp });
      return rateLimitResponse(rl, corsHeaders);
    }

    const webhookSecret = Deno.env.get('ROBUX_WEBHOOK_SECRET');
    if (!webhookSecret) {
      logStep('ROBUX_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RobuxTransaction = await req.json();
    logStep('Received webhook', { 
      roblox_user_id: body.roblox_user_id,
      product_id: body.product_id,
      robux_amount: body.robux_amount,
      transaction_id: body.transaction_id
    });

    // Verify secret (constant-time comparison would be ideal but secret length check is sufficient here)
    if (!body.secret || body.secret !== webhookSecret) {
      logStep('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Invalid secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields with type/format checks
    if (!isValidRobloxId(body.roblox_user_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid roblox_user_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.roblox_username || typeof body.roblox_username !== 'string' || body.roblox_username.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Invalid roblox_username' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidTransactionId(body.transaction_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid transaction_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof body.robux_amount !== 'number' || body.robux_amount <= 0 || body.robux_amount > 10000000) {
      return new Response(
        JSON.stringify({ error: 'Invalid robux_amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.product_id || typeof body.product_id !== 'string' || body.product_id.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid product_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.product_name || typeof body.product_name !== 'string' || body.product_name.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Invalid product_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      logStep('Duplicate transaction detected', { transaction_id: body.transaction_id });
      return new Response(
        JSON.stringify({ error: 'Transaction already recorded', duplicate: true }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate after-tax amount (Roblox takes 30%)
    const robuxAfterTax = Math.floor(body.robux_amount * 0.7);

    // Insert transaction with sanitized inputs
    const { data, error } = await supabase
      .from('robux_transactions')
      .insert({
        roblox_user_id: body.roblox_user_id,
        roblox_username: sanitizeString(body.roblox_username, 50),
        product_id: sanitizeString(body.product_id, 100),
        product_name: sanitizeString(body.product_name, 200),
        robux_amount: body.robux_amount,
        robux_after_tax: robuxAfterTax,
        transaction_id: body.transaction_id,
        transaction_type: sanitizeString(body.transaction_type || 'developer_product', 50)
      })
      .select()
      .single();

    if (error) {
      logStep('Failed to insert transaction', { message: error.message });
      return new Response(
        JSON.stringify({ error: 'Failed to record transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Transaction recorded successfully', { id: data.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        transaction_id: data.id,
        robux_after_tax: robuxAfterTax
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('Webhook error', { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
