import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PasswordStrengthMeter, isPasswordStrongEnough } from '@/components/auth/PasswordStrengthMeter';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SocialLoginButtons } from './SocialLoginButtons';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface LoginSignupFormProps {
  mode: 'login' | 'signup';
  email: string;
  setEmail: (email: string) => void;
  onForgotPassword: () => void;
  onVerify: () => void;
  onToggleMode: () => void;
}

export function LoginSignupForm({ mode, email, setEmail, onForgotPassword, onVerify, onToggleMode }: LoginSignupFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [subscribeToEmails, setSubscribeToEmails] = useState(true);
  const [agreedToTos, setAgreedToTos] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; captcha?: string; tos?: string; displayName?: string; vpn?: string; social?: string }>({});

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
        const { data: isAvailable } = await supabase.rpc('is_username_available', { username: displayName.trim() });
        setUsernameAvailable(isAvailable ?? false);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [displayName, mode]);

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
      if (!trimmedUsername) { setErrors({ displayName: t('auth.usernameRequired') }); return; }
      if (trimmedUsername.length < 6) { setErrors({ displayName: 'Username must be at least 6 characters' }); return; }
      if (trimmedUsername.length > 20) { setErrors({ displayName: 'Username must be 20 characters or less' }); return; }

      const { data: isAvailable } = await supabase.rpc('is_username_available', { username: trimmedUsername });
      if (!isAvailable) { setErrors({ displayName: t('auth.usernameTaken') }); return; }

      if (password !== confirmPassword) { setErrors({ confirmPassword: 'Passwords do not match' }); return; }
      if (!captchaVerified) { setErrors({ captcha: t('auth.captchaRequired') }); return; }
      if (!agreedToTos) { setErrors({ tos: 'You must agree to the Terms of Service to create an account' }); return; }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        try {
          const { data: vpnData, error: vpnError } = await supabase.functions.invoke('check-vpn');
          if (!vpnError && vpnData?.isVpn) {
            setLoading(false);
            setErrors({ vpn: t('auth.vpnDetected') });
            toast.error('VPN Detected', { description: t('auth.vpnDetected') });
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
            toast.error(t('auth.loginFailed'), { description: t('auth.invalidCredentials') });
          } else {
            toast.error(t('auth.loginFailed'), { description: error.message });
          }
        } else {
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, displayName || undefined);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error(t('auth.accountExists'), { description: t('auth.accountExistsDesc') });
          } else {
            toast.error(t('auth.signUpFailed'), { description: error.message });
          }
        } else {
          if (subscribeToEmails) sessionStorage.setItem('pendingEmailSubscription', 'true');
          toast.success(t('auth.checkYourEmail'), { description: 'We sent you a 6-digit verification code.' });
          onVerify();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border/60 bg-card p-6 space-y-4 shadow-lg">
      {mode === 'signup' && (
        <div className="space-y-2">
          <Label htmlFor="displayName">{t('auth.username')}</Label>
          <div className="relative">
            <Input id="displayName" type="text" placeholder="Choose a username" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-input pr-10" required />
            {displayName.trim().length >= 6 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingUsername ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : usernameAvailable === true ? <Check className="h-4 w-4 text-emerald-500" /> : usernameAvailable === false ? <X className="h-4 w-4 text-destructive" /> : null}
              </div>
            )}
          </div>
          {usernameAvailable === true && displayName.trim().length >= 6 && <p className="text-sm text-emerald-500">{t('auth.usernameAvailable')}</p>}
          {usernameAvailable === false && displayName.trim().length >= 6 && <p className="text-sm text-destructive">{t('auth.usernameTaken')}</p>}
          {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.email')}</Label>
        <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-input" required />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t('auth.password')}</Label>
          {mode === 'login' && (
            <button type="button" onClick={onForgotPassword} className="text-xs text-primary hover:underline">
              {t('auth.forgotPassword')}
            </button>
          )}
        </div>
        <div className="relative">
          <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-input pr-10" required />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={showPassword ? 'eye-off' : 'eye'} initial={{ opacity: 0, scale: 0.8, rotate: -90 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.8, rotate: 90 }} transition={{ duration: 0.15 }} className="block">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
        {mode === 'signup' && <PasswordStrengthMeter password={password} />}
        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
      </div>

      {mode === 'signup' && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
          <div className="relative">
            <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-input pr-20" required />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {confirmPassword.length > 0 && password.length > 0 && (
                confirmPassword === password ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-destructive" />
              )}
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={showConfirmPassword ? 'eye-off' : 'eye'} initial={{ opacity: 0, scale: 0.8, rotate: -90 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.8, rotate: 90 }} transition={{ duration: 0.15 }} className="block">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </div>
          {confirmPassword.length > 0 && password.length > 0 && (
            confirmPassword === password ? <p className="text-sm text-emerald-500">Passwords match</p> : <p className="text-sm text-destructive">Passwords do not match</p>
          )}
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
        </div>
      )}

      {mode === 'signup' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-4 border border-border rounded-lg bg-muted/30">
              <Checkbox id="captcha" checked={captchaVerified} onCheckedChange={(checked) => setCaptchaVerified(checked === true)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
              <Label htmlFor="captcha" className="text-sm font-normal cursor-pointer select-none">I'm not a robot</Label>
            </div>
            {errors.captcha && <p className="text-sm text-destructive">{errors.captcha}</p>}
          </div>

          <div className="flex items-start space-x-3 p-4 border border-border rounded-lg bg-muted/30">
            <Checkbox id="emailSubscription" checked={subscribeToEmails} onCheckedChange={(checked) => setSubscribeToEmails(checked === true)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5" />
            <Label htmlFor="emailSubscription" className="text-sm font-normal cursor-pointer select-none leading-relaxed">{t('auth.subscribeEmails')}</Label>
          </div>

          <div className="space-y-2">
            <div className="flex items-start space-x-3 p-4 border border-border rounded-lg bg-muted/30">
              <Checkbox id="tos" checked={agreedToTos} onCheckedChange={(checked) => setAgreedToTos(checked === true)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5" />
              <Label htmlFor="tos" className="text-sm font-normal cursor-pointer select-none leading-relaxed">
                {t('auth.agreeToTerms')}{' '}
                <Link to="/terms" target="_blank" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{t('auth.termsOfService')}</Link>{' '}
                {t('auth.and')}{' '}
                <Link to="/privacy" target="_blank" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{t('auth.privacyPolicy')}</Link>
              </Label>
            </div>
            {errors.tos && <p className="text-sm text-destructive">{errors.tos}</p>}
          </div>

          {errors.vpn && (
            <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
              <p className="text-sm text-destructive font-medium">{errors.vpn}</p>
            </div>
          )}
        </div>
      )}

      <Button type="submit" className="w-full h-12 text-sm font-semibold" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {mode === 'login' ? t('common.signIn') : t('auth.createAccount')}
      </Button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider"><span className="bg-card px-3 text-muted-foreground/70">{t('auth.orContinueWith')}</span></div>
      </div>

      <SocialLoginButtons loading={loading} onError={(msg) => setErrors({ social: msg })} />

      {errors.social && <p className="text-sm text-destructive text-center">{errors.social}</p>}
    </form>
  );
}
