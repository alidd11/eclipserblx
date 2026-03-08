import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Ban, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface BanInfo {
  banned: boolean;
  reason?: string;
  expires_at?: string | null;
  ip?: string;
}

export function IpBanCheck({ children }: { children: React.ReactNode }) {
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkIpBan = async () => {
      try {
        // Check sessionStorage cache first to avoid redundant edge function calls
        const cached = sessionStorage.getItem('ip-ban-check');
        if (cached) {
          const { data: cachedData, ts } = JSON.parse(cached);
          // Cache valid for 15 minutes (extended from 10 to reduce edge function calls)
          if (Date.now() - ts < 15 * 60 * 1000) {
            setBanInfo(cachedData);
            setIsChecking(false);
            return;
          }
        }

        const { data, error } = await supabase.functions.invoke('check-ip-ban');
        
        if (error) {
          console.error('Error checking IP ban:', error);
          setBanInfo({ banned: false });
        } else {
          setBanInfo(data);
          // Cache result for 15 minutes
          sessionStorage.setItem('ip-ban-check', JSON.stringify({ data, ts: Date.now() }));
        }
      } catch (err) {
        console.error('Failed to check IP ban:', err);
        setBanInfo({ banned: false });
      } finally {
        setIsChecking(false);
      }
    };

    // Defer IP ban check to avoid blocking the critical rendering path
    const timer = setTimeout(checkIpBan, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Render children immediately while ban check runs in background
  // This prevents the IP ban check from blocking FCP/LCP

  // Show banned screen if IP is banned
  if (banInfo?.banned) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <Ban className="w-10 h-10 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">
              Your IP address has been banned from accessing this site.
            </p>
          </div>

          {banInfo.reason && (
            <div className="bg-muted rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Reason</p>
                  <p className="text-sm text-muted-foreground">{banInfo.reason}</p>
                </div>
              </div>
            </div>
          )}

          {banInfo.expires_at && (
            <p className="text-sm text-muted-foreground">
              This ban expires on{' '}
              <span className="font-medium">
                {format(new Date(banInfo.expires_at), 'MMMM d, yyyy \'at\' h:mm a')}
              </span>
            </p>
          )}

          {!banInfo.expires_at && (
            <p className="text-sm text-muted-foreground">
              This is a permanent ban.
            </p>
          )}

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              If you believe this is a mistake, please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Allow access
  return <>{children}</>;
}
