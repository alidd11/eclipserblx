import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYPAL_API_URL = "https://api-m.paypal.com";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-PAYPAL-FUNDING] ${step}${detailsStr}`);
};

async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) throw new Error(`PayPal auth failed: ${await response.text()}`);
  const data = await response.json();
  return data.access_token;
}

async function getPayPalGBPBalance(accessToken: string): Promise<number> {
  const response = await fetch(
    `${PAYPAL_API_URL}/v1/reporting/balances?currency_code=GBP&as_of_time=${new Date().toISOString()}`,
    { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
  if (!response.ok) throw new Error(`PayPal balance check failed: ${response.status}`);
  const data = await response.json();
  const gbpBal = data.balances?.find((b: any) => b.currency === 'GBP');
  return parseFloat(gbpBal?.total_balance?.value || '0');
}

async function sendPayPalPayout(accessToken: string, payoutId: string, amount: number, recipientEmail: string): Promise<string> {
  const response = await fetch(`${PAYPAL_API_URL}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `eclipse-payout-${payoutId}-retry-${Date.now()}`,
        email_subject: 'You have received a payout from Eclipse',
        email_message: 'Your seller earnings have been sent to your PayPal account.',
      },
      items: [{
        recipient_type: 'EMAIL',
        amount: { value: amount.toFixed(2), currency: 'GBP' },
        receiver: recipientEmail,
        note: `Eclipse Seller Payout #${payoutId}`,
        sender_item_id: payoutId,
      }],
    }),
  });
  if (!response.ok) throw new Error(`PayPal payout failed: ${await response.text()}`);
  const data = await response.json();
  return data.batch_header.payout_batch_id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');

    if (!paypalClientId || !paypalClientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    // Auth guard
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const isServiceRole = token === supabaseServiceKey;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!isServiceRole) {
      if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: hasPermission } = await supabase.rpc('has_permission', {
        _user_id: user.id,
        _permission_name: 'process_seller_payouts'
      });
      if (!hasPermission) {
        return new Response(JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    logStep('Starting check for PayPal payouts awaiting funds');

    // Get all PayPal payouts awaiting funds
    const { data: pendingPayouts, error: fetchError } = await supabase
      .from('seller_payouts')
      .select('*, stores(name, payout_method)')
      .eq('status', 'awaiting_funds')
      .eq('funding_status', 'funding_requested');

    if (fetchError) throw new Error(`Failed to fetch pending payouts: ${fetchError.message}`);

    // Filter to only PayPal payouts (stores with payout_method = 'paypal')
    const paypalPayouts = (pendingPayouts || []).filter((p: any) => p.stores?.payout_method === 'paypal');

    if (paypalPayouts.length === 0) {
      logStep('No PayPal payouts awaiting funds');
      return new Response(
        JSON.stringify({ success: true, message: 'No PayPal payouts awaiting funds', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Found pending PayPal payouts', { count: paypalPayouts.length });

    // Get PayPal balance
    const accessToken = await getPayPalAccessToken(paypalClientId, paypalClientSecret);
    const currentBalance = await getPayPalGBPBalance(accessToken);

    logStep('Current PayPal GBP balance', { balance: currentBalance });

    let processedCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    for (const payout of paypalPayouts) {
      const requiredAmount = payout.amount * 1.05; // 5% buffer

      logStep('Processing payout', {
        payoutId: payout.id,
        amount: payout.amount,
        required: requiredAmount,
        available: currentBalance,
      });

      // Check if stuck for too long (5+ days)
      const requestedAt = new Date(payout.funding_requested_at);
      const daysSinceRequest = (Date.now() - requestedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceRequest > 5) {
        logStep('Payout stuck for too long', { payoutId: payout.id, days: daysSinceRequest });

        await supabase
          .from('seller_payouts')
          .update({
            funding_status: 'funding_failed',
            failure_reason: 'Funding not received within 5 days. Please check Stripe payout status.',
          })
          .eq('id', payout.id);

        failedCount++;
        results.push({ payoutId: payout.id, status: 'stuck', days: daysSinceRequest });
        continue;
      }

      // Skip if still insufficient balance
      if (currentBalance < requiredAmount) {
        logStep('Still insufficient PayPal balance', { payoutId: payout.id });
        results.push({ payoutId: payout.id, status: 'waiting', needed: requiredAmount, available: currentBalance });
        continue;
      }

      // Get seller's PayPal email
      const { data: paymentDetails } = await supabase
        .from('store_payment_details')
        .select('paypal_email')
        .eq('store_id', payout.store_id)
        .single();

      const paypalEmail = paymentDetails?.paypal_email;
      if (!paypalEmail) {
        logStep('No PayPal email for store', { payoutId: payout.id });
        await supabase
          .from('seller_payouts')
          .update({
            funding_status: 'funding_failed',
            failure_reason: 'No PayPal email configured for store',
          })
          .eq('id', payout.id);

        failedCount++;
        results.push({ payoutId: payout.id, status: 'failed', reason: 'no_paypal_email' });
        continue;
      }

      try {
        // Send the PayPal payout
        const batchId = await sendPayPalPayout(accessToken, payout.id, payout.amount, paypalEmail);

        logStep('PayPal payout sent', { payoutId: payout.id, batchId });

        // Update payout record
        await supabase
          .from('seller_payouts')
          .update({
            status: 'completed',
            funding_status: 'funded',
            processed_at: new Date().toISOString(),
            notes: `Auto-processed via PayPal after funding. Batch: ${batchId}`,
            auto_processed: true,
          })
          .eq('id', payout.id);

        // Update seller balance
        const { data: currentBal } = await supabase
          .from('seller_balances')
          .select('available_balance, total_paid')
          .eq('user_id', payout.seller_id)
          .single();

        if (currentBal) {
          await supabase
            .from('seller_balances')
            .update({
              available_balance: Math.max(0, (currentBal.available_balance || 0) - payout.amount),
              total_paid: (currentBal.total_paid || 0) + payout.amount,
            })
            .eq('user_id', payout.seller_id);
        }

        // Update funding request status
        if (payout.stripe_funding_payout_id) {
          await supabase
            .from('wise_funding_requests')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('stripe_payout_id', payout.stripe_funding_payout_id);
        }

        // Notification
        await supabase.from('seller_notifications').insert({
          user_id: payout.seller_id,
          type: 'payout_completed',
          title: 'Payout Completed',
          message: `Your payout of £${payout.amount.toFixed(2)} has been sent to your PayPal (${paypalEmail}).`,
          action_url: '/seller/payouts',
        });

        processedCount++;
        results.push({ payoutId: payout.id, status: 'processed', batchId });

      } catch (processError: any) {
        logStep('Failed to process payout', { payoutId: payout.id, error: processError.message });

        await supabase
          .from('seller_payouts')
          .update({
            funding_status: 'funding_failed',
            failure_reason: processError.message,
          })
          .eq('id', payout.id);

        failedCount++;
        results.push({ payoutId: payout.id, status: 'failed', error: processError.message });
      }
    }

    logStep('Completed processing', { processed: processedCount, failed: failedCount });

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        failed: failedCount,
        waiting: paypalPayouts.length - processedCount - failedCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logStep('Error', { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
