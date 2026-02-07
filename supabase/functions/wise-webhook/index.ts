import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature-sha256',
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
  return signature === expectedSignature;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('WISE_WEBHOOK_SECRET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body for signature verification
    const rawBody = await req.text();
    console.log('Wise webhook received:', rawBody);

    // Verify signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get('x-signature-sha256');
      if (!signature) {
        console.error('Missing signature header');
        return new Response(
          JSON.stringify({ error: 'Missing signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!verifySignature(rawBody, signature, webhookSecret)) {
        console.error('Invalid signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const payload: WiseWebhookPayload = JSON.parse(rawBody);
    console.log('Parsed webhook payload:', payload);

    // Only process transfer state changes
    if (payload.event_type !== 'transfers#state-change') {
      console.log('Ignoring non-transfer event:', payload.event_type);
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transferId = payload.data.resource.id.toString();
    const newState = payload.data.current_state;
    const previousState = payload.data.previous_state;

    console.log(`Transfer ${transferId} changed from ${previousState} to ${newState}`);

    // Find the payout record with this transfer ID
    const { data: payout, error: fetchError } = await supabase
      .from('seller_payouts')
      .select('*')
      .eq('wise_transfer_id', transferId)
      .single();

    if (fetchError || !payout) {
      console.log('No payout found for transfer:', transferId);
      return new Response(
        JSON.stringify({ success: true, message: 'No matching payout found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found payout:', payout.id);

    // Map Wise states to our payout statuses
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
      default:
        console.log('Unhandled transfer state:', newState);
    }

    if (newStatus && newStatus !== payout.status) {
      // Update payout status
      const { error: updateError } = await supabase
        .from('seller_payouts')
        .update({
          status: newStatus,
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
          ...(newStatus === 'failed' ? { failure_reason: `Transfer ${newState}` } : {}),
        })
        .eq('id', payout.id);

      if (updateError) {
        console.error('Failed to update payout:', updateError);
        throw updateError;
      }

      console.log(`Payout ${payout.id} status updated to ${newStatus}`);

      // Update seller balance if completed
      if (shouldUpdateBalance && payout.store_id) {
        const { error: balanceError } = await supabase
          .from('seller_balances')
          .update({
            total_paid: supabase.rpc('increment_total_paid', { 
              p_store_id: payout.store_id, 
              p_amount: payout.amount 
            }),
            available_balance: supabase.rpc('decrement_available_balance', { 
              p_store_id: payout.store_id, 
              p_amount: payout.amount 
            }),
            updated_at: new Date().toISOString(),
          })
          .eq('store_id', payout.store_id);

        if (balanceError) {
          console.error('Failed to update seller balance:', balanceError);
          // Don't throw - payout status is already updated
        } else {
          console.log(`Seller balance updated for store ${payout.store_id}`);
        }
      }

      // If failed, we might need to refund/reverse the balance deduction
      if (newStatus === 'failed' && payout.store_id) {
        // Add the amount back to available balance
        const { error: refundError } = await supabase
          .from('seller_balances')
          .update({
            available_balance: supabase.rpc('increment_available_balance', { 
              p_store_id: payout.store_id, 
              p_amount: payout.amount 
            }),
            updated_at: new Date().toISOString(),
          })
          .eq('store_id', payout.store_id);

        if (refundError) {
          console.error('Failed to refund seller balance:', refundError);
        } else {
          console.log(`Seller balance refunded for store ${payout.store_id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Wise webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
