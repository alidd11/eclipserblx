import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, redirect_uri, code_verifier, user_id } = await req.json();

    if (!code || !redirect_uri || !code_verifier || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the caller is authenticated and matches user_id
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the user's JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user || user.id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - user mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = (Deno.env.get('ROBLOX_CLIENT_ID') ?? '').trim();
    const clientSecret = (Deno.env.get('ROBLOX_CLIENT_SECRET') ?? '').trim();

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Roblox OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://apis.roblox.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        code_verifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokens = await tokenResponse.json();

    // Get Roblox user info
    const userResponse = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to get Roblox user info' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const robloxUser = await userResponse.json();
    const robloxUserId = robloxUser.sub;
    const robloxUsername = robloxUser.preferred_username || robloxUser.name || `User${robloxUserId}`;

    if (!robloxUserId) {
      return new Response(
        JSON.stringify({ error: 'Could not determine Roblox user ID' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this Roblox account is already linked to another user
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('roblox_user_id', robloxUserId)
      .neq('user_id', user_id)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: 'This Roblox account is already linked to another user' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the user's profile with Roblox info
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        roblox_user_id: robloxUserId,
        roblox_username: robloxUsername,
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to link Roblox account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Roblox account linked: ${robloxUsername} (${robloxUserId}) -> user ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        roblox_user_id: robloxUserId,
        roblox_username: robloxUsername,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Roblox link callback error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
