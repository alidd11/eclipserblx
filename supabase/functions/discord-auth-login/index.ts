import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string | null;
  verified: boolean;
  global_name: string | null;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

// Validate redirect_uri to prevent open redirect / SSRF
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limit - auth endpoints are sensitive
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'discord-auth-login' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const { code, redirect_uri } = await req.json();

    if (!code || typeof code !== 'string' || code.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Valid authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate redirect_uri
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const defaultRedirect = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth/discord/callback`;
    const safeRedirectUri = isValidRedirectUri(redirect_uri) ? redirect_uri : defaultRedirect;

    const clientId = Deno.env.get('DISCORD_CLIENT_ID');
    const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Discord credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Discord OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for tokens
    console.log('Exchanging code for Discord tokens...');
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: safeRedirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Discord token exchange failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Discord' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokens: DiscordTokenResponse = await tokenResponse.json();
    console.log('Discord tokens received, fetching user info...');

    // Get Discord user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch Discord user info');
      return new Response(
        JSON.stringify({ error: 'Failed to get Discord user info' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const discordUser: DiscordUser = await userResponse.json();

    // Validate Discord user data
    if (!discordUser.id || typeof discordUser.id !== 'string' || !/^\d{1,20}$/.test(discordUser.id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Discord user data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Discord user authenticated: ${discordUser.username} (${discordUser.id})`);

    // Initialize Supabase admin client
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if a profile exists with this Discord ID
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, email, discord_id')
      .eq('discord_id', discordUser.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking existing profile:', profileError);
    }

    let userId: string;
    let isNewUser = false;

    if (existingProfile?.user_id) {
      console.log(`Found existing user with Discord ID: ${existingProfile.user_id}`);
      userId = existingProfile.user_id;
    } else {
      if (discordUser.email) {
        const { data: emailProfile } = await supabase
          .from('profiles')
          .select('user_id, discord_id')
          .eq('email', discordUser.email)
          .maybeSingle();

        if (emailProfile?.user_id) {
          console.log(`Linking Discord to existing email account: ${emailProfile.user_id}`);
          userId = emailProfile.user_id;
          
          await supabase
            .from('profiles')
            .update({
              discord_id: discordUser.id,
              discord_username: discordUser.username,
            })
            .eq('user_id', userId);
        } else {
          isNewUser = true;
          console.log('Creating new user account...');
          
          const randomPassword = crypto.randomUUID() + crypto.randomUUID();
          
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: discordUser.email,
            password: randomPassword,
            email_confirm: true,
            user_metadata: {
              display_name: discordUser.global_name || discordUser.username,
              avatar_url: discordUser.avatar 
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                : null,
              discord_id: discordUser.id,
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

          const displayName = discordUser.global_name || discordUser.username;
          await supabase
            .from('profiles')
            .update({
              discord_id: discordUser.id,
              discord_username: discordUser.username,
              display_name: displayName,
              username: displayName,
              avatar_url: discordUser.avatar 
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                : null,
            })
            .eq('user_id', userId);
        }
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Discord account has no email. Please link your email to Discord or use email sign-up.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate a session for the user
    console.log(`Generating session for user: ${userId}`);
    
    const { data: profileForEmail } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .single();
    
    const userEmail = profileForEmail?.email || discordUser.email!;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: {
        redirectTo: safeRedirectUri,
      }
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

    // Verify the OTP to get a session
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
      const verifyError = await verifyResponse.text();
      console.error('Token verification failed:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const session = await verifyResponse.json();

    console.log('Discord auth successful, returning session');
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
        discordUser: {
          id: discordUser.id,
          username: discordUser.username,
          avatar: discordUser.avatar,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Discord auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
