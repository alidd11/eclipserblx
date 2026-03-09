import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WISE_API_URL = "https://api.transferwise.com";
const PAYPAL_API_URL = "https://api-m.paypal.com";
const MAX_PAYOUTS_PER_RUN = 50;
const MIN_PENDING_MINUTES = 5;
const MAX_PAYOUT_AMOUNT = 10000;

async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal auth failed: ${err}`);
  }
  const data = await response.json();
  return data.access_token;
}

async function sendPayPalPayout(accessToken: string, payoutId: string, amount: number, recipientEmail: string): Promise<{ batchId: string }> {
  const response = await fetch(`${PAYPAL_API_URL}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `eclipse-payout-${payoutId}-${Date.now()}`,
        email_subject: 'You have received a payout from Eclipse',
        email_message: 'Your seller earnings have been sent to your PayPal account.',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: 'GBP',
          },
          receiver: recipientEmail,
          note: `Eclipse Seller Payout #${payoutId}`,
          sender_item_id: payoutId,
        },
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal payout failed: ${err}`);
  }
  const data = await response.json();
  return { batchId: data.batch_header.payout_batch_id };
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-PAYOUT] ${step}${detailsStr}`);
};

async function getWiseProfile(wiseApiKey: string): Promise<any> {
  const response = await fetch(`${WISE_API_URL}/v1/profiles`, {
    headers: { 'Authorization': `Bearer ${wiseApiKey}` },
  });
  if (!response.ok) throw new Error('Failed to get Wise profile');
  const profiles = await response.json();
  return profiles.find((p: any) => p.type === 'business') || profiles[0];
}

async function getWiseGBPBalance(wiseApiKey: string, profileId: string): Promise<number> {
  const response = await fetch(`${WISE_API_URL}/v4/profiles/${encodeURIComponent(profileId)}/balances?types=STANDARD`, {
    headers: { 'Authorization': `Bearer ${wiseApiKey}` },
  });
  if (!response.ok) throw new Error('Failed to get Wise balance');
  const balances = await response.json();
  const gbpBalance = balances.find((b: any) => b.currency === 'GBP');
  return gbpBalance?.amount?.value || 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const wiseApiKey = Deno.env.get('WISE_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const results = { processed: 0, skipped: 0, failed: 0, details: [] as any[] };

  try {
    logStep('Starting auto-payout run');

    // Fetch pending payouts older than 5 minutes, limit to MAX_PAYOUTS_PER_RUN
    const cutoff = new Date(Date.now() - MIN_PENDING_MINUTES * 60 * 1000).toISOString();
    
    const { data: payouts, error: fetchError } = await supabase
      .from('seller_payouts')
      .select(`
        *,
        stores (id, name, owner_id, payout_method, store_id),
        profiles!seller_payouts_seller_id_fkey (display_name, email)
      `)
      .eq('status', 'pending')
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(MAX_PAYOUTS_PER_RUN);

    if (fetchError) throw new Error(`Failed to fetch payouts: ${fetchError.message}`);
    if (!payouts || payouts.length === 0) {
      logStep('No pending payouts to process');
      return new Response(JSON.stringify({ success: true, message: 'No pending payouts', ...results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep(`Found ${payouts.length} pending payouts`);

    // Pre-fetch restricted stores to skip
    const storeIds = [...new Set(payouts.map((p: any) => p.store_id).filter(Boolean))];
    const { data: restrictedStores } = await supabase
      .from('seller_security_scores')
      .select('store_id')
      .in('store_id', storeIds)
      .eq('is_restricted', true);

    const restrictedStoreIds = new Set((restrictedStores || []).map((s: any) => s.store_id));

    // Pre-fetch store_payment_details for Stripe Connect info
    const { data: paymentDetails } = await supabase
      .from('store_payment_details')
      .select('store_id, stripe_account_id, payouts_enabled, bank_account_number, bank_routing_number, bank_swift_bic, bank_country, bank_account_holder_name, paypal_email')
      .in('store_id', storeIds);

    const paymentDetailsMap = new Map((paymentDetails || []).map((pd: any) => [pd.store_id, pd]));

    // Initialize Stripe
    const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" }) : null;

    // Process each payout
    for (const payout of payouts) {
      const payoutId = payout.id;
      const storeId = payout.stores?.id;
      const payoutMethod = payout.stores?.payout_method;

      try {
        // Safety: skip restricted stores
        if (storeId && restrictedStoreIds.has(storeId)) {
          logStep(`Skipping restricted store`, { payoutId, storeId });
          results.skipped++;
          results.details.push({ payoutId, status: 'skipped', reason: 'restricted_store' });
          continue;
        }

        // Safety: validate amount
        if (!payout.amount || payout.amount <= 0 || payout.amount > MAX_PAYOUT_AMOUNT) {
          logStep(`Invalid amount`, { payoutId, amount: payout.amount });
          results.skipped++;
          results.details.push({ payoutId, status: 'skipped', reason: 'invalid_amount' });
          continue;
        }

        // Route by payout method
        if (payoutMethod === 'stripe' || (!payoutMethod && storeId)) {
          // === STRIPE CONNECT ===
          if (!stripe) {
            logStep(`No Stripe key, skipping`, { payoutId });
            results.skipped++;
            results.details.push({ payoutId, status: 'skipped', reason: 'no_stripe_key' });
            continue;
          }

          const storePayment = storeId ? paymentDetailsMap.get(storeId) : null;
          if (!storePayment?.stripe_account_id) {
            logStep(`No Stripe account for store`, { payoutId, storeId });
            results.skipped++;
            results.details.push({ payoutId, status: 'skipped', reason: 'no_stripe_account' });
            continue;
          }

          if (!storePayment.payouts_enabled) {
            logStep(`Payouts not enabled for store`, { payoutId, storeId });
            results.skipped++;
            results.details.push({ payoutId, status: 'skipped', reason: 'payouts_not_enabled' });
            continue;
          }

          // Create Stripe Transfer
          const amountInPence = Math.round(payout.amount * 100);
          const transfer = await stripe.transfers.create({
            amount: amountInPence,
            currency: 'gbp',
            destination: storePayment.stripe_account_id,
            transfer_group: `payout_${payoutId}`,
            metadata: {
              payout_id: payoutId,
              seller_id: payout.seller_id,
              auto_processed: 'true',
            },
          });

          logStep(`Stripe transfer created`, { payoutId, transferId: transfer.id });

          // Update payout as completed
          await supabase
            .from('seller_payouts')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              processed_by: null, // auto-processed
              notes: `Auto-processed via Stripe Connect. Transfer: ${transfer.id}`,
              auto_processed: true,
            })
            .eq('id', payoutId);

          // Update seller balance atomically
          const { data: currentBalance } = await supabase
            .from('seller_balances')
            .select('available_balance, total_paid')
            .eq('user_id', payout.seller_id)
            .single();

          if (currentBalance) {
            await supabase
              .from('seller_balances')
              .update({
                available_balance: Math.max(0, (currentBalance.available_balance || 0) - payout.amount),
                total_paid: (currentBalance.total_paid || 0) + payout.amount,
              })
              .eq('user_id', payout.seller_id);
          }

          // Audit log
          await supabase.from('audit_logs').insert({
            action: 'auto_payout_completed',
            resource: 'seller_payouts',
            details: { payoutId, method: 'stripe', transferId: transfer.id, amount: payout.amount },
          });

          // Seller notification
          await supabase.from('seller_notifications').insert({
            user_id: payout.seller_id,
            type: 'payout_completed',
            title: 'Payout Completed',
            message: `Your payout of £${payout.amount.toFixed(2)} has been sent to your Stripe account.`,
            action_url: '/seller/payouts',
          });

          results.processed++;
          results.details.push({ payoutId, status: 'completed', method: 'stripe', transferId: transfer.id });

        } else if (payoutMethod === 'bank') {
          // === WISE / BANK TRANSFER ===
          if (!wiseApiKey) {
            logStep(`No Wise API key, skipping`, { payoutId });
            results.skipped++;
            results.details.push({ payoutId, status: 'skipped', reason: 'no_wise_key' });
            continue;
          }

          // Get bank details from store_payment_details
          const bankDetails = storeId ? paymentDetailsMap.get(storeId) : null;
          if (!bankDetails?.bank_account_number || !bankDetails?.bank_swift_bic) {
            logStep(`No bank details for store`, { payoutId, storeId });
            results.skipped++;
            results.details.push({ payoutId, status: 'skipped', reason: 'no_bank_details' });
            continue;
          }

          const wiseProfile = await getWiseProfile(wiseApiKey);
          const wiseBalance = await getWiseGBPBalance(wiseApiKey, wiseProfile.id);
          const requiredAmount = payout.amount * 1.1; // 10% buffer

          if (wiseBalance < requiredAmount) {
            logStep(`Insufficient Wise balance, requesting Stripe funding`, { payoutId, balance: wiseBalance, required: requiredAmount });

            // Try to fund from Stripe
            if (stripe) {
              try {
                const stripeBalance = await stripe.balance.retrieve();
                const gbpAvailable = stripeBalance.available.find((b: any) => b.currency === 'gbp');
                const availableGBP = gbpAvailable?.amount || 0;
                const fundingAmountPence = Math.ceil(requiredAmount * 100);

                if (availableGBP >= fundingAmountPence) {
                  const stripePayout = await stripe.payouts.create({
                    amount: fundingAmountPence,
                    currency: 'gbp',
                    description: `Auto Wise funding for payout ${payoutId}`,
                    metadata: { purpose: 'wise_funding', linked_payout_id: payoutId, auto_processed: 'true' },
                  });

                  await supabase.from('wise_funding_requests').insert({
                    stripe_payout_id: stripePayout.id,
                    amount: fundingAmountPence / 100,
                    currency: 'GBP',
                    status: 'pending',
                    linked_payout_ids: [payoutId],
                  });

                  await supabase
                    .from('seller_payouts')
                    .update({
                      status: 'awaiting_funds',
                      funding_status: 'funding_requested',
                      stripe_funding_payout_id: stripePayout.id,
                      funding_requested_at: new Date().toISOString(),
                      auto_processed: true,
                    })
                    .eq('id', payoutId);

                  results.details.push({ payoutId, status: 'awaiting_funds', method: 'wise', reason: 'stripe_funding_initiated' });
                } else {
                  await supabase
                    .from('seller_payouts')
                    .update({
                      status: 'awaiting_funds',
                      funding_status: 'funding_failed',
                      failure_reason: `Insufficient funds: Wise £${wiseBalance.toFixed(2)}, Stripe £${(availableGBP / 100).toFixed(2)}`,
                      funding_requested_at: new Date().toISOString(),
                      auto_processed: true,
                    })
                    .eq('id', payoutId);

                  results.details.push({ payoutId, status: 'awaiting_funds', method: 'wise', reason: 'insufficient_all_funds' });
                }
              } catch (stripeErr: any) {
                logStep(`Stripe funding error`, { payoutId, error: stripeErr.message });
                await supabase
                  .from('seller_payouts')
                  .update({
                    status: 'awaiting_funds',
                    funding_status: 'funding_failed',
                    failure_reason: stripeErr.message,
                    funding_requested_at: new Date().toISOString(),
                    auto_processed: true,
                  })
                  .eq('id', payoutId);
                results.details.push({ payoutId, status: 'awaiting_funds', method: 'wise', reason: 'stripe_error' });
              }
            } else {
              await supabase
                .from('seller_payouts')
                .update({
                  status: 'awaiting_funds',
                  funding_status: 'funding_failed',
                  failure_reason: 'No Stripe key configured for auto-funding',
                  auto_processed: true,
                })
                .eq('id', payoutId);
              results.details.push({ payoutId, status: 'awaiting_funds', method: 'wise', reason: 'no_stripe_for_funding' });
            }
            results.skipped++;
            continue;
          }

          // Sufficient Wise balance — process transfer
          const wiseHeaders = {
            'Authorization': `Bearer ${wiseApiKey}`,
            'Content-Type': 'application/json',
          };

          // 1. Create quote
          const quoteRes = await fetch(`${WISE_API_URL}/v3/quotes`, {
            method: 'POST',
            headers: wiseHeaders,
            body: JSON.stringify({
              sourceCurrency: 'GBP',
              targetCurrency: 'GBP',
              sourceAmount: payout.amount,
              profile: wiseProfile.id,
            }),
          });
          if (!quoteRes.ok) throw new Error(`Quote failed: ${await quoteRes.text()}`);
          const quote = await quoteRes.json();

          // 2. Create transfer
          const transferRes = await fetch(`${WISE_API_URL}/v1/transfers`, {
            method: 'POST',
            headers: wiseHeaders,
            body: JSON.stringify({
              targetAccount: recipientId,
              quoteUuid: quote.id,
              customerTransactionId: `auto-payout-${payoutId}-${Date.now()}`,
              details: { reference: `Eclipse Seller Payout #${payoutId}` },
            }),
          });
          if (!transferRes.ok) throw new Error(`Transfer failed: ${await transferRes.text()}`);
          const transfer = await transferRes.json();

          // 3. Fund from balance
          const fundRes = await fetch(
            `${WISE_API_URL}/v3/profiles/${encodeURIComponent(wiseProfile.id)}/transfers/${encodeURIComponent(transfer.id)}/payments`,
            { method: 'POST', headers: wiseHeaders, body: JSON.stringify({ type: 'BALANCE' }) }
          );
          if (!fundRes.ok) throw new Error(`Funding failed: ${await fundRes.text()}`);

          logStep(`Wise transfer completed`, { payoutId, transferId: transfer.id });

          // Update payout
          await supabase
            .from('seller_payouts')
            .update({
              status: 'processing',
              wise_transfer_id: transfer.id.toString(),
              wise_quote_id: quote.id,
              funding_status: 'funded',
              processed_at: new Date().toISOString(),
              auto_processed: true,
            })
            .eq('id', payoutId);

          // Update balance
          const { data: currentBalance } = await supabase
            .from('seller_balances')
            .select('available_balance, total_paid')
            .eq('user_id', payout.seller_id)
            .single();

          if (currentBalance) {
            await supabase
              .from('seller_balances')
              .update({
                available_balance: Math.max(0, (currentBalance.available_balance || 0) - payout.amount),
                total_paid: (currentBalance.total_paid || 0) + payout.amount,
              })
              .eq('user_id', payout.seller_id);
          }

          // Audit & notification
          await supabase.from('audit_logs').insert({
            action: 'auto_payout_wise_processed',
            resource: 'seller_payouts',
            details: { payoutId, method: 'wise', transferId: transfer.id, amount: payout.amount },
          });

          await supabase.from('seller_notifications').insert({
            user_id: payout.seller_id,
            type: 'payout_completed',
            title: 'Payout Processing',
            message: `Your bank transfer of £${payout.amount.toFixed(2)} is being processed via Wise.`,
            action_url: '/seller/payouts',
          });

          results.processed++;
          results.details.push({ payoutId, status: 'processing', method: 'wise', transferId: transfer.id });

        } else if (payoutMethod === 'paypal') {
          // === PAYPAL PAYOUTS API ===
          const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
          const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');

          if (!paypalClientId || !paypalClientSecret) {
            logStep(`No PayPal credentials, skipping`, { payoutId });
            results.skipped++;
            results.details.push({ payoutId, status: 'skipped', reason: 'no_paypal_credentials' });
            continue;
          }

          // Get seller's PayPal email from store_payment_details
          const { data: paypalDetails } = await supabase
            .from('store_payment_details')
            .select('paypal_email')
            .eq('store_id', storeId)
            .single();

          const paypalEmail = paypalDetails?.paypal_email;
          if (!paypalEmail) {
            logStep(`No PayPal email for store`, { payoutId, storeId });
            results.skipped++;
            results.details.push({ payoutId, status: 'skipped', reason: 'no_paypal_email' });
            continue;
          }

          // Get access token and send payout
          const accessToken = await getPayPalAccessToken(paypalClientId, paypalClientSecret);
          const { batchId } = await sendPayPalPayout(accessToken, payoutId, payout.amount, paypalEmail);

          logStep(`PayPal payout sent`, { payoutId, batchId, email: paypalEmail });

          // Update payout as completed
          await supabase
            .from('seller_payouts')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              processed_by: null,
              notes: `Auto-processed via PayPal Payouts. Batch: ${batchId}`,
              auto_processed: true,
            })
            .eq('id', payoutId);

          // Update seller balance atomically
          const { data: ppBalance } = await supabase
            .from('seller_balances')
            .select('available_balance, total_paid')
            .eq('user_id', payout.seller_id)
            .single();

          if (ppBalance) {
            await supabase
              .from('seller_balances')
              .update({
                available_balance: Math.max(0, (ppBalance.available_balance || 0) - payout.amount),
                total_paid: (ppBalance.total_paid || 0) + payout.amount,
              })
              .eq('user_id', payout.seller_id);
          }

          // Audit log
          await supabase.from('audit_logs').insert({
            action: 'auto_payout_completed',
            resource: 'seller_payouts',
            details: { payoutId, method: 'paypal', batchId, amount: payout.amount, email: paypalEmail },
          });

          // Seller notification
          await supabase.from('seller_notifications').insert({
            user_id: payout.seller_id,
            type: 'payout_completed',
            title: 'Payout Completed',
            message: `Your payout of £${payout.amount.toFixed(2)} has been sent to your PayPal (${paypalEmail}).`,
            action_url: '/seller/payouts',
          });

          results.processed++;
          results.details.push({ payoutId, status: 'completed', method: 'paypal', batchId });

        } else {
          // Unknown method — skip
          logStep(`Unknown payout method`, { payoutId, method: payoutMethod });
          results.skipped++;
          results.details.push({ payoutId, status: 'skipped', reason: 'unknown_method' });
        }
      } catch (err: any) {
        logStep(`Error processing payout`, { payoutId, error: err.message });
        results.failed++;
        results.details.push({ payoutId, status: 'failed', error: err.message });

        // Notify seller of failure
        try {
          await supabase.from('seller_notifications').insert({
            user_id: payout.seller_id,
            type: 'payout_failed',
            title: 'Payout Issue',
            message: `There was an issue processing your payout of £${payout.amount?.toFixed(2)}. Our team has been notified.`,
            action_url: '/seller/payouts',
          });
        } catch (_) { /* best effort */ }
      }
    }

    logStep(`Run complete`, results);

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    logStep('Fatal error', { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
