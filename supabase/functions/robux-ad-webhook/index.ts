import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Roblox Subscription event types
type SubscriptionEventType = 
  | 'SubscriptionPurchased' 
  | 'SubscriptionRenewed' 
  | 'SubscriptionExpired' 
  | 'SubscriptionRefunded';

interface RobloxSubscriptionEvent {
  secret: string;
  event_type: SubscriptionEventType;
  roblox_user_id: string;
  roblox_username: string;
  subscription_id: string;
  robux_amount?: number;
  transaction_id?: string;
  expires_at?: string; // ISO date string for when subscription expires
}

type AdTier = 'basic' | 'pro' | 'premium';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ROBUX-AD-WEBHOOK] ${step}${detailsStr}`);
};

// Map tiers to their ads_per_month allowance (should match advertisement_tiers table)
const TIER_ADS_PER_MONTH: Record<AdTier, number> = {
  basic: 5,
  pro: 15,
  premium: 30,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('ROBUX_WEBHOOK_SECRET');
    if (!webhookSecret) {
      logStep('ERROR: ROBUX_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RobloxSubscriptionEvent = await req.json();
    logStep('Received webhook', { 
      event_type: body.event_type,
      roblox_user_id: body.roblox_user_id,
      subscription_id: body.subscription_id,
      robux_amount: body.robux_amount,
    });

    // Verify secret
    if (body.secret !== webhookSecret) {
      logStep('ERROR: Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Invalid secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    const requiredFields = ['event_type', 'roblox_user_id', 'roblox_username', 'subscription_id'];
    for (const field of requiredFields) {
      if (!body[field as keyof RobloxSubscriptionEvent]) {
        logStep(`ERROR: Missing required field: ${field}`);
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all tier subscription IDs from settings
    const { data: subscriptionSettings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'robux_ad_basic_subscription_id',
        'robux_ad_pro_subscription_id',
        'robux_ad_premium_subscription_id',
      ]);

    const tierSubscriptions: Record<AdTier, string> = {
      basic: '',
      pro: '',
      premium: '',
    };

    subscriptionSettings?.forEach((s) => {
      const val = s.value?.toString().replace(/"/g, '') || '';
      if (s.key === 'robux_ad_basic_subscription_id') tierSubscriptions.basic = val;
      if (s.key === 'robux_ad_pro_subscription_id') tierSubscriptions.pro = val;
      if (s.key === 'robux_ad_premium_subscription_id') tierSubscriptions.premium = val;
    });

    // Determine which tier this subscription belongs to
    let purchasedTier: AdTier | null = null;
    for (const [tier, subscriptionId] of Object.entries(tierSubscriptions)) {
      if (subscriptionId && subscriptionId === body.subscription_id) {
        purchasedTier = tier as AdTier;
        break;
      }
    }

    if (!purchasedTier) {
      logStep('ERROR: Subscription ID does not match any configured tier', { 
        received: body.subscription_id, 
        configured: tierSubscriptions 
      });
      return new Response(
        JSON.stringify({ error: 'Invalid subscription for advertisement' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Matched tier', { tier: purchasedTier, subscription_id: body.subscription_id });

    // Find user by linked Roblox account
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('roblox_id', body.roblox_user_id)
      .single();

    if (!profile) {
      logStep('ERROR: No linked account found for Roblox user', { roblox_user_id: body.roblox_user_id });
      return new Response(
        JSON.stringify({ error: 'No website account linked to this Roblox user. Please link your Roblox account first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Found linked user', { user_id: profile.user_id });

    // Calculate subscription period (default 30 days if not provided)
    const now = new Date();
    const periodEnd = body.expires_at 
      ? new Date(body.expires_at) 
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Handle different subscription events
    switch (body.event_type) {
      case 'SubscriptionPurchased':
      case 'SubscriptionRenewed': {
        // Check for existing subscription
        const { data: existingSub } = await supabase
          .from('advertisement_subscriptions')
          .select('id, status')
          .eq('user_id', profile.user_id)
          .eq('payment_method', 'robux')
          .maybeSingle();

        if (existingSub) {
          // Update existing subscription
          const { error: updateError } = await supabase
            .from('advertisement_subscriptions')
            .update({
              tier: purchasedTier,
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              roblox_subscription_id: body.subscription_id,
              roblox_user_id: body.roblox_user_id,
              ads_used_this_month: body.event_type === 'SubscriptionRenewed' ? 0 : undefined,
              ads_reset_at: body.event_type === 'SubscriptionRenewed' ? now.toISOString() : undefined,
              updated_at: now.toISOString(),
            })
            .eq('id', existingSub.id);

          if (updateError) {
            logStep('ERROR: Failed to update subscription', updateError);
            throw updateError;
          }

          logStep('Updated existing subscription', { 
            subscription_id: existingSub.id, 
            tier: purchasedTier,
            event: body.event_type,
          });
        } else {
          // Create new subscription
          const { data: newSub, error: insertError } = await supabase
            .from('advertisement_subscriptions')
            .insert({
              user_id: profile.user_id,
              tier: purchasedTier,
              status: 'active',
              payment_method: 'robux',
              billing_period: 'monthly',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              roblox_subscription_id: body.subscription_id,
              roblox_user_id: body.roblox_user_id,
              ads_used_this_month: 0,
              ads_reset_at: now.toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            logStep('ERROR: Failed to create subscription', insertError);
            throw insertError;
          }

          logStep('Created new subscription', { 
            subscription_id: newSub.id, 
            tier: purchasedTier,
          });
        }

        // Record transaction
        if (body.transaction_id && body.robux_amount) {
          await supabase
            .from('robux_transactions')
            .insert({
              roblox_user_id: body.roblox_user_id,
              roblox_username: body.roblox_username,
              product_id: body.subscription_id,
              product_name: `Advertisement Subscription (${purchasedTier.charAt(0).toUpperCase() + purchasedTier.slice(1)})`,
              robux_amount: body.robux_amount,
              robux_after_tax: Math.floor(body.robux_amount * 0.7),
              transaction_id: body.transaction_id,
              transaction_type: 'subscription',
            });
        }

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
        // Find and deactivate the subscription
        const { data: existingSub, error: findError } = await supabase
          .from('advertisement_subscriptions')
          .select('id')
          .eq('user_id', profile.user_id)
          .eq('roblox_subscription_id', body.subscription_id)
          .maybeSingle();

        if (findError) {
          logStep('ERROR: Failed to find subscription', findError);
          throw findError;
        }

        if (existingSub) {
          const newStatus = body.event_type === 'SubscriptionRefunded' ? 'canceled' : 'expired';
          
          const { error: updateError } = await supabase
            .from('advertisement_subscriptions')
            .update({
              status: newStatus,
              updated_at: now.toISOString(),
            })
            .eq('id', existingSub.id);

          if (updateError) {
            logStep('ERROR: Failed to update subscription status', updateError);
            throw updateError;
          }

          logStep('Subscription deactivated', { 
            subscription_id: existingSub.id, 
            new_status: newStatus,
            event: body.event_type,
          });
        } else {
          logStep('No matching subscription found to deactivate', { 
            roblox_subscription_id: body.subscription_id 
          });
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
        logStep('Unknown event type', { event_type: body.event_type });
        return new Response(
          JSON.stringify({ error: 'Unknown event type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
