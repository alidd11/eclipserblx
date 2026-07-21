import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AuthRobloxCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        console.error('Roblox OAuth error:', errorParam, errorDescription);
        setError(errorDescription || 'Roblox authentication was cancelled');
        toast.error('Authentication Failed', { description: errorDescription || 'Roblox authentication was cancelled' });
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        toast.error('Authentication Failed', { description: 'No authorization code received from Roblox' });
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      // Check if this is an account linking callback (vs sign-in)
      const linkCodeVerifier = sessionStorage.getItem('roblox_link_code_verifier');
      const codeVerifier = sessionStorage.getItem('roblox_code_verifier');
      const storedState = sessionStorage.getItem('roblox_oauth_state');
      const isLinking = !!linkCodeVerifier;

      // Clean up session storage
      sessionStorage.removeItem('roblox_code_verifier');
      sessionStorage.removeItem('roblox_link_code_verifier');
      sessionStorage.removeItem('roblox_link_state');
      sessionStorage.removeItem('roblox_oauth_state');

      // CSRF check for the sign-in flow (linking has its own separate state check)
      if (!isLinking) {
        const returnedState = searchParams.get('state');
        if (!storedState || !returnedState || returnedState !== storedState) {
          setError('This sign-in link is invalid or has expired. Please try again.');
          toast.error('Authentication Failed', { description: 'This sign-in link is invalid or has expired.' });
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
      }

      const productionDomain = 'https://eclipserblx.com';
      const redirectUri = `${productionDomain}/auth/roblox/callback`;
      const verifier = isLinking ? linkCodeVerifier : codeVerifier;

      if (isLinking) {
        // Account linking flow
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            setError('You must be logged in to link your Roblox account');
            setTimeout(() => navigate('/account'), 3000);
            return;
          }

          const { data, error: invokeError } = await supabase.functions.invoke('roblox-link-callback', {
            body: {
              code,
              redirect_uri: redirectUri,
              code_verifier: verifier,
              user_id: user.id,
            },
          });

          if (invokeError) throw invokeError;
          if (data?.error) throw new Error(data.error);

          toast.success('Roblox Linked!', { description: `Connected as ${data.roblox_username}` });
          navigate('/account');
          return;
        } catch (err) {
          console.error('Roblox link callback error:', err);
          setError(err instanceof Error ? err.message : 'Failed to link Roblox account');
          setTimeout(() => navigate('/account'), 3000);
          return;
        }
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke('roblox-auth-login', {
          body: {
            code,
            redirect_uri: redirectUri,
            code_verifier: verifier,
          },
        });

        if (fnError || data?.error) {
          console.error('Roblox auth error:', fnError || data?.error);
          setError(data?.error || 'Failed to authenticate with Roblox');
          toast.error('Authentication Failed', { description: data?.error || 'Failed to authenticate with Roblox' });
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        if (data?.session) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (sessionError) {
            console.error('Failed to set session:', sessionError);
            setError('Failed to complete sign-in');
            toast.error('Authentication Failed', { description: 'Failed to complete sign-in' });
            setTimeout(() => navigate('/auth'), 3000);
            return;
          }

          toast.success(data.isNewUser ? 'Account Created!' : 'Welcome Back!', {
            description: data.isNewUser
              ? 'Your account has been created successfully.'
              : 'You have been signed in successfully.',
          });

          // Process pending referral if exists
          const pendingRefCode = sessionStorage.getItem('pendingReferralCode');
          if (pendingRefCode && data.isNewUser) {
            try {
              const { data: referrerProfile } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('referral_code', pendingRefCode.toUpperCase())
                .single();

              if (referrerProfile && data.session.user?.id) {
                await supabase.from('referrals').insert({
                  referrer_id: referrerProfile.user_id,
                  referred_id: data.session.user.id,
                  referral_code: pendingRefCode.toUpperCase(),
                  status: 'pending',
                });
              }
              sessionStorage.removeItem('pendingReferralCode');
            } catch (refError) {
              console.error('Referral processing error:', refError);
            }
          }

          // Roblox users always get placeholder emails — redirect to add real email
          if (data.isNewUser) {
            navigate('/complete-profile', { replace: true });
          } else {
            navigate('/');
          }
        } else {
          setError('No session received');
          toast.error('Authentication Failed', { description: 'No session received from server' });
          setTimeout(() => navigate('/auth'), 3000);
        }
      } catch (err) {
        console.error('Roblox callback error:', err);
        setError('An unexpected error occurred');
        toast.error('Authentication Failed', { description: 'An unexpected error occurred' });
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center safe-area-page">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-foreground">{error}</h1>
            <p className="text-muted-foreground">Redirecting to sign in...</p>
          </>
        ) : (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Signing in with Roblox</h1>
            <p className="text-muted-foreground">Please wait...</p>
          </>
        )}
      </div>
    </div>
  );
}
