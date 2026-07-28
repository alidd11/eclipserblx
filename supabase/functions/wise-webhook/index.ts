import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

// Wise signs webhook bodies with RSA-SHA256. The public key is not secret and
// may be overridden through WISE_WEBHOOK_PUBLIC_KEY when Wise rotates it.
const WISE_PRODUCTION_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvO8vXV+JksBzZAY6GhSO
XdoTCfhXaaiZ+qAbtaDBiu2AGkGVpmEygFmWP4Li9m5+Ni85BhVvZOodM9epgW3F
bA5Q1SexvAF1PPjX4JpMstak/QhAgl1qMSqEevL8cmUeTgcMuVWCJmlge9h7B1CS
D4rtlimGZozG39rUBDg6Qt2K+P4wBfLblL0k4C4YUdLnpGYEDIth+i8XsRpFlogx
CAFyH9+knYsDbR43UJ9shtc42Ybd40Afihj8KnYKXzchyQ42aC8aZ/h5hyZ28yVy
Oj3Vos0VdBIs/gAyJ/4yyQFCXYte64I7ssrlbGRaco4nKF3HmaNhxwyKyJafz19e
HwIDAQAB
-----END PUBLIC KEY-----`;

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value.replace(/\s+/g, ''));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function verifySignature(
  payload: string,
  signature: string,
  publicKeyPem: string,
): Promise<boolean> {
  try {
    const publicKeyDer = decodeBase64(
      publicKeyPem
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', ''),
    );
    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicKeyDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      decodeBase64(signature),
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
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
    const webhookPublicKey =
      Deno.env.get('WISE_WEBHOOK_PUBLIC_KEY') || WISE_PRODUCTION_PUBLIC_KEY;

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

    if (!await verifySignature(rawBody, signature, webhookPublicKey)) {
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

    // Map Wise states. Financial settlement is performed by one locked RPC so
    // duplicate/out-of-order provider deliveries cannot adjust balances twice.
    let newStatus: string | null = null;

    switch (newState) {
      case 'outgoing_payment_sent':
        newStatus = 'completed';
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

    if (newStatus === 'completed' || newStatus === 'failed') {
      const { data: settled, error: settlementError } = await supabase.rpc(
        'settle_seller_payout',
        {
          p_payout_id: payout.id,
          p_provider_reference: transferId,
          p_status: newStatus,
          p_failure_reason: newStatus === 'failed' ? `Transfer ${newState}` : null,
        },
      );

      if (settlementError || !settled) {
        LOG('Failed to settle payout', { error: settlementError?.message });
        throw new Error('Failed to settle payout status');
      }
      LOG(`Payout ${payout.id} → ${newStatus}`);
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
