import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SubscriptionEventType =
  | 'SubscriptionPurchased'
  | 'SubscriptionRenewed'
  | 'SubscriptionExpired'
  | 'SubscriptionRefunded';

const VALID_EVENTS = new Set<string>([
  'SubscriptionPurchased', 'SubscriptionRenewed',
  'SubscriptionExpired', 'SubscriptionRefunded',
]);

interface RobloxSubscriptionEvent {
  secret: string;
  event_type: SubscriptionEventType;
  roblox_user_id: string;
  roblox_username: string;
  subscription_id: string;
  robux_amount?: number;
  transaction_id?: string;
  expires_at?: string;
}

type AdTier = 'basic' | 'pro' | 'premium';

const LOG = (step: string, d?: unknown) => {
  const s = d ? ` - ${JSON.stringify(d)}` : '';
  console.log(`[ROBUX-AD-WEBHOOK] ${step}${s}`);
};

const TIER_ADS_PER_MONTH: Record<AdTier, number> = {
  basic: 5, pro: 15, premium: 30,
};

// Input validation
const isValidRobloxId = (id: string): boolean =>
  typeof id === 'string' && /^\d{1,20}$/.test(id);

const isValidSubscriptionId = (id: string): boolean =>
  typeof id === 'string' && id.length > 0 && id.length <= 100;

const sanitizeString = (str: string, maxLen: number): string =>
  typeof str === 'string' ? str.slice(0, maxLen).replace(/[<>"']/g, '') : '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'robux-ad-webhook' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const webhookSecret = Deno.env.get('ROBUX_WEBHOOK_SECRET');
    if (!webhookSecret) {
      LOG('ERROR: ROBUX_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RobloxSubscriptionEvent = await req.json();

    // Verify secret
    if (!body.secret || body.secret !== webhookSecret) {
      LOG('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Invalid secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    LOG('Received webhook', {
      event_type: body.event_type,
      roblox_user_id: body.roblox_user_id,
      subscription_id: body.subscription_id,
    });

    // Validate event type
    if (!VALID_EVENTS.has(body.event_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid event_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate roblox_user_id
    if (!isValidRobloxId(body.roblox_user_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid roblox_user_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate username
    if (!body.roblox_username || typeof body.roblox_username !== 'string' || body.roblox_username.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Invalid roblox_username' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate subscription_id
    if (!isValidSubscriptionId(body.subscription_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate optional robux_amount
    if (body.robux_amount !== undefined && (typeof body.robux_amount !== 'number' || body.robux_amount <= 0 || body.robux_amount > 10000000)) {
      return new Response(
        JSON.stringify({ error: 'Invalid robux_amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tier subscription IDs from settings
    const { data: subscriptionSettings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'robux_ad_basic_subscription_id',
        'robux_ad_pro_subscription_id',
        'robux_ad_premium_subscription_id',
      ]);

    const tierSubscriptions: Record<AdTier, string> = { basic: '', pro: '', premium: '' };
    subscriptionSettings?.forEach((s) => {
      const val = s.value?.toString().replace(/"/g, '') || '';
      if (s.key === 'robux_ad_basic_subscription_id') tierSubscriptions.basic = val;
      if (s.key === 'robux_ad_pro_subscription_id') tierSubscriptions.pro = val;
      if (s.key === 'robux_ad_premium_subscription_id') tierSubscriptions.premium = val;
    });

    // Determine tier
    let purchasedTier: AdTier | null = null;
    for (const [tier, subscriptionId] of Object.entries(tierSubscriptions)) {
      if (subscriptionId && subscriptionId === body.subscription_id) {
        purchasedTier = tier as AdTier;
        break;
      }
    }

    if (!purchasedTier) {
      LOG('Subscription ID does not match any configured tier', { received: body.subscription_id });
      return new Response(
        JSON.stringify({ error: 'Invalid subscription for advertisement' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find linked user
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('roblox_id', body.roblox_user_id)
      .maybeSingle();

    if (!profile) {
      LOG('No linked account for Roblox user', { roblox_user_id: body.roblox_user_id });
      return new Response(
        JSON.stringify({ error: 'No website account linked to this Roblox user.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const periodEnd = body.expires_at
      ? new Date(body.expires_at)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Validate expires_at if provided
    if (body.expires_at && isNaN(periodEnd.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid expires_at date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (body.event_type) {
      case 'SubscriptionPurchased':
      case 'SubscriptionRenewed': {
        const { data: existingSub } = await supabase
          .from('advertisement_subscriptions')
          .select('id, status')
          .eq('user_id', profile.user_id)
          .eq('payment_method', 'robux')
          .maybeSingle();

        if (existingSub) {
          await supabase
            .from('advertisement_subscriptions')
            .update({
              tier: purchasedTier, status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              roblox_subscription_id: body.subscription_id,
              roblox_user_id: body.roblox_user_id,
              ads_used_this_month: body.event_type === 'SubscriptionRenewed' ? 0 : undefined,
              ads_reset_at: body.event_type === 'SubscriptionRenewed' ? now.toISOString() : undefined,
              updated_at: now.toISOString(),
            })
            .eq('id', existingSub.id);
        } else {
          await supabase
            .from('advertisement_subscriptions')
            .insert({
              user_id: profile.user_id, tier: purchasedTier, status: 'active',
              payment_method: 'robux', billing_period: 'monthly',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              roblox_subscription_id: body.subscription_id,
              roblox_user_id: body.roblox_user_id,
              ads_used_this_month: 0, ads_reset_at: now.toISOString(),
            });
        }

        // Record transaction
        if (body.transaction_id && body.robux_amount) {
          await supabase.from('robux_transactions').insert({
            roblox_user_id: body.roblox_user_id,
            roblox_username: sanitizeString(body.roblox_username, 50),
            product_id: body.subscription_id,
            product_name: `Advertisement Subscription (${purchasedTier.charAt(0).toUpperCase() + purchasedTier.slice(1)})`,
            robux_amount: body.robux_amount,
            robux_after_tax: Math.floor(body.robux_amount * 0.7),
            transaction_id: body.transaction_id,
            transaction_type: 'subscription',
          });
        }

        LOG('Subscription activated/renewed', { tier: purchasedTier, event: body.event_type });
        return new Response(
          JSON.stringify({
            success: true,
            message: `Subscription ${body.event_type === 'SubscriptionRenewed' ? 'renewed' : 'activated'}`,
            tier: purchasedTier,
            ads_per_month: TIER_ADS_PER_MONTH[purchasedTier],
            expires_at: periodEnd.toISOString(),
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'SubscriptionExpired':
      case 'SubscriptionRefunded': {
        const { data: existingSub } = await supabase
          .from('advertisement_subscriptions')
          .select('id')
          .eq('user_id', profile.user_id)
          .eq('roblox_subscription_id', body.subscription_id)
          .maybeSingle();

        if (existingSub) {
          const newStatus = body.event_type === 'SubscriptionRefunded' ? 'canceled' : 'expired';
          await supabase
            .from('advertisement_subscriptions')
            .update({ status: newStatus, updated_at: now.toISOString() })
            .eq('id', existingSub.id);
          LOG('Subscription deactivated', { event: body.event_type, newStatus });
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Subscription ${body.event_type === 'SubscriptionRefunded' ? 'canceled' : 'expired'}`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown event type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    LOG('ERROR', { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
