import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature-sha256',
};

const LOG = (step: string, d?: unknown) => {
  const s = d ? ` - ${JSON.stringify(d)}` : '';
  console.log(`[WISE-WEBHOOK] ${step}${s}`);
};

interface WiseWebhookPayload {
  data: {
    resource: {
      id: number;
      profile_id: number;
      type: string;
    };
    current_state: string;
    previous_state: string;
    occurred_at: string;
  };
  subscription_id: string;
  event_type: string;
  schema_version: string;
  sent_at: string;
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('base64');
  // Constant-time comparison
  if (signature.length !== expectedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return mismatch === 0;
}

const VALID_WISE_STATES = new Set([
  'outgoing_payment_sent', 'funds_converted', 'processing',
  'bounced_back', 'cancelled', 'charged_back', 'funds_refunded',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Rate limiting
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'wise-webhook' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const webhookSecret = Deno.env.get('WISE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      LOG('ERROR: WISE_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.text();

    // Verify signature (required, not optional)
    const signature = req.headers.get('x-signature-sha256');
    if (!signature) {
      LOG('Missing signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!verifySignature(rawBody, signature, webhookSecret)) {
      LOG('Invalid signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let payload: WiseWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    LOG('Webhook received', { event_type: payload.event_type });

    // Only process transfer state changes
    if (payload.event_type !== 'transfers#state-change') {
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payload structure
    if (!payload.data?.resource?.id || !payload.data?.current_state) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload structure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transferId = String(payload.data.resource.id);
    const newState = payload.data.current_state;

    // Validate state is known
    if (!VALID_WISE_STATES.has(newState)) {
      LOG('Unknown transfer state', { newState });
      return new Response(
        JSON.stringify({ success: true, message: 'Unhandled state' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    LOG(`Transfer ${transferId} → ${newState}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find payout record
    const { data: payout, error: fetchError } = await supabase
      .from('seller_payouts')
      .select('id, status, store_id, amount')
      .eq('wise_transfer_id', transferId)
      .maybeSingle();

    if (fetchError || !payout) {
      LOG('No payout found for transfer', { transferId });
      return new Response(
        JSON.stringify({ success: true, message: 'No matching payout found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map Wise states
    let newStatus: string | null = null;
    let shouldUpdateBalance = false;

    switch (newState) {
      case 'outgoing_payment_sent':
        newStatus = 'completed';
        shouldUpdateBalance = true;
        break;
      case 'funds_converted':
      case 'processing':
        newStatus = 'processing';
        break;
      case 'bounced_back':
      case 'cancelled':
      case 'charged_back':
      case 'funds_refunded':
        newStatus = 'failed';
        break;
    }

    if (newStatus && newStatus !== payout.status) {
      const { error: updateError } = await supabase
        .from('seller_payouts')
        .update({
          status: newStatus,
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
          ...(newStatus === 'failed' ? { failure_reason: `Transfer ${newState}` } : {}),
        })
        .eq('id', payout.id);

      if (updateError) {
        LOG('Failed to update payout', { error: updateError.message });
        throw new Error('Failed to update payout status');
      }

      LOG(`Payout ${payout.id} → ${newStatus}`);

      // Update seller balance if completed
      if (shouldUpdateBalance && payout.store_id) {
        const { error: balanceError } = await supabase
          .from('seller_balances')
          .update({
            total_paid: supabase.rpc('increment_total_paid', {
              p_store_id: payout.store_id,
              p_amount: payout.amount,
            }),
            available_balance: supabase.rpc('decrement_available_balance', {
              p_store_id: payout.store_id,
              p_amount: payout.amount,
            }),
            updated_at: new Date().toISOString(),
          })
          .eq('store_id', payout.store_id);

        if (balanceError) {
          LOG('Failed to update seller balance', { error: balanceError.message });
        }
      }

      // If failed, refund the balance deduction
      if (newStatus === 'failed' && payout.store_id) {
        const { error: refundError } = await supabase
          .from('seller_balances')
          .update({
            available_balance: supabase.rpc('increment_available_balance', {
              p_store_id: payout.store_id,
              p_amount: payout.amount,
            }),
            updated_at: new Date().toISOString(),
          })
          .eq('store_id', payout.store_id);

        if (refundError) {
          LOG('Failed to refund seller balance', { error: refundError.message });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    LOG('ERROR', { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
