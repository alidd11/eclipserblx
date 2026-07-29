import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AuthDiscordCallback() {
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
        console.error('Discord OAuth error:', errorParam, errorDescription);
        setError(errorDescription || t('authCallback.cancelledDiscord'));
        toast.error(t('authCallback.failed'), { description: errorDescription || t('authCallback.cancelledDiscord') });
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      if (!code) {
        setError(t('authCallback.noCode'));
        toast.error(t('authCallback.failed'), { description: t('authCallback.noCodeDiscord') });
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      // CSRF check
      const storedState = sessionStorage.getItem('discord_oauth_state');
      sessionStorage.removeItem('discord_oauth_state');
      const returnedState = searchParams.get('state');
      if (!storedState || !returnedState || returnedState !== storedState) {
        setError(t('authCallback.invalidLink'));
        toast.error(t('authCallback.failed'), { description: t('authCallback.invalidLinkShort') });
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
          setError(data?.error || t('authCallback.discordFailed'));
          toast.error(t('authCallback.failed'), { description: data?.error || t('authCallback.discordFailed') });
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
            setError(t('authCallback.sessionFailed'));
            toast.error(t('authCallback.failed'), { description: t('authCallback.sessionFailed') });
            setTimeout(() => navigate('/auth'), 3000);
            return;
          }

          // Success!
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

          // If new user and email is placeholder, go to complete-profile
          const userEmail = data.session.user?.email;
          if (data.isNewUser && (!userEmail || userEmail.endsWith('.placeholder.local'))) {
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
        console.error('Discord callback error:', err);
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
            <div className="h-16 w-16 mx-auto rounded-full bg-[hsl(var(--brand-discord))]/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-[hsl(var(--brand-discord))] animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">{t('authCallback.signingInDiscord')}</h1>
            <p className="text-muted-foreground">{t('authCallback.pleaseWait')}</p>
          </>
        )}
      </div>
    </div>
  );
}
