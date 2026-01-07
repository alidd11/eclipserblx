import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert ArrayBuffer to Base64 URL-safe string
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate ECDSA P-256 key pair for VAPID
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign', 'verify']
    );

    // Export the public key in raw format
    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const publicKeyBase64 = arrayBufferToBase64Url(publicKeyRaw);

    // Export the private key in PKCS8 format, then extract the raw 32-byte key
    const privateKeyPkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyBytes = new Uint8Array(privateKeyPkcs8);
    // The raw private key is the last 32 bytes of the PKCS8 structure for P-256
    const rawPrivateKey = privateKeyBytes.slice(-32);
    const privateKeyBase64 = arrayBufferToBase64Url(rawPrivateKey.buffer);

    const vapidKeys = {
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64,
      subject: 'mailto:admin@eclipse-marketplace.com',
      instructions: {
        step1: 'Copy the publicKey value and set it as VAPID_PUBLIC_KEY secret',
        step2: 'Copy the publicKey value and ALSO set it as VITE_VAPID_PUBLIC_KEY secret (for client-side)',
        step3: 'Copy the privateKey value and set it as VAPID_PRIVATE_KEY secret',
        step4: 'Set VAPID_SUBJECT to your email (mailto:your@email.com) or website URL',
      }
    };

    return new Response(JSON.stringify(vapidKeys, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error generating VAPID keys:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Failed to generate VAPID keys', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
