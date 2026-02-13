import { useState, useEffect, forwardRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowLeft, CheckCircle, Eye, EyeOff, Mail, Check, X } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { PasswordStrengthMeter, isPasswordStrongEnough } from '@/components/auth/PasswordStrengthMeter';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTracking } from '@/hooks/usePageTracking';
import { lovable } from '@/integrations/lovable/index';
import { useTranslation } from 'react-i18next';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'reset-verify' | 'verify';

const Auth = forwardRef<HTMLDivElement>(function Auth(_, ref) {
  usePageTracking({ pagePath: '/auth' });
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; captcha?: string; otp?: string; tos?: string; displayName?: string; vpn?: string; social?: string }>({});
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [subscribeToEmails, setSubscribeToEmails] = useState(true);
  const [agreedToTos, setAgreedToTos] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for password reset flow (when user clicks reset link from email)
  // Also check for referral code and track clicks
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setMode('reset');
    }
    
    // Store referral code if present and track the click
    const refCode = searchParams.get('ref');
    if (refCode) {
      sessionStorage.setItem('pendingReferralCode', refCode);
      
      // Track the referral link click (fire and forget)
      const trackClick = async () => {
        try {
          // Find the referrer by their referral code
          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('referral_code', refCode.toUpperCase())
            .single();
          
          if (referrerProfile) {
            // Record the click
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
      navigate('/');
    }
  }, [user, navigate, mode]);

  // Real-time username availability check
  useEffect(() => {
    const trimmed = displayName.trim();
    if (mode !== 'signup' || !trimmed || trimmed.length < 6 || trimmed.length > 20) {
      setUsernameAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const { data: isAvailable } = await supabase.rpc('is_username_available', {
          username: displayName.trim()
        });
        setUsernameAvailable(isAvailable ?? false);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [displayName, mode]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setErrors({ email: result.error.errors[0].message });
      return;
    }

    setLoading(true);

    try {
      const response = await supabase.functions.invoke('custom-password-reset/request', {
        body: { email },
      });

      if (response.error) {
        toast({
          title: t('common.error'),
          description: 'Failed to send reset email. Please try again.',
          variant: 'destructive',
        });
      } else {
        setMode('reset-verify');
        toast({
          title: t('auth.checkYourEmail'),
          description: 'We sent you a 4-digit verification code.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (otpCode.length !== 4) {
      setErrors({ otp: 'Please enter the complete 4-digit code' });
      return;
    }

    if (password.length < 6) {
      setErrors({ password: t('auth.passwordRequirements') });
      return;
    }

    if (!isPasswordStrongEnough(password)) {
      setErrors({ password: t('auth.strongerPassword') });
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setLoading(true);

    try {
      const response = await supabase.functions.invoke('custom-password-reset/verify', {
        body: { 
          email, 
          code: otpCode, 
          newPassword: password 
        },
      });

      if (response.error || response.data?.error) {
        const errorMessage = response.data?.error || 'Invalid or expired code';
        if (errorMessage.includes('expired')) {
          setErrors({ otp: 'Code has expired. Please request a new one.' });
        } else if (errorMessage.includes('Invalid')) {
          setErrors({ otp: 'Invalid code. Please check and try again.' });
        } else {
          toast({
            title: t('common.error'),
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: t('auth.passwordUpdated'),
          description: t('auth.passwordResetSuccess') + ' ' + t('auth.pleaseSignIn'),
        });
        setMode('login');
        setOtpCode('');
        setPassword('');
        setConfirmPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('custom-password-reset/request', {
        body: { email },
      });

      if (response.error) {
        toast({
          title: t('common.error'),
          description: 'Failed to resend code. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('auth.codeSent'),
          description: t('auth.newCodeSent'),
        });
        setOtpCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (password.length < 6) {
      setErrors({ password: t('auth.passwordRequirements') });
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          title: t('common.error'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('auth.passwordUpdated'),
          description: t('auth.passwordResetSuccess'),
        });
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (mode === 'signup' && !isPasswordStrongEnough(password)) {
      setErrors({ password: t('auth.strongerPassword') });
      return;
    }

    if (mode === 'signup') {
      const trimmedUsername = displayName.trim();
      if (!trimmedUsername) {
        setErrors({ displayName: t('auth.usernameRequired') });
        return;
      }
      if (trimmedUsername.length < 6) {
        setErrors({ displayName: 'Username must be at least 6 characters' });
        return;
      }
      if (trimmedUsername.length > 20) {
        setErrors({ displayName: 'Username must be 20 characters or less' });
        return;
      }
    }

    if (mode === 'signup') {
      const { data: isAvailable } = await supabase.rpc('is_username_available', { 
        username: displayName.trim() 
      });
      if (!isAvailable) {
        setErrors({ displayName: t('auth.usernameTaken') });
        return;
      }
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    if (mode === 'signup' && !captchaVerified) {
      setErrors({ captcha: t('auth.captchaRequired') });
      return;
    }

    if (mode === 'signup' && !agreedToTos) {
      setErrors({ tos: 'You must agree to the Terms of Service to create an account' });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        try {
          const { data: vpnData, error: vpnError } = await supabase.functions.invoke('check-vpn');
          
          if (!vpnError && vpnData?.isVpn) {
            setLoading(false);
            setErrors({ vpn: t('auth.vpnDetected') });
            toast({
              title: 'VPN Detected',
              description: t('auth.vpnDetected'),
              variant: 'destructive',
            });
            return;
          }
        } catch (vpnCheckError) {
          console.error('VPN check error:', vpnCheckError);
        }
      }

      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: t('auth.loginFailed'),
              description: t('auth.invalidCredentials'),
              variant: 'destructive',
            });
          } else {
            toast({
              title: t('auth.loginFailed'),
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, displayName || undefined);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: t('auth.accountExists'),
              description: t('auth.accountExistsDesc'),
              variant: 'destructive',
            });
          } else {
            toast({
              title: t('auth.signUpFailed'),
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          if (subscribeToEmails) {
            sessionStorage.setItem('pendingEmailSubscription', 'true');
          }
          toast({
            title: t('auth.checkYourEmail'),
            description: 'We sent you a 6-digit verification code.',
          });
          setMode('verify');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (otpCode.length !== 6) {
      setErrors({ otp: 'Please enter the complete 6-digit code' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup',
      });

      if (error) {
        if (error.message.includes('expired')) {
          setErrors({ otp: 'Code has expired. Please request a new one.' });
        } else if (error.message.includes('invalid')) {
          setErrors({ otp: 'Invalid code. Please check and try again.' });
        } else {
          toast({
            title: 'Verification Failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        const pendingRefCode = sessionStorage.getItem('pendingReferralCode');
        if (pendingRefCode) {
          sessionStorage.removeItem('pendingReferralCode');
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            try {
              const { data: referrerProfile } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('referral_code', pendingRefCode.toUpperCase())
                .single();
              
              if (referrerProfile) {
                await supabase.from('referrals').insert({
                  referrer_id: referrerProfile.user_id,
                  referred_id: session.user.id,
                  referral_code: pendingRefCode.toUpperCase(),
                  status: 'pending',
                });
              }
            } catch (refError) {
              console.error('Referral processing error:', refError);
            }
          }
        }
        
        toast({
          title: t('auth.emailVerified'),
          description: t('auth.accountVerified'),
        });
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        toast({
          title: t('common.error'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('auth.codeSent'),
          description: t('auth.newCodeSent'),
        });
        setOtpCode('');
      }
    } finally {
    setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading(true);
    setErrors({});
    try {
      const result = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({
          title: 'Apple Sign-In Failed',
          description: result.error.message || 'Failed to sign in with Apple',
          variant: 'destructive',
        });
        setErrors({ social: result.error.message || 'Apple sign-in failed' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Apple Sign-In Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setErrors({ social: errorMessage });
    } finally {
      setSocialLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading(true);
    setErrors({});
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({
          title: 'Google Sign-In Failed',
          description: result.error.message || 'Failed to sign in with Google',
          variant: 'destructive',
        });
        setErrors({ social: result.error.message || 'Google sign-in failed' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Google Sign-In Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setErrors({ social: errorMessage });
    } finally {
      setSocialLoading(false);
    }
  };

  const handleDiscordSignIn = async () => {
    setSocialLoading(true);
    setErrors({});
    
    try {
      const productionDomain = 'https://eclipserblx.com';
      const currentOrigin = window.location.origin;
      const baseUrl = currentOrigin.startsWith('https://') ? currentOrigin : productionDomain;
      const redirectUri = `${baseUrl}/auth/discord/callback`;
      
      const { data, error } = await supabase.functions.invoke('discord-auth-url', {
        body: { redirect_uri: redirectUri },
      });
      
      if (error || data?.error) {
        toast({
          title: 'Discord Sign-In Failed',
          description: data?.error || 'Failed to initiate Discord sign-in',
          variant: 'destructive',
        });
        setErrors({ social: data?.error || 'Discord sign-in failed' });
        setSocialLoading(false);
        return;
      }
      
      window.location.href = data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      toast({
        title: 'Discord Sign-In Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setErrors({ social: errorMessage });
      setSocialLoading(false);
    }
  };

  const handleRobloxSignIn = async () => {
    setSocialLoading(true);
    setErrors({});
    
    try {
      const productionDomain = 'https://eclipserblx.com';
      const currentOrigin = window.location.origin;
      const baseUrl = currentOrigin.startsWith('https://') ? currentOrigin : productionDomain;
      const redirectUri = `${baseUrl}/auth/roblox/callback`;
      
      const { data, error } = await supabase.functions.invoke('roblox-auth-url', {
        body: { redirect_uri: redirectUri },
      });
      
      if (error || data?.error) {
        toast({
          title: 'Roblox Sign-In Failed',
          description: data?.error || 'Failed to initiate Roblox sign-in',
          variant: 'destructive',
        });
        setErrors({ social: data?.error || 'Roblox sign-in failed' });
        setSocialLoading(false);
        return;
      }
      
      if (data.code_verifier) {
        sessionStorage.setItem('roblox_code_verifier', data.code_verifier);
      }
      
      window.location.href = data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      toast({
        title: 'Roblox Sign-In Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setErrors({ social: errorMessage });
      setSocialLoading(false);
    }
  };

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

  return (
    <div ref={ref} className="min-h-screen bg-background overflow-y-auto">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="min-h-screen flex items-center justify-center p-4 pt-[max(2rem,env(safe-area-inset-top))] pb-8 sm:py-12 relative">
        <div className="w-full max-w-md space-y-6">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.backToStore')}
          </Link>

          {/* Header */}
          <div className="text-center">
            <div className="inline-flex h-12 w-12 rounded-lg gradient-button items-center justify-center mb-4">
              <span className="text-white font-display font-bold text-lg">UK</span>
            </div>
            <h1 className="font-display text-2xl font-bold">{getTitle()}</h1>
            <p className="text-muted-foreground mt-2">{getDescription()}</p>
          </div>

          {/* Forgot Password - Email Entry */}
          {mode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="gaming-card p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input"
                  required
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gradient-button border-0"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.sendVerificationCode')}
              </Button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                {t('auth.backToSignIn')}
              </button>
            </form>
          ) : mode === 'reset-verify' ? (
            /* Password Reset OTP Verification + New Password Form */
            <form onSubmit={handleVerifyResetCode} className="gaming-card p-6 space-y-6">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={4}
                    value={otpCode}
                    onChange={(value) => setOtpCode(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {errors.otp && (
                  <p className="text-sm text-destructive text-center">{errors.otp}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmNewPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-input pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gradient-button border-0"
                disabled={loading || otpCode.length !== 4}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.resetPassword')}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('auth.didntReceiveCode')}
                </p>
                <button
                  type="button"
                  onClick={handleResendResetCode}
                  disabled={loading}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  {t('auth.resendCode')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setMode('forgot'); setOtpCode(''); setPassword(''); setConfirmPassword(''); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                {t('auth.useDifferentEmail')}
              </button>
            </form>
          ) : mode === 'reset' ? (
            /* Reset Password Form (legacy - for magic link flow if needed) */
            <form onSubmit={handleResetPassword} className="gaming-card p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmNewPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-input pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gradient-button border-0"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.updatePassword')}
              </Button>
            </form>
          ) : mode === 'verify' ? (
            /* OTP Verification Form */
            <form onSubmit={handleVerifyOtp} className="gaming-card p-6 space-y-6">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(value) => setOtpCode(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {errors.otp && (
                  <p className="text-sm text-destructive text-center">{errors.otp}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gradient-button border-0"
                disabled={loading || otpCode.length !== 6}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.verifyEmail')}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('auth.didntReceiveCode')}
                </p>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  {t('auth.resendCode')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setMode('signup'); setOtpCode(''); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                {t('common.back')} to {t('common.signUp')}
              </button>
            </form>
          ) : (
            /* Login/Signup Form */
            <form onSubmit={handleSubmit} className="gaming-card p-6 space-y-6">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">{t('auth.username')}</Label>
                  <div className="relative">
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Choose a username"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-input pr-10"
                      required
                    />
                    {displayName.trim().length >= 6 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : usernameAvailable === true ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : usernameAvailable === false ? (
                          <X className="h-4 w-4 text-destructive" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {usernameAvailable === true && displayName.trim().length >= 6 && (
                    <p className="text-sm text-green-500">{t('auth.usernameAvailable')}</p>
                  )}
                  {usernameAvailable === false && displayName.trim().length >= 6 && (
                    <p className="text-sm text-destructive">{t('auth.usernameTaken')}</p>
                  )}
                  {errors.displayName && (
                    <p className="text-sm text-destructive">{errors.displayName}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input"
                  required
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-primary hover:underline"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={showPassword ? 'eye-off' : 'eye'}
                        initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
                        transition={{ duration: 0.15 }}
                        className="block"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </div>
                {mode === 'signup' && <PasswordStrengthMeter password={password} />}
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-input pr-20"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {confirmPassword.length > 0 && password.length > 0 && (
                        confirmPassword === password ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={showConfirmPassword ? 'eye-off' : 'eye'}
                            initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
                            transition={{ duration: 0.15 }}
                            className="block"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </motion.span>
                        </AnimatePresence>
                      </button>
                    </div>
                  </div>
                  {confirmPassword.length > 0 && password.length > 0 && (
                    confirmPassword === password ? (
                      <p className="text-sm text-green-500">Passwords match</p>
                    ) : (
                      <p className="text-sm text-destructive">Passwords do not match</p>
                    )
                  )}
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-4">
                  {/* Captcha */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 p-4 border border-border rounded-lg bg-muted/30">
                      <Checkbox
                        id="captcha"
                        checked={captchaVerified}
                        onCheckedChange={(checked) => setCaptchaVerified(checked === true)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label 
                        htmlFor="captcha" 
                        className="text-sm font-normal cursor-pointer select-none"
                      >
                        I'm not a robot
                      </Label>
                    </div>
                    {errors.captcha && (
                      <p className="text-sm text-destructive">{errors.captcha}</p>
                    )}
                  </div>

                  {/* Email Subscription */}
                  <div className="flex items-start space-x-3 p-4 border border-border rounded-lg bg-muted/30">
                    <Checkbox
                      id="emailSubscription"
                      checked={subscribeToEmails}
                      onCheckedChange={(checked) => setSubscribeToEmails(checked === true)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
                    />
                    <Label 
                      htmlFor="emailSubscription" 
                      className="text-sm font-normal cursor-pointer select-none leading-relaxed"
                    >
                      {t('auth.subscribeEmails')}
                    </Label>
                  </div>

                  {/* Terms of Service */}
                  <div className="space-y-2">
                    <div className="flex items-start space-x-3 p-4 border border-border rounded-lg bg-muted/30">
                      <Checkbox
                        id="tos"
                        checked={agreedToTos}
                        onCheckedChange={(checked) => setAgreedToTos(checked === true)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
                      />
                      <Label 
                        htmlFor="tos" 
                        className="text-sm font-normal cursor-pointer select-none leading-relaxed"
                      >
                        {t('auth.agreeToTerms')}{' '}
                        <Link 
                          to="/terms-of-service" 
                          target="_blank"
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('auth.termsOfService')}
                        </Link>{' '}
                        {t('auth.and')}{' '}
                        <Link 
                          to="/privacy-policy" 
                          target="_blank"
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('auth.privacyPolicy')}
                        </Link>
                      </Label>
                    </div>
                    {errors.tos && (
                      <p className="text-sm text-destructive">{errors.tos}</p>
                    )}
                  </div>

                  {/* VPN Error */}
                  {errors.vpn && (
                    <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
                      <p className="text-sm text-destructive font-medium">{errors.vpn}</p>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full gradient-button border-0"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'login' ? t('common.signIn') : t('auth.createAccount')}
              </Button>

              {/* Social Login Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
                </div>
              </div>

              {/* Discord Sign-In Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white border-0"
                disabled={socialLoading || loading}
                onClick={handleDiscordSignIn}
              >
                {socialLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                )}
                {t('auth.continueWithDiscord')}
              </Button>

              {/* Roblox Sign-In Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full bg-[#E2231A] hover:bg-[#C01E17] text-white border-0"
                disabled={socialLoading || loading}
                onClick={handleRobloxSignIn}
              >
                {socialLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.164 0L.16 18.928 18.836 24l5.004-18.928L5.164 0zm7.17 15.107l-3.438-.906.906-3.437 3.438.906-.906 3.437z"/>
                  </svg>
                )}
                {t('auth.continueWithRoblox')}
              </Button>

              {/* Apple Sign-In Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full bg-black hover:bg-black/90 text-white border-0"
                disabled={socialLoading || loading}
                onClick={handleAppleSignIn}
              >
                {socialLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                )}
                {t('auth.continueWithApple')}
              </Button>

              {/* Google Sign-In Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
                disabled={socialLoading || loading}
                onClick={handleGoogleSignIn}
              >
                {socialLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {t('auth.continueWithGoogle')}
              </Button>

              {errors.social && (
                <p className="text-sm text-destructive text-center">{errors.social}</p>
              )}
            </form>
          )}

          {/* Toggle */}
          {(mode === 'login' || mode === 'signup') && (
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
          )}
        </div>
      </div>
    </div>
  );
});

export default Auth;
