import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, redirect_uri } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirect_uri || `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/auth/discord/callback`,
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
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch Discord user info');
      return new Response(
        JSON.stringify({ error: 'Failed to get Discord user info' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const discordUser: DiscordUser = await userResponse.json();
    console.log(`Discord user authenticated: ${discordUser.username} (${discordUser.id})`);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
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
      // User exists - sign them in
      console.log(`Found existing user with Discord ID: ${existingProfile.user_id}`);
      userId = existingProfile.user_id;
    } else {
      // Check if Discord email is already used by another account
      if (discordUser.email) {
        const { data: emailProfile } = await supabase
          .from('profiles')
          .select('user_id, discord_id')
          .eq('email', discordUser.email)
          .maybeSingle();

        if (emailProfile?.user_id) {
          // Email exists - link Discord to this account
          console.log(`Linking Discord to existing email account: ${emailProfile.user_id}`);
          userId = emailProfile.user_id;
          
          // Update profile with Discord ID
          await supabase
            .from('profiles')
            .update({
              discord_id: discordUser.id,
              discord_username: discordUser.username,
            })
            .eq('user_id', userId);
        } else {
          // Create new user
          isNewUser = true;
          console.log('Creating new user account...');
          
          // Generate a random secure password (user won't need it for Discord login)
          const randomPassword = crypto.randomUUID() + crypto.randomUUID();
          
          // Create auth user
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: discordUser.email,
            password: randomPassword,
            email_confirm: true, // Discord already verified their email
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

          // Update the profile with Discord info (profile should be auto-created by trigger)
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
        // No email from Discord - can't create account
        return new Response(
          JSON.stringify({ 
            error: 'Discord account has no email. Please link your email to Discord or use email sign-up.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate a Supabase session for the user
    console.log(`Generating session for user: ${userId}`);
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: (await supabase.from('profiles').select('email').eq('user_id', userId).single()).data?.email || discordUser.email!,
    });

    if (sessionError || !sessionData) {
      console.error('Failed to generate session link:', sessionError);
      
      // Alternative: Create session directly using signInWithPassword won't work without password
      // Instead, we'll use the admin API to get a session token
      const { data: { user }, error: getUserError } = await supabase.auth.admin.getUserById(userId);
      
      if (getUserError || !user) {
        return new Response(
          JSON.stringify({ error: 'Failed to authenticate user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate custom tokens using admin API
      // We need to use a workaround - create a short-lived magic link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email!,
        options: {
          redirectTo: redirect_uri || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app'),
        }
      });

      if (linkError || !linkData) {
        console.error('Failed to generate magic link:', linkError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract the token from the link and verify it to get a session
      const linkUrl = new URL(linkData.properties?.hashed_token ? 
        `${supabaseUrl}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink` :
        linkData.properties?.action_link || '');
      
      // Use the token_hash to verify and get session
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
    }

    // This path uses the magic link token
    const tokenHash = sessionData.properties?.hashed_token;
    
    if (!tokenHash) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the token to get a session
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
      console.error('Verify failed:', verifyError);
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
