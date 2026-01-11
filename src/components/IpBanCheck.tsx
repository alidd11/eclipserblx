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
        const { data, error } = await supabase.functions.invoke('check-ip-ban');
        
        if (error) {
          console.error('Error checking IP ban:', error);
          // Fail open - allow access if check fails
          setBanInfo({ banned: false });
        } else {
          setBanInfo(data);
        }
      } catch (err) {
        console.error('Failed to check IP ban:', err);
        // Fail open
        setBanInfo({ banned: false });
      } finally {
        setIsChecking(false);
      }
    };

    checkIpBan();
  }, []);

  // Show minimal loading state while checking (prevents null response in PWA/Safari)
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background" />
    );
  }

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
