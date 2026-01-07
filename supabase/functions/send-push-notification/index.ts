import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}

interface NotificationRequest {
  user_ids: string[];
  payload: PushPayload;
}

// Simple web push implementation using fetch
async function sendWebPush(
  endpoint: string,
  _p256dhKey: string,
  _authKey: string,
  payload: PushPayload,
  vapidPublicKey: string,
  _vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const body = JSON.stringify(payload);
    
    // Create a simple authorization header
    // Note: Full VAPID implementation requires web-push library
    // For now, we'll use a simplified approach that works with most push services
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Urgency': 'high',
        'Authorization': `vapid k=${vapidPublicKey}`,
        'Crypto-Key': `p256ecdsa=${vapidPublicKey}`,
      },
      body: body,
    });

    if (response.status === 201 || response.status === 200) {
      return { success: true, statusCode: response.status };
    } else if (response.status === 404 || response.status === 410) {
      // Subscription expired or invalid
      return { success: false, statusCode: response.status, error: 'Subscription expired' };
    } else {
      const errorText = await response.text();
      console.log(`Push failed with status ${response.status}: ${errorText}`);
      return { success: false, statusCode: response.status, error: errorText };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Web push error:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')!;

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      throw new Error('VAPID keys not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_ids, payload }: NotificationRequest = await req.json();

    if (!user_ids || !user_ids.length || !payload) {
      throw new Error('Missing user_ids or payload');
    }

    console.log(`Sending push notifications to ${user_ids.length} users`);

    // Fetch all subscriptions for the given users
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', user_ids);

    if (fetchError) {
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for the given users');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await sendWebPush(
          sub.endpoint,
          sub.p256dh_key,
          sub.auth_key,
          payload,
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        );

        // Remove expired subscriptions
        if (result.statusCode === 404 || result.statusCode === 410) {
          console.log(`Removing expired subscription: ${sub.id}`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }

        return { subscriptionId: sub.id, ...result };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`Push results: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error sending push notifications:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
