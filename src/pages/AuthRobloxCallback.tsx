import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AuthRobloxCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        console.error('Roblox OAuth error:', errorParam, errorDescription);
        setError(errorDescription || t('authCallback.cancelledRoblox'));
        toast.error(t('authCallback.failed'), { description: errorDescription || t('authCallback.cancelledRoblox') });
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      if (!code) {
        setError(t('authCallback.noCode'));
        toast.error(t('authCallback.failed'), { description: t('authCallback.noCodeRoblox') });
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
          setError(t('authCallback.invalidLink'));
          toast.error(t('authCallback.failed'), { description: t('authCallback.invalidLinkShort') });
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
            setError(t('authCallback.robloxLoginRequired'));
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

          toast.success(t('authCallback.robloxLinked'), { description: t('authCallback.robloxLinkedDesc', { username: data.roblox_username }) });
          navigate('/account');
          return;
        } catch (err) {
          console.error('Roblox link callback error:', err);
          setError(err instanceof Error ? err.message : t('authCallback.robloxLinkFailed'));
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
          setError(data?.error || t('authCallback.robloxFailed'));
          toast.error(t('authCallback.failed'), { description: data?.error || t('authCallback.robloxFailed') });
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
            setError(t('authCallback.sessionFailed'));
            toast.error(t('authCallback.failed'), { description: t('authCallback.sessionFailed') });
            setTimeout(() => navigate('/auth'), 3000);
            return;
          }

          toast.success(data.isNewUser ? t('authCallback.accountCreated') : t('authCallback.welcomeBack'), {
            description: data.isNewUser
              ? t('authCallback.accountCreatedDesc')
              : t('authCallback.welcomeBackDesc'),
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
          setError(t('authCallback.noSession'));
          toast.error(t('authCallback.failed'), { description: t('authCallback.noSessionDesc') });
          setTimeout(() => navigate('/auth'), 3000);
        }
      } catch (err) {
        console.error('Roblox callback error:', err);
        setError(t('authCallback.unexpected'));
        toast.error(t('authCallback.failed'), { description: t('authCallback.unexpected') });
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, t]);

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
            <p className="text-muted-foreground">{t('authCallback.redirecting')}</p>
          </>
        ) : (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">{t('authCallback.signingInRoblox')}</h1>
            <p className="text-muted-foreground">{t('authCallback.pleaseWait')}</p>
          </>
        )}
      </div>
    </div>
  );
}
