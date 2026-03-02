import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Whitelist of allowed redirect origins
const ALLOWED_REDIRECT_ORIGINS = [
  'https://eclipserblx.com',
  'https://www.eclipserblx.com',
  'http://localhost:5173',
  'http://localhost:8080',
];

function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    return ALLOWED_REDIRECT_ORIGINS.some(o => uri.startsWith(o)) ||
      parsed.hostname.endsWith('.lovable.app');
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'roblox-auth-url' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const redirect_uri = typeof body?.redirect_uri === 'string' ? body.redirect_uri.trim() : '';

    if (!redirect_uri) {
      return new Response(
        JSON.stringify({ error: 'redirect_uri is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate redirect_uri against whitelist
    if (!isValidRedirectUri(redirect_uri)) {
      console.error('[roblox-auth-url] Rejected redirect_uri:', redirect_uri);
      return new Response(
        JSON.stringify({ error: 'Invalid redirect URI' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = (Deno.env.get('ROBLOX_CLIENT_ID') ?? '').trim();

    if (!clientId) {
      console.error('ROBLOX_CLIENT_ID not configured');
      return new Response(
        JSON.stringify({ error: 'Roblox OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate CSRF state
    const state = crypto.randomUUID();

    // Generate PKCE code verifier and challenge
    const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const scope = encodeURIComponent('openid profile');
    const encodedRedirectUri = encodeURIComponent(redirect_uri);

    const authUrl = `https://apis.roblox.com/oauth/v1/authorize?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${scope}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    console.log('[roblox-auth-url] authUrl generated');

    return new Response(
      JSON.stringify({ url: authUrl, redirect_uri, state, code_verifier: codeVerifier }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating Roblox auth URL:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate auth URL' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
