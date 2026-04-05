import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTranslation } from 'react-i18next';

interface VerifyEmailFormProps {
  email: string;
  onBack: () => void;
}

export function VerifyEmailForm({ email, onBack }: VerifyEmailFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [errors, setErrors] = useState<{ otp?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (otpCode.length !== 6) {
      setErrors({ otp: 'Please enter the complete 6-digit code' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });

      if (error) {
        if (error.message.includes('expired')) {
          setErrors({ otp: 'Code has expired. Please request a new one.' });
        } else if (error.message.includes('invalid')) {
          setErrors({ otp: 'Invalid code. Please check and try again.' });
        } else {
          toast.error('Verification Failed', { description: error.message });
        }
      } else {
        // Process referral
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

        toast.success(t('auth.emailVerified'), { description: t('auth.accountVerified') });
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        toast.error(t('common.error'), { description: error.message });
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
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
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
        {errors.otp && <p className="text-sm text-destructive text-center">{errors.otp}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('auth.verifyEmail')}
      </Button>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{t('auth.didntReceiveCode')}</p>
        <button type="button" onClick={handleResend} disabled={loading} className="text-sm text-primary hover:underline disabled:opacity-50">
          {t('auth.resendCode')}
        </button>
      </div>

      <button type="button" onClick={onBack} className="w-full text-sm text-muted-foreground hover:text-foreground">
        {t('common.back')} to {t('common.signUp')}
      </button>
    </form>
  );
}
