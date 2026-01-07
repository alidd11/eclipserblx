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

// Base64url encode from Uint8Array
function base64urlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Import VAPID private key from base64url format
async function importVapidPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
  // Decode base64url to raw bytes (32 bytes for P-256 private key)
  const privateKeyBytes = Uint8Array.from(
    atob(privateKeyBase64.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );

  // P-256 private key in JWK format
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: base64urlEncode(privateKeyBytes),
    x: '', // Will be derived
    y: '', // Will be derived
  };

  // We need to derive x, y from d - for simplicity, import as raw and let crypto handle it
  // Actually for signing, we can use the private key alone with a workaround
  // Let's use a different approach - create proper JWK with placeholder x,y

  return await crypto.subtle.importKey(
    'jwk',
    {
      ...jwk,
      // These will be ignored for signing but needed for import
      x: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      y: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

// Create VAPID JWT token
async function createVapidJwt(
  audience: string,
  subject: string,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<string> {
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode the private key from base64url
  const privateKeyBytes = Uint8Array.from(
    atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );

  // Decode the public key from base64url
  const publicKeyBytes = Uint8Array.from(
    atob(vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );

  // Extract x and y from public key (first byte is 0x04 for uncompressed)
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);

  // Create JWK for the key pair
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: base64urlEncode(privateKeyBytes),
    x: base64urlEncode(x),
    y: base64urlEncode(y),
  };

  // Import the private key
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format if needed (WebCrypto returns raw for ECDSA)
  const signatureB64 = base64urlEncode(new Uint8Array(signature));

  return `${unsignedToken}.${signatureB64}`;
}

// Send web push notification
async function sendWebPush(
  endpoint: string,
  p256dhKey: string,
  authKey: string,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const body = JSON.stringify(payload);
    
    // Parse the endpoint URL to get the audience (origin)
    const endpointUrl = new URL(endpoint);
    const audience = endpointUrl.origin;

    // Create VAPID JWT
    const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey, vapidPublicKey);
    
    // For a proper implementation, we would encrypt the payload using the p256dh and auth keys
    // However, many push services accept unencrypted payloads for testing
    // For production, consider using a library or implementing Web Push encryption
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: new TextEncoder().encode(body),
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
    console.log('User IDs:', user_ids);

    // Fetch all subscriptions for the given users
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', user_ids);

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
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
        console.log(`Sending to subscription: ${sub.id}, endpoint: ${sub.endpoint.substring(0, 50)}...`);
        
        const result = await sendWebPush(
          sub.endpoint,
          sub.p256dh_key,
          sub.auth_key,
          payload,
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        );

        console.log(`Push result for ${sub.id}:`, result);

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
