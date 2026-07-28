import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REQUEST-AFFILIATE-PAYOUT] ${step}${detailsStr}`);
};

const MINIMUM_PAYOUT_AMOUNT = 1000;
const MAXIMUM_PAYOUT_AMOUNT = 1000000;

function isDefinitiveStripeRejection(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const type = 'type' in error ? String(error.type) : '';
  const rawType = 'raw' in error
    && error.raw
    && typeof error.raw === 'object'
    && 'type' in error.raw
      ? String(error.raw.type)
      : '';
  return [
    'StripeInvalidRequestError',
    'StripeAuthenticationError',
    'StripePermissionError',
  ].includes(type) || rawType === 'invalid_request_error';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'request-affiliate-payout' });
    if (!rl.allowed) {
      logStep("Rate limit exceeded", { ip: clientIp });
      return rateLimitResponse(rl, corsHeaders);
    }

    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { amount, method } = await req.json();

    if (typeof amount !== 'number' || !Number.isFinite(amount) || !Number.isInteger(amount)) {
      throw new Error("Invalid amount");
    }
    if (amount < MINIMUM_PAYOUT_AMOUNT) {
      throw new Error(`Minimum payout amount is £${(MINIMUM_PAYOUT_AMOUNT / 100).toFixed(2)}`);
    }
    if (amount > MAXIMUM_PAYOUT_AMOUNT) {
      throw new Error(`Maximum payout amount is £${(MAXIMUM_PAYOUT_AMOUNT / 100).toFixed(2)}`);
    }
    if (method && !['stripe', 'paypal', 'bank_transfer'].includes(method)) {
      throw new Error("Invalid payout method");
    }

    // Get payment details
    const { data: paymentDetails, error: paymentError } = await supabaseClient
      .from('user_payment_details')
      .select('stripe_account_id, paypal_email, preferred_payout_method, bank_account_holder, bank_account_number, bank_swift_bic, bank_name')
      .eq('user_id', user.id)
      .single();

    if (paymentError || !paymentDetails) {
      throw new Error("No payment details found. Please configure your payout settings.");
    }

    const payoutMethod = method || paymentDetails.preferred_payout_method || 'paypal';
    logStep("Payout method determined", { payoutMethod });

    // Validate payment details for chosen method
    if (payoutMethod === 'stripe' && !paymentDetails.stripe_account_id) {
      throw new Error("Please connect your Stripe account first to receive automatic payouts.");
    } else if (payoutMethod === 'bank_transfer' && (!paymentDetails.bank_account_holder || !paymentDetails.bank_account_number)) {
      throw new Error("Please add your bank details to receive bank transfer payouts.");
    } else if (payoutMethod === 'paypal' && !paymentDetails.paypal_email) {
      throw new Error("Please add your PayPal email to receive payouts. Update your payout settings.");
    }

    const bankNotes = payoutMethod === 'bank_transfer'
      ? `Bank: ${paymentDetails.bank_name || 'N/A'}, Holder: ${paymentDetails.bank_account_holder}, Account: ${paymentDetails.bank_account_number}, SWIFT: ${paymentDetails.bank_swift_bic || 'N/A'}`
      : null;

    // Reserve the balance and create (or reuse on retry) the payout in one
    // database transaction. The payout ID is also the provider idempotency key.
    const { data: payoutId, error: reserveError } = await supabaseClient.rpc(
      'reserve_affiliate_payout',
      {
        p_user_id: user.id,
        p_amount: amount,
        p_payout_method: payoutMethod,
        p_stripe_account_id: payoutMethod === 'stripe' ? paymentDetails.stripe_account_id : null,
        p_paypal_email: payoutMethod === 'paypal' ? paymentDetails.paypal_email : null,
        p_notes: bankNotes,
      },
    );

    if (reserveError || !payoutId) {
      throw new Error(reserveError?.message || "Failed to reserve affiliate payout");
    }

    logStep("Payout reserved", { payoutId, amount });

    // Stripe auto-transfer
    if (payoutMethod === 'stripe' && paymentDetails.stripe_account_id) {
      let providerRequestStarted = false;
      try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
        
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
        let transferCreated = false;
        providerRequestStarted = true;
        const transfer = await stripe.transfers.create(
          {
            amount,
            currency: 'gbp',
            destination: paymentDetails.stripe_account_id,
            transfer_group: `affiliate_payout_${payoutId}`,
            metadata: { user_id: user.id, payout_id: payoutId, type: 'affiliate_payout' },
          },
          { idempotencyKey: `affiliate-payout-${payoutId}` },
        );
        transferCreated = true;

        logStep("Stripe transfer created", { transferId: transfer.id, amount });

        const { data: completed, error: completeError } = await supabaseClient.rpc(
          'complete_affiliate_payout',
          {
            p_payout_id: payoutId,
            p_user_id: user.id,
            p_stripe_transfer_id: transfer.id,
          },
        );
        if (completeError || !completed) {
          // Do not release the reservation after Stripe accepted the transfer.
          // A retry reuses both payoutId and Stripe's idempotency key.
          throw Object.assign(
            new Error(completeError?.message || "Failed to finalize affiliate payout"),
            { transferCreated },
          );
        }

        return new Response(JSON.stringify({ 
          success: true, payoutId, transferId: transfer.id, method: 'stripe',
          message: "Payout completed! Funds have been transferred to your Stripe account.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      } catch (stripeError) {
        const transferCreated = Boolean(
          stripeError
          && typeof stripeError === 'object'
          && 'transferCreated' in stripeError
          && stripeError.transferCreated
        );
        const definitelyRejected = isDefinitiveStripeRejection(stripeError);
        // A connection/API failure after dispatch has an unknown outcome. Keep
        // the reservation in "processing": a retry reuses the same payout ID
        // and Stripe idempotency key, preventing a second transfer. Release only
        // when no request was sent or Stripe definitively rejected it.
        if (!transferCreated && (!providerRequestStarted || definitelyRejected)) {
          const { error: releaseError } = await supabaseClient.rpc(
            'release_affiliate_payout',
            {
              p_payout_id: payoutId,
              p_user_id: user.id,
              p_failure_reason: stripeError instanceof Error ? stripeError.message : String(stripeError),
            },
          );
          if (releaseError) {
            logStep("Failed to release affiliate payout reservation", { payoutId, error: releaseError.message });
          }
        }

        const errorMsg = stripeError instanceof Error ? stripeError.message : String(stripeError);
        logStep("Stripe payout failed", {
          error: errorMsg,
          transferCreated,
          outcomeUnknown: providerRequestStarted && !transferCreated && !definitelyRejected,
        });
        throw new Error("Stripe transfer could not be confirmed. Please retry; the payout is protected from duplicate transfer.");
      }
    }

    const methodLabel = payoutMethod === 'bank_transfer' ? 'bank transfer' : 'PayPal';
    logStep(`${methodLabel} payout request created`, { payoutId, amount });

    return new Response(JSON.stringify({ 
      success: true, payoutId, method: payoutMethod,
      message: `Payout request submitted! Your ${methodLabel} payment will be processed today.`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
