import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'roblox-link-callback' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const { code, redirect_uri, code_verifier, user_id } = await req.json();

    // Input validation
    if (!code || typeof code !== 'string' || code.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Valid authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!redirect_uri || typeof redirect_uri !== 'string' || redirect_uri.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Valid redirect URI is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!code_verifier || typeof code_verifier !== 'string' || code_verifier.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Valid code verifier is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_id || typeof user_id !== 'string' || !UUID_REGEX.test(user_id)) {
      return new Response(
        JSON.stringify({ error: 'Valid user ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the caller is authenticated and matches user_id
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the user's JWT matches user_id
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
      console.error('Token exchange failed:', tokenResponse.status);
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

    // Validate Roblox user ID
    if (!robloxUserId || typeof robloxUserId !== 'string' || !/^\d{1,20}$/.test(robloxUserId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Roblox user data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const robloxUsername = (robloxUser.preferred_username || robloxUser.name || `User${robloxUserId}`).slice(0, 100);

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
