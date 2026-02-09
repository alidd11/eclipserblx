const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const origin = req.headers.get('origin') ?? 'unknown';

    const body = await req.json().catch(() => ({}));
    const redirect_uri = typeof body?.redirect_uri === 'string' ? body.redirect_uri : '';

    console.log('[discord-auth-url] origin:', origin);
    console.log('[discord-auth-url] redirect_uri:', redirect_uri);

    if (!redirect_uri || !/^https?:\/\//i.test(redirect_uri)) {
      return new Response(
        JSON.stringify({ error: 'Invalid redirect_uri provided', redirect_uri }),
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

    const scope = encodeURIComponent('identify email');
    const encodedRedirectUri = encodeURIComponent(redirect_uri);

    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${scope}`;

    console.log('[discord-auth-url] authUrl generated');

    return new Response(JSON.stringify({ url: authUrl, redirect_uri }), {
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