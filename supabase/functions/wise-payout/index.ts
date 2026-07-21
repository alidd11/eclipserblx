import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WISE_API_URL = "https://api.transferwise.com";

// Safety caps
const MAX_PAYOUT_AMOUNT = 10000; // £10,000 max per payout
const MIN_PAYOUT_AMOUNT = 1;     // £1 minimum

// Input validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidNumericId = (id: unknown): boolean => {
  if (typeof id === 'number') return Number.isFinite(id) && id > 0;
  if (typeof id === 'string') return /^\d{1,20}$/.test(id);
  return false;
};
const isValidUuidString = (id: unknown): boolean => typeof id === 'string' && id.length < 200;
const isValidCurrency = (c: unknown): boolean => typeof c === 'string' && /^[A-Z]{3}$/.test(c);
const isValidAmount = (a: unknown): boolean => {
  const n = typeof a === 'string' ? parseFloat(a) : a;
  return typeof n === 'number' && Number.isFinite(n) && n >= MIN_PAYOUT_AMOUNT && n <= MAX_PAYOUT_AMOUNT;
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WISE-PAYOUT] ${step}${detailsStr}`);
};

async function getWiseGBPBalance(wiseApiKey: string, profileId: string): Promise<number> {
  const response = await fetch(`${WISE_API_URL}/v4/profiles/${encodeURIComponent(profileId)}/balances?types=STANDARD`, {
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
    // Rate limit - strict for financial operations
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.EXPENSIVE, identifier: clientIp, action: 'wise-payout' });
    if (!rl.allowed) {
      logStep("Rate limit exceeded", { ip: clientIp });
      return rateLimitResponse(rl, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wiseApiKey = Deno.env.get('WISE_API_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!wiseApiKey) {
      throw new Error('Wise API key not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to process payouts
    const { data: hasPermission } = await supabase.rpc('has_permission', {
      _user_id: user.id,
      _permission_name: 'process_seller_payouts'
    });

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to process payouts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, ...params } = body;
    
    // Validate action
    const validActions = ['get-profile', 'get-balance', 'create-quote', 'create-recipient', 'get-recipient-requirements', 'create-transfer', 'fund-transfer', 'get-transfer-status', 'process-seller-payout'];
    if (!action || typeof action !== 'string' || !validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    logStep(`Action: ${action}`, { userId: user.id });

    const wiseHeaders = {
      'Authorization': `Bearer ${wiseApiKey}`,
      'Content-Type': 'application/json',
    };

    switch (action) {
      case 'get-profile': {
        const profile = await getWiseProfile(wiseApiKey);
        return new Response(
          JSON.stringify({ profile }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-balance': {
        const { profileId } = params;
        if (!isValidNumericId(profileId)) throw new Error("Invalid profile ID");
        
        const response = await fetch(`${WISE_API_URL}/v4/profiles/${encodeURIComponent(profileId)}/balances?types=STANDARD`, {
          headers: wiseHeaders,
        });
        
        if (!response.ok) {
          const error = await response.text();
          logStep('Failed to get Wise balance', error);
          throw new Error('Failed to get Wise balance');
        }
        
        const balances = await response.json();
        
        return new Response(
          JSON.stringify({ balances }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-quote': {
        const { profileId, sourceCurrency, targetCurrency, targetAmount, sourceAmount } = params;
        
        if (!isValidNumericId(profileId)) throw new Error("Invalid profile ID");
        if (!isValidCurrency(sourceCurrency)) throw new Error("Invalid source currency");
        if (!isValidCurrency(targetCurrency)) throw new Error("Invalid target currency");
        
        const amt = targetAmount || sourceAmount;
        if (!amt || typeof amt !== 'number' || !Number.isFinite(amt) || amt <= 0 || amt > MAX_PAYOUT_AMOUNT) {
          throw new Error(`Amount must be between £${MIN_PAYOUT_AMOUNT} and £${MAX_PAYOUT_AMOUNT}`);
        }
        
        const quotePayload: any = {
          sourceCurrency,
          targetCurrency,
          profile: profileId,
        };
        
        if (targetAmount) {
          quotePayload.targetAmount = targetAmount;
        } else if (sourceAmount) {
          quotePayload.sourceAmount = sourceAmount;
        } else {
          throw new Error('Either sourceAmount or targetAmount must be specified');
        }
        
        const response = await fetch(`${WISE_API_URL}/v3/quotes`, {
          method: 'POST',
          headers: wiseHeaders,
          body: JSON.stringify(quotePayload),
        });
        
        if (!response.ok) {
          const error = await response.text();
          logStep('Failed to create quote', error);
          throw new Error(`Failed to create quote: ${error}`);
        }
        
        const quote = await response.json();
        logStep('Quote created', { quoteId: quote.id });
        
        return new Response(
          JSON.stringify({ quote }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-recipient': {
        const { profileId, recipientDetails } = params;
        if (!isValidNumericId(profileId)) throw new Error("Invalid profile ID");
        if (!recipientDetails || typeof recipientDetails !== 'object') throw new Error("Invalid recipient details");
        
        const response = await fetch(`${WISE_API_URL}/v1/accounts`, {
          method: 'POST',
          headers: wiseHeaders,
          body: JSON.stringify({
            profile: profileId,
            ...recipientDetails,
          }),
        });
        
        if (!response.ok) {
          const error = await response.text();
          logStep('Failed to create recipient', error);
          throw new Error(`Failed to create recipient: ${error}`);
        }
        
        const recipient = await response.json();
        logStep('Recipient created', { recipientId: recipient.id });
        
        return new Response(
          JSON.stringify({ recipient }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-recipient-requirements': {
        const { quoteId } = params;
        if (!isValidUuidString(quoteId)) throw new Error("Invalid quote ID");
        
        const response = await fetch(`${WISE_API_URL}/v1/quotes/${encodeURIComponent(quoteId)}/account-requirements`, {
          method: 'POST',
          headers: wiseHeaders,
          body: JSON.stringify({}),
        });
        
        if (!response.ok) {
          const error = await response.text();
          logStep('Failed to get recipient requirements', error);
          throw new Error(`Failed to get requirements: ${error}`);
        }
        
        const requirements = await response.json();
        
        return new Response(
          JSON.stringify({ requirements }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-transfer': {
        const { targetAccount, quoteId, customerTransactionId, reference, payoutId } = params;
        
        if (!isValidNumericId(targetAccount)) throw new Error("Invalid target account ID");
        if (!isValidUuidString(quoteId)) throw new Error("Invalid quote ID");
        if (reference && (typeof reference !== 'string' || reference.length > 200)) throw new Error("Invalid reference");
        if (payoutId && !UUID_REGEX.test(payoutId)) throw new Error("Invalid payout ID");
        
        const transferResponse = await fetch(`${WISE_API_URL}/v1/transfers`, {
          method: 'POST',
          headers: wiseHeaders,
          body: JSON.stringify({
            targetAccount,
            quoteUuid: quoteId,
            customerTransactionId: customerTransactionId || `payout-${payoutId || 'manual'}-${Date.now()}`,
            details: {
              reference: reference || 'Seller Payout',
            },
          }),
        });
        
        if (!transferResponse.ok) {
          const error = await transferResponse.text();
          logStep('Failed to create transfer', error);
          throw new Error(`Failed to create transfer: ${error}`);
        }
        
        const transfer = await transferResponse.json();
        logStep('Transfer created', { transferId: transfer.id });
        
        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'wise_transfer_created',
          resource: 'wise_payouts',
          details: { transferId: transfer.id, targetAccount, quoteId },
        });
        
        return new Response(
          JSON.stringify({ transfer }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'fund-transfer': {
        const { profileId, transferId } = params;
        if (!isValidNumericId(profileId)) throw new Error("Invalid profile ID");
        if (!isValidNumericId(transferId)) throw new Error("Invalid transfer ID");
        
        const response = await fetch(
          `${WISE_API_URL}/v3/profiles/${encodeURIComponent(profileId)}/transfers/${encodeURIComponent(transferId)}/payments`,
          {
            method: 'POST',
            headers: wiseHeaders,
            body: JSON.stringify({
              type: 'BALANCE',
            }),
          }
        );
        
        if (!response.ok) {
          const error = await response.text();
          logStep('Failed to fund transfer', error);
          throw new Error(`Failed to fund transfer: ${error}`);
        }
        
        const payment = await response.json();
        logStep('Transfer funded', { status: payment.status });
        
        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'wise_transfer_funded',
          resource: 'wise_payouts',
          details: { transferId, profileId },
        });
        
        return new Response(
          JSON.stringify({ payment }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-transfer-status': {
        const { transferId } = params;
        if (!isValidNumericId(transferId)) throw new Error("Invalid transfer ID");
        
        const response = await fetch(`${WISE_API_URL}/v1/transfers/${encodeURIComponent(transferId)}`, {
          headers: wiseHeaders,
        });
        
        if (!response.ok) {
          const error = await response.text();
          logStep('Failed to get transfer status', error);
          throw new Error('Failed to get transfer status');
        }
        
        const transfer = await response.json();
        
        return new Response(
          JSON.stringify({ transfer }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'process-seller-payout': {
        const { payoutId, profileId, recipientId, amount, currency, reference } = params;
        
        // Validate inputs
        if (payoutId && !UUID_REGEX.test(payoutId)) throw new Error("Invalid payout ID");
        if (profileId && !isValidNumericId(profileId)) throw new Error("Invalid profile ID");
        if (recipientId && !isValidNumericId(recipientId)) throw new Error("Invalid recipient ID");
        if (reference && (typeof reference !== 'string' || reference.length > 200)) throw new Error("Invalid reference");
        
        // Get payout details if payoutId provided
        let payoutData: any = null;
        let payoutAmount = amount;
        const payoutCurrency = currency || 'GBP';
        
        if (payoutId) {
          const { data: payout, error: payoutError } = await supabase
            .from('seller_payouts')
            .select('*, stores(name, wise_recipient_id)')
            .eq('id', payoutId)
            .single();
          
          if (payoutError) {
            throw new Error(`Failed to fetch payout: ${payoutError.message}`);
          }
          payoutData = payout;
          payoutAmount = payout.amount;
        }
        
        // Validate amount
        if (!isValidAmount(payoutAmount)) {
          throw new Error(`Payout amount must be between £${MIN_PAYOUT_AMOUNT} and £${MAX_PAYOUT_AMOUNT}`);
        }
        if (!isValidCurrency(payoutCurrency)) {
          throw new Error("Invalid currency");
        }
        
        // Get Wise profile
        const profile = profileId ? { id: profileId } : await getWiseProfile(wiseApiKey);
        logStep('Using Wise profile', { profileId: profile.id });
        
        // Check current Wise GBP balance
        const currentBalance = await getWiseGBPBalance(wiseApiKey, profile.id);
        logStep('Current Wise GBP balance', { balance: currentBalance, required: payoutAmount });
        
        // Add 10% buffer for fees and rate fluctuations
        const requiredAmount = payoutAmount * 1.1;
        
        // If insufficient balance, queue for funding from Stripe
        if (currentBalance < requiredAmount) {
          logStep('Insufficient Wise balance, initiating Stripe funding');
          
          if (!stripeSecretKey) {
            throw new Error('Stripe API key not configured - cannot auto-fund from Stripe');
          }
          
          const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
          
          const fundingAmount = Math.ceil(requiredAmount * 100);
          
          try {
            const stripeBalance = await stripe.balance.retrieve();
            const gbpAvailable = stripeBalance.available.find((b: any) => b.currency === 'gbp');
            const availableGBP = gbpAvailable?.amount || 0;
            
            logStep('Stripe GBP balance', { available: availableGBP / 100, required: fundingAmount / 100 });
            
            if (availableGBP < fundingAmount) {
              if (payoutId) {
                await supabase
                  .from('seller_payouts')
                  .update({
                    status: 'awaiting_funds',
                    funding_status: 'funding_failed',
                    failure_reason: `Insufficient funds in both Wise (£${currentBalance.toFixed(2)}) and Stripe (£${(availableGBP / 100).toFixed(2)}) for £${payoutAmount.toFixed(2)} payout`,
                    funding_requested_at: new Date().toISOString(),
                  })
                  .eq('id', payoutId);
              }
              
              return new Response(
                JSON.stringify({
                  success: false,
                  awaiting_funds: true,
                  message: `Insufficient funds in Wise (£${currentBalance.toFixed(2)}) and Stripe (£${(availableGBP / 100).toFixed(2)}). Required: £${payoutAmount.toFixed(2)}`,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            const stripePayout = await stripe.payouts.create({
              amount: fundingAmount,
              currency: 'gbp',
              description: `Wise funding for seller payout ${payoutId || 'manual'}`,
              metadata: {
                purpose: 'wise_funding',
                linked_payout_id: payoutId || 'manual',
                wise_profile_id: profile.id.toString(),
              },
            });
            
            logStep('Stripe payout created', { payoutId: stripePayout.id, amount: fundingAmount / 100 });
            
            await supabase.from('audit_logs').insert({
              user_id: user.id,
              action: 'stripe_funding_initiated',
              resource: 'wise_payouts',
              details: { stripePayoutId: stripePayout.id, amount: fundingAmount / 100, linkedPayoutId: payoutId },
            });
            
            const { data: fundingRequest } = await supabase
              .from('wise_funding_requests')
              .insert({
                stripe_payout_id: stripePayout.id,
                amount: fundingAmount / 100,
                currency: 'GBP',
                status: 'pending',
                linked_payout_ids: payoutId ? [payoutId] : [],
                created_by: user.id,
              })
              .select()
              .single();
            
            logStep('Funding request created', { id: fundingRequest?.id });
            
            if (payoutId) {
              await supabase
                .from('seller_payouts')
                .update({
                  status: 'awaiting_funds',
                  funding_status: 'funding_requested',
                  stripe_funding_payout_id: stripePayout.id,
                  funding_requested_at: new Date().toISOString(),
                })
                .eq('id', payoutId);
            }
            
            return new Response(
              JSON.stringify({
                success: true,
                awaiting_funds: true,
                message: 'Wise balance low. Stripe payout initiated - funds will arrive in 1-2 business days.',
                stripe_payout_id: stripePayout.id,
                funding_amount: fundingAmount / 100,
                estimated_arrival: '1-2 business days',
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } catch (stripeError: any) {
            logStep('Stripe funding error', { error: stripeError.message });
            
            if (payoutId) {
              await supabase
                .from('seller_payouts')
                .update({
                  status: 'awaiting_funds',
                  funding_status: 'funding_failed',
                  failure_reason: stripeError.message,
                  funding_requested_at: new Date().toISOString(),
                })
                .eq('id', payoutId);
            }
            
            return new Response(
              JSON.stringify({
                success: false,
                awaiting_funds: true,
                message: `Wise balance insufficient (£${currentBalance.toFixed(2)}). Stripe funding failed: ${stripeError.message}`,
                error: stripeError.message,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        // Sufficient balance - proceed with Wise transfer
        logStep('Sufficient balance, proceeding with Wise transfer');
        
        const targetRecipient = recipientId || payoutData?.stores?.wise_recipient_id;
        
        if (!targetRecipient) {
          throw new Error('No Wise recipient configured for this store. Please set up bank details first.');
        }
        
        // 1. Create quote
        const quoteResponse = await fetch(`${WISE_API_URL}/v3/quotes`, {
          method: 'POST',
          headers: wiseHeaders,
          body: JSON.stringify({
            sourceCurrency: 'GBP',
            targetCurrency: payoutCurrency,
            sourceAmount: payoutAmount,
            profile: profile.id,
          }),
        });
        
        if (!quoteResponse.ok) {
          const error = await quoteResponse.text();
          throw new Error(`Quote failed: ${error}`);
        }
        
        const quote = await quoteResponse.json();
        logStep('Quote created for payout', { quoteId: quote.id });
        
        // 2. Create transfer
        const transferResponse = await fetch(`${WISE_API_URL}/v1/transfers`, {
          method: 'POST',
          headers: wiseHeaders,
          body: JSON.stringify({
            targetAccount: targetRecipient,
            quoteUuid: quote.id,
            customerTransactionId: `seller-payout-${payoutId || 'manual'}-${Date.now()}`,
            details: {
              reference: reference || `Eclipse Seller Payout #${payoutId || 'manual'}`,
            },
          }),
        });
        
        if (!transferResponse.ok) {
          const error = await transferResponse.text();
          throw new Error(`Transfer creation failed: ${error}`);
        }
        
        const transfer = await transferResponse.json();
        logStep('Transfer created for payout', { transferId: transfer.id });
        
        // 3. Fund transfer from balance
        const fundResponse = await fetch(
          `${WISE_API_URL}/v3/profiles/${encodeURIComponent(profile.id)}/transfers/${encodeURIComponent(transfer.id)}/payments`,
          {
            method: 'POST',
            headers: wiseHeaders,
            body: JSON.stringify({ type: 'BALANCE' }),
          }
        );
        
        if (!fundResponse.ok) {
          const error = await fundResponse.text();
          throw new Error(`Funding failed: ${error}`);
        }
        
        const payment = await fundResponse.json();
        logStep('Payout funded', { status: payment.status });
        
        // 4. Update payout record in database
        if (payoutId) {
          const { error: updateError } = await supabase
            .from('seller_payouts')
            .update({
              wise_transfer_id: transfer.id.toString(),
              wise_quote_id: quote.id,
              status: 'processing',
              funding_status: 'funded',
              processed_at: new Date().toISOString(),
              processed_by: user.id,
            })
            .eq('id', payoutId);
          
          if (updateError) {
            logStep('Failed to update payout record', { error: updateError.message });
          }
        }
        
        // Audit log for completed payout
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'wise_payout_processed',
          resource: 'wise_payouts',
          details: { payoutId, transferId: transfer.id, amount: payoutAmount, currency: payoutCurrency },
        });
        
        return new Response(
          JSON.stringify({
            success: true,
            awaiting_funds: false,
            quote,
            transfer,
            payment,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('Error', { message: msg });
    return new Response(
      JSON.stringify({ error: msg || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
