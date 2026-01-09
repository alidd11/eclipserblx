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

// Base64url decode to Uint8Array
function base64urlDecode(base64: string): Uint8Array {
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

// Concatenate Uint8Arrays
function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// Convert Uint8Array to ArrayBuffer
function toBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length);
  new Uint8Array(buffer).set(arr);
  return buffer;
}

// HKDF implementation for Web Push
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const saltBuffer = salt.length > 0 ? toBuffer(salt) : new ArrayBuffer(32);
  const key = await crypto.subtle.importKey(
    'raw',
    saltBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, toBuffer(ikm)));
  
  const prkKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(prk),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const infoWithCounter = concat(info, new Uint8Array([1]));
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, toBuffer(infoWithCounter)));

  return okm.slice(0, length);
}

// Create Web Push encrypted payload (aes128gcm)
async function encryptPayload(
  plaintext: Uint8Array,
  p256dhKey: string,
  authKey: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  // Decode subscriber keys
  const subscriberPublicKey = base64urlDecode(p256dhKey);
  const subscriberAuthSecret = base64urlDecode(authKey);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export local public key in uncompressed format
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  );

  // Import subscriber public key
  const subscriberKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(subscriberPublicKey),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Create info string for IKM derivation
  const encoder = new TextEncoder();
  const keyInfoContext = concat(
    encoder.encode('WebPush: info\0'),
    subscriberPublicKey,
    localPublicKeyRaw
  );
  
  // IKM = HKDF(auth_secret, shared_secret, keyInfoContext, 32)
  const ikm = await hkdf(subscriberAuthSecret, sharedSecret, keyInfoContext, 32);

  // CEK = HKDF(salt, ikm, cekInfo, 16)
  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\0');
  const cek = await hkdf(salt, ikm, cekInfo, 16);

  // Nonce = HKDF(salt, ikm, nonceInfo, 12)
  const nonceInfo = encoder.encode('Content-Encoding: nonce\0');
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(cek),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Add padding delimiter (0x02 for final record)
  const paddedPlaintext = concat(plaintext, new Uint8Array([2]));

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBuffer(nonce) },
    aesKey,
    toBuffer(paddedPlaintext)
  );

  const ciphertext = new Uint8Array(encrypted);

  return { ciphertext, salt, localPublicKey: localPublicKeyRaw };
}

// Build aes128gcm header and body
function buildAes128gcmBody(
  salt: Uint8Array,
  localPublicKey: Uint8Array,
  ciphertext: Uint8Array
): Uint8Array {
  // Header: salt (16 bytes) + record size (4 bytes) + keyid length (1 byte) + keyid (65 bytes)
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false); // 4096 bytes max record size
  
  const keyIdLen = new Uint8Array([localPublicKey.length]);
  
  return concat(salt, recordSize, keyIdLen, localPublicKey, ciphertext);
}

// Normalize an ECDSA signature into JOSE (raw r||s) format.
// - Some runtimes return DER-encoded signatures.
// - Others (including some WebCrypto implementations) return raw r||s already.
function ecdsaSignatureToJose(sig: Uint8Array, partLength: number): Uint8Array {
  // Already JOSE
  if (sig.length === partLength * 2) return sig;

  // DER -> JOSE
  let offset = 0;

  if (sig[offset++] !== 0x30) {
    throw new Error('Invalid ECDSA signature format');
  }

  let seqLen = sig[offset++];
  if (seqLen & 0x80) {
    const lenBytes = seqLen & 0x7f;
    seqLen = 0;
    for (let i = 0; i < lenBytes; i++) {
      seqLen = (seqLen << 8) + sig[offset++];
    }
  }

  if (sig[offset++] !== 0x02) {
    throw new Error('Invalid DER signature (expected INTEGER for r)');
  }
  const rLen = sig[offset++];
  let r = sig.slice(offset, offset + rLen);
  offset += rLen;

  if (sig[offset++] !== 0x02) {
    throw new Error('Invalid DER signature (expected INTEGER for s)');
  }
  const sLen = sig[offset++];
  let s = sig.slice(offset, offset + sLen);

  // Trim any leading 0x00 used to force positive INTEGER values.
  while (r.length > partLength && r[0] === 0x00) r = r.slice(1);
  while (s.length > partLength && s[0] === 0x00) s = s.slice(1);

  if (r.length > partLength || s.length > partLength) {
    throw new Error('Invalid DER signature (r/s too long)');
  }

  const out = new Uint8Array(partLength * 2);
  out.set(r, partLength - r.length);
  out.set(s, partLength * 2 - s.length);
  return out;
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

  // VAPID keys are base64url (no padding). Decode robustly.
  const privateKeyBytes = base64urlDecode(vapidPrivateKey);
  const publicKeyBytes = base64urlDecode(vapidPublicKey);

  if (privateKeyBytes.length !== 32) {
    throw new Error(`Invalid VAPID private key length (expected 32 bytes, got ${privateKeyBytes.length})`);
  }
  if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
    throw new Error('Invalid VAPID public key format (expected uncompressed P-256 key)');
  }

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

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // IMPORTANT: Runtimes differ: some return DER-encoded ECDSA signatures, others return raw r||s already.
  const signatureRaw = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    )
  );

  const signatureJose = ecdsaSignatureToJose(signatureRaw, 32);
  const signatureB64 = base64urlEncode(signatureJose);

  return `${unsignedToken}.${signatureB64}`;
}

// Send web push notification with proper encryption
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
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    
    // Encrypt the payload
    const { ciphertext, salt, localPublicKey } = await encryptPayload(
      plaintext,
      p256dhKey,
      authKey
    );

    // Build the aes128gcm body
    const body = buildAes128gcmBody(salt, localPublicKey, ciphertext);

    // Parse the endpoint URL to get the audience (origin)
    const endpointUrl = new URL(endpoint);
    const audience = endpointUrl.origin;

    // Create VAPID JWT
    const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey, vapidPublicKey);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': body.length.toString(),
        'TTL': '86400',
        'Urgency': 'high',
        // Standard VAPID headers (works across push services incl. iOS)
        'Authorization': `WebPush ${jwt}`,
        'Crypto-Key': `p256ecdsa=${vapidPublicKey}`,
      },
      body: toBuffer(body),
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`Push sent successfully to ${endpoint.substring(0, 50)}...`);
      return { success: true, statusCode: response.status };
    } else if (response.status === 404 || response.status === 410) {
      // Subscription expired or invalid
      console.log(`Subscription expired: ${response.status}`);
      return { success: false, statusCode: response.status, error: 'Subscription expired' };
    } else {
      const errorText = await response.text();
      console.error(`Push failed with status ${response.status}: ${errorText}`);
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
    console.log('Payload:', JSON.stringify(payload));

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
        console.log(`Sending to endpoint: ${sub.endpoint.substring(0, 60)}...`);
        
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
    if (failedCount > 0) {
      console.log('Failed results:', results.filter(r => !r.success));
    }

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
