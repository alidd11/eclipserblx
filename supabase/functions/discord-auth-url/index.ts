import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Whitelist of allowed redirect origins to prevent open redirects
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
    // Rate limit - prevent abuse of auth URL generation
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'discord-auth-url' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const redirect_uri = typeof body?.redirect_uri === 'string' ? body.redirect_uri.trim() : '';

    if (!redirect_uri) {
      return new Response(
        JSON.stringify({ error: 'redirect_uri is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate redirect_uri against whitelist to prevent open redirects
    if (!isValidRedirectUri(redirect_uri)) {
      console.error('[discord-auth-url] Rejected redirect_uri:', redirect_uri);
      return new Response(
        JSON.stringify({ error: 'Invalid redirect URI' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = (Deno.env.get('DISCORD_CLIENT_ID') ?? '').trim();

    if (!clientId) {
      console.error('DISCORD_CLIENT_ID not configured');
      return new Response(
        JSON.stringify({ error: 'Discord OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate CSRF state
    const state = crypto.randomUUID();

    const scope = encodeURIComponent('identify');
    const encodedRedirectUri = encodeURIComponent(redirect_uri);

    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${scope}&state=${state}`;

    console.log('[discord-auth-url] authUrl generated');

    return new Response(JSON.stringify({ url: authUrl, redirect_uri, state }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating Discord auth URL:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate auth URL' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
