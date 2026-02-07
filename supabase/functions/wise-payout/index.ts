import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    console.log(`Wise payout action: ${action}`, params);

    const wiseHeaders = {
      'Authorization': `Bearer ${wiseApiKey}`,
      'Content-Type': 'application/json',
    };

    switch (action) {
      case 'get-profile': {
        // Get Wise profile ID (needed for all operations)
        const response = await fetch(`${WISE_API_URL}/v1/profiles`, {
          headers: wiseHeaders,
        });
        
        if (!response.ok) {
          const error = await response.text();
          console.error('Failed to get Wise profiles:', error);
          throw new Error('Failed to get Wise profile');
        }
        
        const profiles = await response.json();
        // Use business profile if available, otherwise personal
        const profile = profiles.find((p: any) => p.type === 'business') || profiles[0];
        
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
          console.error('Failed to get Wise balance:', error);
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
        
        // Can specify either source or target amount
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
          console.error('Failed to create quote:', error);
          throw new Error(`Failed to create quote: ${error}`);
        }
        
        const quote = await response.json();
        console.log('Quote created:', quote.id);
        
        return new Response(
          JSON.stringify({ quote }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-recipient': {
        const { profileId, recipientDetails } = params;
        
        // recipientDetails should include: accountHolderName, currency, type, details (bank-specific)
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
          console.error('Failed to create recipient:', error);
          throw new Error(`Failed to create recipient: ${error}`);
        }
        
        const recipient = await response.json();
        console.log('Recipient created:', recipient.id);
        
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
          console.error('Failed to get recipient requirements:', error);
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
        
        // Create transfer
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
          console.error('Failed to create transfer:', error);
          throw new Error(`Failed to create transfer: ${error}`);
        }
        
        const transfer = await transferResponse.json();
        console.log('Transfer created:', transfer.id);
        
        return new Response(
          JSON.stringify({ transfer }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'fund-transfer': {
        const { profileId, transferId } = params;
        
        // Fund the transfer from Wise balance
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
          console.error('Failed to fund transfer:', error);
          throw new Error(`Failed to fund transfer: ${error}`);
        }
        
        const payment = await response.json();
        console.log('Transfer funded:', payment.status);
        
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
          console.error('Failed to get transfer status:', error);
          throw new Error('Failed to get transfer status');
        }
        
        const transfer = await response.json();
        
        return new Response(
          JSON.stringify({ transfer }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'process-seller-payout': {
        // Complete payout flow for a seller
        const { payoutId, profileId, recipientId, amount, currency, reference } = params;
        
        // 1. Create quote
        const quoteResponse = await fetch(`${WISE_API_URL}/v3/quotes`, {
          method: 'POST',
          headers: wiseHeaders,
          body: JSON.stringify({
            sourceCurrency: 'GBP',
            targetCurrency: currency || 'GBP',
            sourceAmount: amount,
            profile: profileId,
          }),
        });
        
        if (!quoteResponse.ok) {
          const error = await quoteResponse.text();
          throw new Error(`Quote failed: ${error}`);
        }
        
        const quote = await quoteResponse.json();
        console.log('Quote for payout:', quote.id);
        
        // 2. Create transfer
        const transferResponse = await fetch(`${WISE_API_URL}/v1/transfers`, {
          method: 'POST',
          headers: wiseHeaders,
          body: JSON.stringify({
            targetAccount: recipientId,
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
        console.log('Transfer created for payout:', transfer.id);
        
        // 3. Fund transfer from balance
        const fundResponse = await fetch(
          `${WISE_API_URL}/v3/profiles/${profileId}/transfers/${transfer.id}/payments`,
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
        console.log('Payout funded:', payment.status);
        
        // 4. Update payout record in database
        if (payoutId) {
          const { error: updateError } = await supabase
            .from('seller_payouts')
            .update({
              wise_transfer_id: transfer.id.toString(),
              wise_quote_id: quote.id,
              status: 'processing',
              processed_at: new Date().toISOString(),
              processed_by: user.id,
            })
            .eq('id', payoutId);
          
          if (updateError) {
            console.error('Failed to update payout record:', updateError);
          }
        }
        
        return new Response(
          JSON.stringify({
            success: true,
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
    console.error('Wise payout error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
