import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

function isValidRedirectUri(uri: string | undefined | null): boolean {
  if (!uri || typeof uri !== 'string') return false;
  try {
    const parsed = new URL(uri);
    return ALLOWED_REDIRECT_ORIGINS.some(o => uri.startsWith(o)) ||
      parsed.hostname.endsWith('.lovable.app');
  } catch {
    return false;
  }
}

interface RobloxTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope: string;
}

interface RobloxUserInfo {
  sub: string;
  name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limit - auth endpoints are critical
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'roblox-auth-login' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const { code, redirect_uri, code_verifier } = await req.json();

    // Input validation
    if (!code || typeof code !== 'string' || code.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Valid authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (code_verifier && (typeof code_verifier !== 'string' || code_verifier.length > 500)) {
      return new Response(
        JSON.stringify({ error: 'Invalid code verifier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate redirect_uri
    const safeRedirectUri = isValidRedirectUri(redirect_uri) ? redirect_uri : '';

    const clientId = Deno.env.get('ROBLOX_CLIENT_ID');
    const clientSecret = Deno.env.get('ROBLOX_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Roblox credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Roblox OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for tokens
    console.log('Exchanging code for Roblox tokens...');
    const tokenParams: Record<string, string> = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: safeRedirectUri,
    };

    if (code_verifier) {
      tokenParams.code_verifier = code_verifier;
    }

    const tokenResponse = await fetch('https://apis.roblox.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
    });

    if (!tokenResponse.ok) {
      console.error('Roblox token exchange failed:', tokenResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Roblox' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokens: RobloxTokenResponse = await tokenResponse.json();
    console.log('Roblox tokens received, fetching user info...');

    // Get Roblox user info
    const userResponse = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch Roblox user info');
      return new Response(
        JSON.stringify({ error: 'Failed to get Roblox user info' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const robloxUser: RobloxUserInfo = await userResponse.json();
    const robloxUserId = robloxUser.sub;

    // Validate Roblox user ID
    if (!robloxUserId || typeof robloxUserId !== 'string' || !/^\d{1,20}$/.test(robloxUserId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Roblox user data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const robloxUsername = (robloxUser.preferred_username || robloxUser.nickname || robloxUser.name || `roblox_${robloxUserId}`).slice(0, 100);
    const robloxDisplayName = (robloxUser.name || robloxUsername).slice(0, 100);
    const robloxAvatar = robloxUser.picture || `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxUserId}&width=150&height=150&format=png`;

    console.log(`Roblox user authenticated: ${robloxUsername} (${robloxUserId})`);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if a profile exists with this Roblox user ID
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, email, roblox_user_id')
      .eq('roblox_user_id', robloxUserId)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking existing profile:', profileError);
    }

    let userId: string;
    let isNewUser = false;

    if (existingProfile?.user_id) {
      console.log(`Found existing user with Roblox ID: ${existingProfile.user_id}`);
      userId = existingProfile.user_id;
    } else {
      isNewUser = true;
      console.log('Creating new user account for Roblox user...');

      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const placeholderEmail = `roblox_${robloxUserId}@roblox.placeholder.local`;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: placeholderEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          display_name: robloxDisplayName,
          avatar_url: robloxAvatar,
          roblox_user_id: robloxUserId,
        },
      });

      if (authError) {
        console.error('Failed to create auth user:', authError);
        return new Response(
          JSON.stringify({ error: 'Failed to create account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = authData.user.id;
      console.log(`Created new auth user: ${userId}`);

      await supabase
        .from('profiles')
        .update({
          roblox_user_id: robloxUserId,
          roblox_username: robloxUsername,
          display_name: robloxDisplayName,
          username: robloxUsername,
          avatar_url: robloxAvatar,
          email: placeholderEmail,
        })
        .eq('user_id', userId);
    }

    // Generate a Supabase session
    console.log(`Generating session for user: ${userId}`);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .single();

    const userEmail = profileData?.email;
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve user email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });

    if (linkError || !linkData) {
      console.error('Failed to generate magic link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate authentication token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({
        type: 'magiclink',
        token_hash: tokenHash,
      }),
    });

    if (!verifyResponse.ok) {
      console.error('Token verification failed');
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const session = await verifyResponse.json();

    console.log('Roblox auth successful, returning session');
    return new Response(
      JSON.stringify({
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          token_type: session.token_type || 'bearer',
          user: session.user,
        },
        isNewUser,
        robloxUser: {
          id: robloxUserId,
          username: robloxUsername,
          displayName: robloxDisplayName,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Roblox auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
