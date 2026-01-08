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

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'verify' | 'reset-verify';

const Auth = forwardRef<HTMLDivElement>(function Auth(_, ref) {
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
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; captcha?: string; otp?: string; tos?: string; displayName?: string; vpn?: string }>({});
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [subscribeToEmails, setSubscribeToEmails] = useState(true);
  const [agreedToTos, setAgreedToTos] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for password reset flow (when user clicks reset link from email)
  // Also check for referral code
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setMode('reset');
    }
    
    // Store referral code if present
    const refCode = searchParams.get('ref');
    if (refCode) {
      sessionStorage.setItem('pendingReferralCode', refCode);
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
      // Use custom password reset endpoint
      const response = await supabase.functions.invoke('custom-password-reset/request', {
        body: { email },
      });

      if (response.error) {
        toast({
          title: 'Error',
          description: 'Failed to send reset email. Please try again.',
          variant: 'destructive',
        });
      } else {
        // Move to OTP verification mode
        setMode('reset-verify');
        toast({
          title: 'Check Your Email',
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
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    if (!isPasswordStrongEnough(password)) {
      setErrors({ password: 'Please choose a stronger password (good or strong)' });
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
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Password Updated!',
          description: 'Your password has been reset successfully. Please sign in.',
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
          title: 'Error',
          description: 'Failed to resend code. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Code Sent!',
          description: 'A new verification code has been sent to your email.',
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
      setErrors({ password: 'Password must be at least 6 characters' });
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
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Password Updated!',
          description: 'Your password has been reset successfully.',
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

    // Enforce minimum password strength on signup
    if (mode === 'signup' && !isPasswordStrongEnough(password)) {
      setErrors({ password: 'Please choose a stronger password (good or strong)' });
      return;
    }

    // Validate username on signup (required and 6-20 characters)
    if (mode === 'signup') {
      const trimmedUsername = displayName.trim();
      if (!trimmedUsername) {
        setErrors({ displayName: 'Username is required' });
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

    // Check username availability on signup
    if (mode === 'signup') {
      const { data: isAvailable } = await supabase.rpc('is_username_available', { 
        username: displayName.trim() 
      });
      if (!isAvailable) {
        setErrors({ displayName: 'This username is already taken' });
        return;
      }
    }

    // Validate password confirmation on signup
    if (mode === 'signup' && password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    if (mode === 'signup' && !captchaVerified) {
      setErrors({ captcha: 'Please verify that you are not a robot' });
      return;
    }

    // Verify TOS agreement on signup
    if (mode === 'signup' && !agreedToTos) {
      setErrors({ tos: 'You must agree to the Terms of Service to create an account' });
      return;
    }

    setLoading(true);

    try {
      // Check for VPN on signup
      if (mode === 'signup') {
        try {
          const { data: vpnData, error: vpnError } = await supabase.functions.invoke('check-vpn');
          
          if (!vpnError && vpnData?.isVpn) {
            setLoading(false);
            setErrors({ vpn: 'VPN or proxy detected. Please disable your VPN to create an account.' });
            toast({
              title: 'VPN Detected',
              description: 'Sign ups are not allowed while using a VPN or proxy. Please disable it and try again.',
              variant: 'destructive',
            });
            return;
          }
        } catch (vpnCheckError) {
          console.error('VPN check error:', vpnCheckError);
          // Continue with signup if VPN check fails (fail open)
        }
      }

      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Login Failed',
              description: 'Invalid email or password. Please try again.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Login Failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Welcome back!',
            description: 'You have successfully signed in.',
          });
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, displayName || undefined);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account Exists',
              description: 'An account with this email already exists. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign Up Failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          // Create email subscription if opted in
          if (subscribeToEmails) {
            // We'll create the subscription after email verification when the user is logged in
            // Store the preference in sessionStorage to apply after verification
            sessionStorage.setItem('pendingEmailSubscription', 'true');
          }
          toast({
            title: 'Check Your Email',
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
        // Process pending referral if exists
        const pendingRefCode = sessionStorage.getItem('pendingReferralCode');
        if (pendingRefCode) {
          sessionStorage.removeItem('pendingReferralCode');
          // Get the new user's ID from current session
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            try {
              // Find the referrer by their referral code
              const { data: referrerProfile } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('referral_code', pendingRefCode.toUpperCase())
                .single();
              
              if (referrerProfile) {
                // Create the referral record
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
          title: 'Email Verified!',
          description: 'Your account has been verified successfully.',
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
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Code Sent!',
          description: 'A new verification code has been sent to your email.',
        });
        setOtpCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Create Account';
      case 'forgot': return 'Reset Password';
      case 'reset': return 'Set New Password';
      case 'reset-verify': return 'Reset Your Password';
      case 'verify': return 'Verify Your Email';
      default: return 'Welcome Back';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'signup': return 'Join UK Roleplay Assets to start shopping';
      case 'forgot': return 'Enter your email and we\'ll send you a verification code';
      case 'reset': return 'Enter your new password below';
      case 'reset-verify': return `Enter the 4-digit code sent to ${email} and choose a new password`;
      case 'verify': return `Enter the 6-digit code sent to ${email}`;
      default: return 'Sign in to access your purchases and account';
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
            Back to store
          </Link>

          {/* Header */}
          <div className="text-center">
            <div className="inline-flex h-12 w-12 rounded-xl gradient-button items-center justify-center mb-4">
              <span className="text-white font-display font-bold text-lg">UK</span>
            </div>
            <h1 className="font-display text-2xl font-bold">{getTitle()}</h1>
            <p className="text-muted-foreground mt-2">{getDescription()}</p>
          </div>

          {/* Forgot Password - Email Entry */}
          {mode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="gaming-card p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                Send Verification Code
              </Button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back to Sign In
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
                <Label htmlFor="password">New Password</Label>
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
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
                disabled={loading || otpCode.length !== 6}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?
                </p>
                <button
                  type="button"
                  onClick={handleResendResetCode}
                  disabled={loading}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  Resend Code
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setMode('forgot'); setOtpCode(''); setPassword(''); setConfirmPassword(''); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Use a different email
              </button>
            </form>
          ) : mode === 'reset' ? (
            /* Reset Password Form (legacy - for magic link flow if needed) */
            <form onSubmit={handleResetPassword} className="gaming-card p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
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
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
                Update Password
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
                Verify Email
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?
                </p>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  Resend Code
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setMode('signup'); setOtpCode(''); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back to Sign Up
              </button>
            </form>
          ) : (
            /* Login/Signup Form */
            <form onSubmit={handleSubmit} className="gaming-card p-6 space-y-6">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Username</Label>
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
                    <p className="text-sm text-green-500">This username is available</p>
                  )}
                  {usernameAvailable === false && displayName.trim().length >= 6 && (
                    <p className="text-sm text-destructive">This username is already taken</p>
                  )}
                  {errors.displayName && (
                    <p className="text-sm text-destructive">{errors.displayName}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                  <Label htmlFor="password">Password</Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
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
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                      Subscribe to receive product updates, exclusive discount codes, and special offers
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
                        I agree to the{' '}
                        <Link 
                          to="/terms-of-service" 
                          target="_blank"
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link 
                          to="/privacy-policy" 
                          target="_blank"
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Privacy Policy
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
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          )}

          {/* Toggle */}
          {(mode === 'login' || mode === 'signup') && (
            <p className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-primary hover:underline font-medium"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default Auth;
