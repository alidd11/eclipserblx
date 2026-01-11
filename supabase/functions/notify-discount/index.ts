import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscountNotificationRequest {
  discount_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  expires_at?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting: 10 requests per minute (expensive operation - sends to many users)
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    ...RATE_LIMITS.EXPENSIVE,
    identifier: clientIp,
    action: 'notify-discount',
  });

  if (!rateLimitResult.allowed) {
    console.log(`[notify-discount] Rate limit exceeded for IP: ${clientIp}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if discount notifications are globally enabled
    const { data: settingData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'discount_notifications_enabled')
      .maybeSingle();

    // Default to true if not set
    const isEnabled = settingData?.value !== false && settingData?.value !== 'false';

    if (!isEnabled) {
      console.log('[notify-discount] Discount notifications are globally disabled');
      return new Response(
        JSON.stringify({ success: true, notified: 0, message: 'Discount notifications are disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { discount_id, code, discount_type, discount_value, expires_at }: DiscountNotificationRequest = await req.json();

    if (!discount_id || !code) {
      throw new Error('Missing discount_id or code');
    }

    console.log(`[notify-discount] Notifying users about discount code: ${code}`);

    // Get users who are subscribed to discounts AND have push subscriptions
    const { data: discountSubscribers, error: subError } = await supabase
      .from('email_subscriptions')
      .select('user_id')
      .eq('subscribed_to_discounts', true)
      .not('user_id', 'is', null);

    if (subError) {
      console.error('[notify-discount] Error fetching discount subscribers:', subError);
      throw subError;
    }

    if (!discountSubscribers || discountSubscribers.length === 0) {
      console.log('[notify-discount] No users subscribed to discounts');
      return new Response(
        JSON.stringify({ success: true, notified: 0, message: 'No discount subscribers found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscribedUserIds = discountSubscribers.map(s => s.user_id).filter(Boolean) as string[];

    // Get push subscriptions for these users
    const { data: pushSubscriptions, error: pushError } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .in('user_id', subscribedUserIds);

    if (pushError) {
      console.error('[notify-discount] Error fetching push subscriptions:', pushError);
    }

    // Get unique user IDs who have both discount subscription AND push subscription
    const pushEnabledUserIds = pushSubscriptions 
      ? [...new Set(pushSubscriptions.map(s => s.user_id))]
      : [];

    console.log(`[notify-discount] Found ${subscribedUserIds.length} discount subscribers, ${pushEnabledUserIds.length} with push enabled`);

    // Format discount display
    const discountDisplay = discount_type === 'percentage' 
      ? `${discount_value}% off` 
      : `£${discount_value.toFixed(2)} off`;

    // Prepare notification content
    const title = '🏷️ New Discount Code!';
    const body = expires_at
      ? `Use code ${code} for ${discountDisplay} - expires ${new Date(expires_at).toLocaleDateString()}`
      : `Use code ${code} for ${discountDisplay} your next order!`;

    // Create in-app notifications for ALL subscribed users (not just push-enabled)
    const notifications = subscribedUserIds.map(userId => ({
      user_id: userId,
      title,
      message: body,
      type: 'discount',
      link: '/products',
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('[notify-discount] Error creating notifications:', notifError);
    } else {
      console.log(`[notify-discount] Created ${notifications.length} in-app notifications`);
    }

    // Send push notifications only to users with push enabled
    let pushResult = { sent: 0 };
    if (pushEnabledUserIds.length > 0) {
      const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          user_ids: pushEnabledUserIds,
          payload: {
            title,
            body,
            tag: `discount-${discount_id}`,
            url: '/products',
            requireInteraction: false,
          },
        }),
      });

      pushResult = await pushResponse.json();
      console.log(`[notify-discount] Push notification result:`, pushResult);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: subscribedUserIds.length,
        pushNotified: pushEnabledUserIds.length,
        pushResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[notify-discount] Error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
