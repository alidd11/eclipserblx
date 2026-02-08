import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function GlobalGuardCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('Discord authorization was denied');
        setIsProcessing(false);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setIsProcessing(false);
        return;
      }

      try {
        // Exchange the code for tokens via edge function
        const redirectUri = `${window.location.origin}/guard/callback`;
        
        const { data, error: fnError } = await supabase.functions.invoke('global-guard-oauth', {
          body: { code, redirect_uri: redirectUri },
        });

        if (fnError) throw fnError;

        if (data?.error) {
          throw new Error(data.error);
        }

        // Store the Global Guard session
        if (data?.access_token && data?.discord_user) {
          sessionStorage.setItem('global_guard_session', JSON.stringify({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            discordUser: data.discord_user,
            guilds: data.guilds || [],
            expiresAt: Date.now() + (data.expires_in * 1000),
          }));

          // Dispatch event to notify session hook of the update
          window.dispatchEvent(new Event('global_guard_session_updated'));

          toast.success(`Welcome, ${data.discord_user.username}!`);
          navigate('/guard', { replace: true });
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError((err as Error).message || 'Failed to complete Discord authentication');
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Authentication Failed</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => navigate('/guard')} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center animate-pulse">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Completing authentication...</span>
        </div>
      </div>
    </div>
  );
}
