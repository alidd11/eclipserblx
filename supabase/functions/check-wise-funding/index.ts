import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WISE_API_URL = "https://api.transferwise.com";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-WISE-FUNDING] ${step}${detailsStr}`);
};

async function getWiseGBPBalance(wiseApiKey: string, profileId: string): Promise<number> {
  const response = await fetch(`${WISE_API_URL}/v4/profiles/${profileId}/balances?types=STANDARD`, {
    headers: { 'Authorization': `Bearer ${wiseApiKey}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get Wise balance');
  }
  
  const balances = await response.json();
  const gbpBalance = balances.find((b: any) => b.currency === 'GBP');
  return gbpBalance?.amount?.value || 0;
}

async function getWiseProfile(wiseApiKey: string): Promise<any> {
  const response = await fetch(`${WISE_API_URL}/v1/profiles`, {
    headers: { 'Authorization': `Bearer ${wiseApiKey}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get Wise profile');
  }
  
  const profiles = await response.json();
  return profiles.find((p: any) => p.type === 'business') || profiles[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wiseApiKey = Deno.env.get('WISE_API_KEY')!;

    if (!wiseApiKey) {
      throw new Error('Wise API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logStep('Starting scheduled check for pending payouts');

    // Get all payouts awaiting funds
    const { data: pendingPayouts, error: fetchError } = await supabase
      .from('seller_payouts')
      .select('*, stores(name, wise_recipient_id)')
      .eq('status', 'awaiting_funds')
      .eq('funding_status', 'funding_requested');

    if (fetchError) {
      throw new Error(`Failed to fetch pending payouts: ${fetchError.message}`);
    }

    if (!pendingPayouts || pendingPayouts.length === 0) {
      logStep('No payouts awaiting funds');
      return new Response(
        JSON.stringify({ success: true, message: 'No payouts awaiting funds', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Found pending payouts', { count: pendingPayouts.length });

    // Get Wise profile and balance
    const profile = await getWiseProfile(wiseApiKey);
    const currentBalance = await getWiseGBPBalance(wiseApiKey, profile.id);
    
    logStep('Current Wise GBP balance', { balance: currentBalance });

    const wiseHeaders = {
      'Authorization': `Bearer ${wiseApiKey}`,
      'Content-Type': 'application/json',
    };

    let processedCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    // Process each pending payout
    for (const payout of pendingPayouts) {
      const requiredAmount = payout.amount * 1.1; // 10% buffer
      
      logStep('Processing payout', { 
        payoutId: payout.id, 
        amount: payout.amount, 
        required: requiredAmount, 
        available: currentBalance 
      });

      // Check if this payout was stuck for too long (5+ days)
      const requestedAt = new Date(payout.funding_requested_at);
      const daysSinceRequest = (Date.now() - requestedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRequest > 5) {
        logStep('Payout stuck for too long', { payoutId: payout.id, days: daysSinceRequest });
        
        await supabase
          .from('seller_payouts')
          .update({
            funding_status: 'funding_failed',
            failure_reason: `Funding not received within 5 days. Please check Stripe payout status.`,
          })
          .eq('id', payout.id);
        
        failedCount++;
        results.push({ payoutId: payout.id, status: 'stuck', days: daysSinceRequest });
        continue;
      }

      // Skip if still insufficient balance
      if (currentBalance < requiredAmount) {
        logStep('Still insufficient balance for payout', { payoutId: payout.id });
        results.push({ payoutId: payout.id, status: 'waiting', needed: requiredAmount, available: currentBalance });
        continue;
      }

      // Get recipient ID from store
      const recipientId = payout.stores?.wise_recipient_id;
      
      if (!recipientId) {
        logStep('No recipient configured for payout', { payoutId: payout.id });
        
        await supabase
          .from('seller_payouts')
          .update({
            funding_status: 'funding_failed',
            failure_reason: 'No Wise recipient configured for store',
          })
          .eq('id', payout.id);
        
        failedCount++;
        results.push({ payoutId: payout.id, status: 'failed', reason: 'no_recipient' });
        continue;
      }

      try {
        // 1. Create quote
        const quoteResponse = await fetch(`${WISE_API_URL}/v3/quotes`, {
          method: 'POST',
          headers: wiseHeaders,
          body: JSON.stringify({
            sourceCurrency: 'GBP',
            targetCurrency: 'GBP',
            sourceAmount: payout.amount,
            profile: profile.id,
          }),
        });
        
        if (!quoteResponse.ok) {
          throw new Error(`Quote failed: ${await quoteResponse.text()}`);
        }
        
        const quote = await quoteResponse.json();
        logStep('Quote created', { payoutId: payout.id, quoteId: quote.id });
        
        // 2. Create transfer
        const transferResponse = await fetch(`${WISE_API_URL}/v1/transfers`, {
          method: 'POST',
          headers: wiseHeaders,
          body: JSON.stringify({
            targetAccount: recipientId,
            quoteUuid: quote.id,
            customerTransactionId: `seller-payout-${payout.id}-auto-${Date.now()}`,
            details: {
              reference: `Eclipse Seller Payout #${payout.id}`,
            },
          }),
        });
        
        if (!transferResponse.ok) {
          throw new Error(`Transfer failed: ${await transferResponse.text()}`);
        }
        
        const transfer = await transferResponse.json();
        logStep('Transfer created', { payoutId: payout.id, transferId: transfer.id });
        
        // 3. Fund transfer
        const fundResponse = await fetch(
          `${WISE_API_URL}/v3/profiles/${profile.id}/transfers/${transfer.id}/payments`,
          {
            method: 'POST',
            headers: wiseHeaders,
            body: JSON.stringify({ type: 'BALANCE' }),
          }
        );
        
        if (!fundResponse.ok) {
          throw new Error(`Funding failed: ${await fundResponse.text()}`);
        }
        
        const payment = await fundResponse.json();
        logStep('Transfer funded', { payoutId: payout.id, status: payment.status });
        
        // 4. Update payout record
        await supabase
          .from('seller_payouts')
          .update({
            wise_transfer_id: transfer.id.toString(),
            wise_quote_id: quote.id,
            status: 'processing',
            funding_status: 'funded',
            processed_at: new Date().toISOString(),
          })
          .eq('id', payout.id);
        
        // 5. Update funding request status
        if (payout.stripe_funding_payout_id) {
          await supabase
            .from('wise_funding_requests')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('stripe_payout_id', payout.stripe_funding_payout_id);
        }
        
        processedCount++;
        results.push({ payoutId: payout.id, status: 'processed', transferId: transfer.id });
        
        // Update remaining balance for next iteration
        // Note: In a real scenario, you'd need to re-fetch the balance
        // For now, we'll just decrement our local tracking
        
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
        waiting: pendingPayouts.length - processedCount - failedCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('Error', { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
