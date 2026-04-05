import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SocialLoginButtonsProps {
  loading: boolean;
  onError: (message: string) => void;
}

export function SocialLoginButtons({ loading, onError }: SocialLoginButtonsProps) {
  const [socialLoading, setSocialLoading] = useState(false);
  const disabled = socialLoading || loading;

  const isCustomDomainAuth = () => {
    const hostname = window.location.hostname;
    return !hostname.endsWith('.lovable.app') && !hostname.endsWith('.lovableproject.com');
  };

  const isSafeOAuthRedirectUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const backendHost = new URL(import.meta.env.VITE_SUPABASE_URL).hostname;
      const allowedHosts = [backendHost, 'accounts.google.com', 'appleid.apple.com'];
      return allowedHosts.includes(parsed.hostname) || parsed.hostname.endsWith('.supabase.co');
    } catch {
      return false;
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    const providerLabel = provider === 'google' ? 'Google' : 'Apple';
    setSocialLoading(true);
    try {
      const shouldBypassBridge = isCustomDomainAuth();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          ...(shouldBypassBridge ? ({ skipBrowserRedirect: true } as any) : {}),
        },
      });
      if (error) throw new Error(error.message || `Failed to sign in with ${providerLabel}`);
      if (shouldBypassBridge) {
        const oauthUrl = data?.url;
        if (!oauthUrl || !isSafeOAuthRedirectUrl(oauthUrl)) throw new Error('Received an invalid sign-in URL. Please try again.');
        window.location.assign(oauthUrl);
        return;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`${providerLabel} Sign-In Failed`, { description: errorMessage });
      onError(errorMessage);
    } finally {
      setSocialLoading(false);
    }
  };

  const handleDiscordSignIn = async () => {
    setSocialLoading(true);
    try {
      const productionDomain = 'https://eclipserblx.com';
      const currentOrigin = window.location.origin;
      const baseUrl = currentOrigin.startsWith('https://') ? currentOrigin : productionDomain;
      const redirectUri = `${baseUrl}/auth/discord/callback`;
      const { data, error } = await supabase.functions.invoke('discord-auth-url', { body: { redirect_uri: redirectUri } });
      if (error || data?.error) {
        toast.error('Discord Sign-In Failed', { description: data?.error || 'Failed to initiate Discord sign-in' });
        onError(data?.error || 'Discord sign-in failed');
        setSocialLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      toast.error('Discord Sign-In Failed', { description: errorMessage });
      onError(errorMessage);
      setSocialLoading(false);
    }
  };

  const handleRobloxSignIn = async () => {
    setSocialLoading(true);
    try {
      const productionDomain = 'https://eclipserblx.com';
      const redirectUri = `${productionDomain}/auth/roblox/callback`;
      const { data, error } = await supabase.functions.invoke('roblox-auth-url', { body: { redirect_uri: redirectUri } });
      if (error || data?.error) {
        toast.error('Roblox Sign-In Failed', { description: data?.error || 'Failed to initiate Roblox sign-in' });
        onError(data?.error || 'Roblox sign-in failed');
        setSocialLoading(false);
        return;
      }
      if (data.code_verifier) sessionStorage.setItem('roblox_code_verifier', data.code_verifier);
      window.location.href = data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      toast.error('Roblox Sign-In Failed', { description: errorMessage });
      onError(errorMessage);
      setSocialLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button type="button" variant="outline" className="bg-[#5865F2] hover:bg-[#4752C4] text-white border-0 text-xs h-10" disabled={disabled} onClick={handleDiscordSignIn}>
        {socialLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : (
          <svg className="mr-1.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        )}
        Discord
      </Button>

      <Button type="button" variant="outline" className="bg-[#E2231A] hover:bg-[#C01E17] text-white border-0 text-xs h-10" disabled={disabled} onClick={handleRobloxSignIn}>
        {socialLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : (
          <svg className="mr-1.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.164 0L.16 18.928 18.836 24l5.004-18.928L5.164 0zm7.17 15.107l-3.438-.906.906-3.437 3.438.906-.906 3.437z"/>
          </svg>
        )}
        Roblox
      </Button>

      <Button type="button" variant="outline" className="bg-black hover:bg-black/90 text-white border-0 text-xs h-10" disabled={disabled} onClick={() => handleOAuthSignIn('apple')}>
        {socialLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : (
          <svg className="mr-1.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
        )}
        Apple
      </Button>

      <Button type="button" variant="outline" className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 text-xs h-10" disabled={disabled} onClick={() => handleOAuthSignIn('google')}>
        {socialLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : (
          <svg className="mr-1.5 h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        Google
      </Button>
    </div>
  );
}
