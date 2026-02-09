const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { redirect_uri } = await req.json();

    const clientId = Deno.env.get('DISCORD_CLIENT_ID');

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

    return new Response(
      JSON.stringify({ url: authUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating Discord auth URL:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate auth URL' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
