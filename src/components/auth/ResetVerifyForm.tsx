import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PasswordStrengthMeter, isPasswordStrongEnough } from '@/components/auth/PasswordStrengthMeter';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTranslation } from 'react-i18next';

interface ResetVerifyFormProps {
  email: string;
  onSuccess: () => void;
  onChangeEmail: () => void;
}

export function ResetVerifyForm({ email, onSuccess, onChangeEmail }: ResetVerifyFormProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ otp?: string; password?: string; confirmPassword?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
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
        body: { email, code: otpCode, newPassword: password },
      });

      if (response.error || response.data?.error) {
        const errorMessage = response.data?.error || 'Invalid or expired code';
        if (errorMessage.includes('expired')) {
          setErrors({ otp: 'Code has expired. Please request a new one.' });
        } else if (errorMessage.includes('Invalid')) {
          setErrors({ otp: 'Invalid code. Please check and try again.' });
        } else {
          toast.error(t('common.error'), { description: errorMessage });
        }
      } else {
        toast.success(t('auth.passwordUpdated'), { description: t('auth.passwordResetSuccess') + ' ' + t('auth.pleaseSignIn') });
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('custom-password-reset/request', {
        body: { email },
      });
      if (response.error) {
        toast.error(t('common.error'), { description: 'Failed to resend code. Please try again.' });
      } else {
        toast.success(t('auth.codeSent'), { description: t('auth.newCodeSent') });
        setOtpCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-center">
          <InputOTP maxLength={4} value={otpCode} onChange={setOtpCode}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        {errors.otp && <p className="text-sm text-destructive text-center">{errors.otp}</p>}
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
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <PasswordStrengthMeter password={password} />
        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
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
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 4}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('auth.resetPassword')}
      </Button>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{t('auth.didntReceiveCode')}</p>
        <button type="button" onClick={handleResend} disabled={loading} className="text-sm text-primary hover:underline disabled:opacity-50">
          {t('auth.resendCode')}
        </button>
      </div>

      <button type="button" onClick={onChangeEmail} className="w-full text-sm text-muted-foreground hover:text-foreground">
        {t('auth.useDifferentEmail')}
      </button>
    </form>
  );
}
