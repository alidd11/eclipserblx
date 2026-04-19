import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MailX, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function Unsubscribe() {
  usePageMeta({ title: 'Unsubscribe', description: 'Manage your Eclipse email subscription preferences.', canonicalPath: '/unsubscribe' });
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'done' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then(r => r.json())
      .then(d => setStatus(d.valid ? 'valid' : 'invalid'))
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleUnsubscribe = async () => {
    setStatus('loading');
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', { body: { token } });
      if (error) throw error;
      setStatus(data?.success ? 'done' : 'error');
    } catch { setStatus('error'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4">
        {status === 'loading' && <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />}
        {status === 'valid' && (
          <>
            <MailX className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-bold">Unsubscribe</h1>
            <p className="text-muted-foreground text-sm">Are you sure you want to unsubscribe from email notifications?</p>
            <Button onClick={handleUnsubscribe} className="gradient-button">Confirm Unsubscribe</Button>
          </>
        )}
        {status === 'done' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <h1 className="text-xl font-bold">Unsubscribed</h1>
            <p className="text-muted-foreground text-sm">You will no longer receive email notifications.</p>
          </>
        )}
        {(status === 'invalid' || status === 'error') && (
          <>
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-xl font-bold">Invalid Link</h1>
            <p className="text-muted-foreground text-sm">This unsubscribe link is invalid or has already been used.</p>
          </>
        )}
      </div>
    </div>
  );
}
