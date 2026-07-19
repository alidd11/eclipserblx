import { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginSignupForm } from '@/components/auth/LoginSignupForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { ResetVerifyForm } from '@/components/auth/ResetVerifyForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'reset-verify' | 'verify';

const Auth = forwardRef<HTMLDivElement>(function Auth(_, ref) {
  usePageTracking({ pagePath: '/auth' });
  usePageMeta({ title: 'Sign In', description: 'Sign in or create an Eclipse account to buy Roblox assets, manage downloads and access seller tools.', canonicalPath: '/auth' });
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check for password reset flow
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') setMode('reset');

    // Store referral code if present and track clicks
    const refCode = searchParams.get('ref');
    if (refCode) {
      sessionStorage.setItem('pendingReferralCode', refCode);
      const trackClick = async () => {
        try {
          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('referral_code', refCode.toUpperCase())
            .single();
          if (referrerProfile) {
            await supabase.from('referral_clicks').insert({
              referral_code: refCode.toUpperCase(),
              referrer_id: referrerProfile.user_id,
              user_agent: navigator.userAgent.substring(0, 500),
            });
          }
        } catch (err) {
          console.error('Failed to track referral click:', err);
        }
      };
      trackClick();
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && mode !== 'reset') {
      // Honor ?next=<same-origin-path> so OAuth consent (and other flows) return the user to the original URL.
      const rawNext = searchParams.get('next');
      const safeNext = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';
      navigate(safeNext, { replace: true });
    }
  }, [user, navigate, mode, searchParams]);

  const getTitle = () => {
    switch (mode) {
      case 'signup': return t('auth.createAccount');
      case 'forgot': return t('auth.resetPassword');
      case 'reset': return t('auth.setNewPassword');
      case 'reset-verify': return t('auth.resetYourPassword');
      case 'verify': return t('auth.verifyYourEmail');
      default: return t('auth.welcomeBack');
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'signup': return t('auth.signUpDescription');
      case 'forgot': return t('auth.forgotDescription');
      case 'reset': return t('auth.resetDescription');
      case 'reset-verify': return `Enter the 4-digit code sent to ${email} and choose a new password`;
      case 'verify': return `Enter the 6-digit code sent to ${email}`;
      default: return t('auth.signInDescription');
    }
  };

  const footer = (mode === 'login' || mode === 'signup') ? (
    <p className="text-center text-sm text-muted-foreground">
      {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="text-primary hover:underline font-medium"
      >
        {mode === 'login' ? t('common.signUp') : t('common.signIn')}
      </button>
    </p>
  ) : undefined;

  return (
    <AuthLayout ref={ref} title={getTitle()} description={getDescription()} footer={footer}>
      {mode === 'forgot' && (
        <ForgotPasswordForm
          email={email}
          setEmail={setEmail}
          onBack={() => setMode('login')}
          onCodeSent={() => setMode('reset-verify')}
        />
      )}
      {mode === 'reset-verify' && (
        <ResetVerifyForm
          email={email}
          onSuccess={() => setMode('login')}
          onChangeEmail={() => setMode('forgot')}
        />
      )}
      {mode === 'reset' && <ResetPasswordForm />}
      {mode === 'verify' && (
        <VerifyEmailForm email={email} onBack={() => setMode('signup')} />
      )}
      {(mode === 'login' || mode === 'signup') && (
        <LoginSignupForm
          mode={mode}
          email={email}
          setEmail={setEmail}
          onForgotPassword={() => setMode('forgot')}
          onVerify={() => setMode('verify')}
          onToggleMode={() => setMode(mode === 'login' ? 'signup' : 'login')}
        />
      )}
    </AuthLayout>
  );
});

export default Auth;
