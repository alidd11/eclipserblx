import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WISE_API_URL = "https://api.transferwise.com";

interface WiseQuote {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  fee: number;
}

interface WiseRecipient {
  id: number;
  accountHolderName: string;
  currency: string;
}

interface WiseTransfer {
  id: number;
  status: string;
  reference: string;
  targetAmount: number;
  targetCurrency: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WISE-PAYOUT] ${step}${detailsStr}`);
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
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

    const { action, ...params } = await req.json();
    logStep(`Action: ${action}`, params);

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
        
        const response = await fetch(`${WISE_API_URL}/v4/profiles/${profileId}/balances?types=STANDARD`, {
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
        
        const response = await fetch(`${WISE_API_URL}/v1/quotes/${quoteId}/account-requirements`, {
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
        
        const transferResponse = await fetch(`${WISE_API_URL}/v1/transfers`, {
          method: 'POST',
          headers: wiseHeaders,
          body: JSON.stringify({
            targetAccount,
            quoteUuid: quoteId,
            customerTransactionId: customerTransactionId || `payout-${payoutId}-${Date.now()}`,
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
        
        return new Response(
          JSON.stringify({ transfer }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'fund-transfer': {
        const { profileId, transferId } = params;
        
        const response = await fetch(
          `${WISE_API_URL}/v3/profiles/${profileId}/transfers/${transferId}/payments`,
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
        
        return new Response(
          JSON.stringify({ payment }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-transfer-status': {
        const { transferId } = params;
        
        const response = await fetch(`${WISE_API_URL}/v1/transfers/${transferId}`, {
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
        // Enhanced payout flow with automatic Stripe funding when Wise balance is insufficient
        const { payoutId, profileId, recipientId, amount, currency, reference } = params;
        
        // Get payout details if payoutId provided
        let payoutData: any = null;
        let payoutAmount = amount;
        let payoutCurrency = currency || 'GBP';
        
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
          
          // Calculate funding amount (payout amount + 10% buffer, rounded up)
          const fundingAmount = Math.ceil(requiredAmount * 100); // Stripe uses cents
          
          try {
            // Check Stripe balance first
            const stripeBalance = await stripe.balance.retrieve();
            const gbpAvailable = stripeBalance.available.find((b: any) => b.currency === 'gbp');
            const availableGBP = gbpAvailable?.amount || 0;
            
            logStep('Stripe GBP balance', { available: availableGBP / 100, required: fundingAmount / 100 });
            
            if (availableGBP < fundingAmount) {
              // Not enough in Stripe either - mark as needing attention
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
            
            // Create Stripe payout to Wise bank account
            // Note: Requires Wise GBP bank details to be configured as external account in Stripe
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
            
            // Create funding request record
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
            
            // Update payout status to awaiting_funds
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
            
            // If Stripe payout fails (e.g., no external account configured), update status
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
        
        // Get recipient ID from store if not provided
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
            customerTransactionId: `seller-payout-${payoutId}-${Date.now()}`,
            details: {
              reference: reference || `Eclipse Seller Payout #${payoutId}`,
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
          `${WISE_API_URL}/v3/profiles/${profile.id}/transfers/${transfer.id}/payments`,
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
    logStep('Error', { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
