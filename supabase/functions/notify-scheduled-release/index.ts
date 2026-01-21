import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  store_id: string;
  release_at: string;
  stores: {
    id: string;
    name: string;
    slug: string;
  } | null;
  categories: {
    name: string;
  } | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    ...RATE_LIMITS.EXPENSIVE,
    identifier: clientIp,
    action: 'notify-scheduled-release',
  });

  if (!rateLimitResult.allowed) {
    console.log(`[notify-scheduled-release] Rate limit exceeded for IP: ${clientIp}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if new product notifications are globally enabled
    const { data: settingData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'new_product_notifications_enabled')
      .maybeSingle();

    const isEnabled = settingData?.value !== false && settingData?.value !== 'false';

    if (!isEnabled) {
      console.log('[notify-scheduled-release] New product notifications are globally disabled');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Notifications are disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    // Check for products released in the last 5 minutes to avoid missing any
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Find products that:
    // 1. Have a release_at that just passed (within last 5 mins)
    // 2. Are active
    // 3. Haven't been notified yet (we'll track this with a new field or check notifications table)
    const { data: releasedProducts, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        price,
        store_id,
        release_at,
        stores (
          id,
          name,
          slug
        ),
        categories (
          name
        )
      `)
      .eq('is_active', true)
      .not('release_at', 'is', null)
      .gte('release_at', fiveMinutesAgo)
      .lte('release_at', now) as { data: ScheduledProduct[] | null; error: any };

    if (productError) {
      console.error('[notify-scheduled-release] Error fetching products:', productError);
      throw productError;
    }

    if (!releasedProducts || releasedProducts.length === 0) {
      console.log('[notify-scheduled-release] No newly released products found');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No products to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[notify-scheduled-release] Found ${releasedProducts.length} products just released`);

    let totalNotified = 0;

    for (const product of releasedProducts) {
      // Check if we already sent notifications for this product release
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'scheduled_release')
        .eq('link', `/products/${product.slug}`)
        .limit(1)
        .maybeSingle();

      if (existingNotif) {
        console.log(`[notify-scheduled-release] Already notified for product: ${product.name}`);
        continue;
      }

      // Get followers of this store who want new product notifications
      const { data: followers, error: followError } = await supabase
        .from('store_follows')
        .select('user_id')
        .eq('store_id', product.store_id)
        .eq('notify_new_products', true);

      if (followError) {
        console.error(`[notify-scheduled-release] Error fetching followers for store ${product.store_id}:`, followError);
        continue;
      }

      if (!followers || followers.length === 0) {
        console.log(`[notify-scheduled-release] No followers to notify for product: ${product.name}`);
        continue;
      }

      const followerUserIds = followers.map(f => f.user_id);
      console.log(`[notify-scheduled-release] Notifying ${followerUserIds.length} followers about: ${product.name}`);

      // Format price
      const formattedPrice = `£${product.price.toFixed(2)}`;
      const storeName = product.stores?.name || 'a store you follow';
      const categoryName = product.categories?.name;

      // Prepare notification content
      const title = `🎉 New from ${storeName}!`;
      const body = categoryName
        ? `${product.name} is now available in ${categoryName} for ${formattedPrice}`
        : `${product.name} is now available for ${formattedPrice}`;

      // Create in-app notifications for followers
      const notifications = followerUserIds.map(userId => ({
        user_id: userId,
        title,
        message: body,
        type: 'scheduled_release',
        link: `/products/${product.slug}`,
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error(`[notify-scheduled-release] Error creating notifications for ${product.name}:`, notifError);
      } else {
        console.log(`[notify-scheduled-release] Created ${notifications.length} in-app notifications for ${product.name}`);
      }

      // Get followers who have push subscriptions
      const { data: pushSubscribers } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .in('user_id', followerUserIds);

      const pushUserIds = pushSubscribers?.map(s => s.user_id) || [];

      if (pushUserIds.length > 0) {
        // Send push notifications
        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            user_ids: pushUserIds,
            payload: {
              title,
              body,
              tag: `scheduled-release-${product.id}`,
              url: `/products/${product.slug}`,
              requireInteraction: false,
            },
          }),
        });

        const pushResult = await pushResponse.json();
        console.log(`[notify-scheduled-release] Push result for ${product.name}:`, pushResult);
      }

      totalNotified += followerUserIds.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: releasedProducts.length,
        notified: totalNotified,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[notify-scheduled-release] Error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
