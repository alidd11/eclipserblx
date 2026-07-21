import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

interface ForgotPasswordFormProps {
  email: string;
  setEmail: (email: string) => void;
  onBack: () => void;
  onCodeSent: () => void;
}

export function ForgotPasswordForm({ email, setEmail, onBack, onCodeSent }: ForgotPasswordFormProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
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
        toast.error(t('common.error'), { description: 'Failed to send reset email. Please try again.' });
      } else {
        onCodeSent();
        toast.success(t('auth.checkYourEmail'), { description: 'We sent you a 6-digit verification code.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
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
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('auth.sendVerificationCode')}
      </Button>

      <button type="button" onClick={onBack} className="w-full text-sm text-muted-foreground hover:text-foreground">
        {t('auth.backToSignIn')}
      </button>
    </form>
  );
}
