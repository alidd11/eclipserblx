import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewProductRequest {
  product_id: string;
  product_name: string;
  product_slug: string;
  product_price: number;
  category_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Default to true if not set
    const isEnabled = settingData?.value !== false && settingData?.value !== 'false';

    if (!isEnabled) {
      console.log('[notify-new-product] New product notifications are globally disabled');
      return new Response(
        JSON.stringify({ success: true, notified: 0, message: 'New product notifications are disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { product_id, product_name, product_slug, product_price, category_name }: NewProductRequest = await req.json();

    if (!product_id || !product_name) {
      throw new Error('Missing product_id or product_name');
    }

    console.log(`[notify-new-product] Notifying users about new product: ${product_name}`);

    // Get all users who have push subscriptions (these are users who want notifications)
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .not('user_id', 'is', null);

    if (subError) {
      console.error('[notify-new-product] Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[notify-new-product] No push subscriptions found');
      return new Response(
        JSON.stringify({ success: true, notified: 0, message: 'No subscribers to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(subscriptions.map(s => s.user_id))];
    console.log(`[notify-new-product] Found ${userIds.length} users to notify`);

    // Format price
    const formattedPrice = `£${product_price.toFixed(2)}`;

    // Prepare notification content
    const title = '🆕 New Product Available!';
    const body = category_name 
      ? `${product_name} is now available in ${category_name} for ${formattedPrice}`
      : `${product_name} is now available for ${formattedPrice}`;

    // Create in-app notifications for all users
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message: body,
      type: 'new_product',
      link: `/products/${product_slug}`,
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('[notify-new-product] Error creating notifications:', notifError);
    } else {
      console.log(`[notify-new-product] Created ${notifications.length} in-app notifications`);
    }

    // Send push notifications
    const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        user_ids: userIds,
        payload: {
          title,
          body,
          tag: `new-product-${product_id}`,
          url: `/products/${product_slug}`,
          requireInteraction: false,
        },
      }),
    });

    const pushResult = await pushResponse.json();
    console.log(`[notify-new-product] Push notification result:`, pushResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: userIds.length,
        pushResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[notify-new-product] Error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});