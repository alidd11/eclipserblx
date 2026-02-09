import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AuthDiscordCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        console.error('Discord OAuth error:', errorParam, errorDescription);
        setError(errorDescription || 'Discord authentication was cancelled');
        toast({
          title: 'Authentication Failed',
          description: errorDescription || 'Discord authentication was cancelled',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        toast({
          title: 'Authentication Failed',
          description: 'No authorization code received from Discord',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      try {
        // Exchange code for session via edge function
        const { data, error: fnError } = await supabase.functions.invoke('discord-auth-login', {
          body: {
            code,
            redirect_uri: `${window.location.origin}/auth/discord/callback`,
          },
        });

        if (fnError || data?.error) {
          console.error('Discord auth error:', fnError || data?.error);
          setError(data?.error || 'Failed to authenticate with Discord');
          toast({
            title: 'Authentication Failed',
            description: data?.error || 'Failed to authenticate with Discord',
            variant: 'destructive',
          });
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        if (data?.session) {
          // Set the session in Supabase
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (sessionError) {
            console.error('Failed to set session:', sessionError);
            setError('Failed to complete sign-in');
            toast({
              title: 'Authentication Failed',
              description: 'Failed to complete sign-in',
              variant: 'destructive',
            });
            setTimeout(() => navigate('/auth'), 3000);
            return;
          }

          // Success!
          toast({
            title: data.isNewUser ? 'Account Created!' : 'Welcome Back!',
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

          navigate('/');
        } else {
          setError('No session received');
          toast({
            title: 'Authentication Failed',
            description: 'No session received from server',
            variant: 'destructive',
          });
          setTimeout(() => navigate('/auth'), 3000);
        }
      } catch (err) {
        console.error('Discord callback error:', err);
        setError('An unexpected error occurred');
        toast({
          title: 'Authentication Failed',
          description: 'An unexpected error occurred',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
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
            <div className="h-16 w-16 mx-auto rounded-full bg-[#5865F2]/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-[#5865F2] animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Signing in with Discord</h1>
            <p className="text-muted-foreground">Please wait...</p>
          </>
        )}
      </div>
    </div>
  );
}
