import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Global connectivity banner.
 * Shows a fixed bottom bar when offline, and a brief toast on reconnection.
 */
export function ConnectivityBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };

    const goOnline = () => {
      setIsOffline(false);
      if (wasOffline) {
        toast.success('You\'re back online', {
          icon: <Wifi className="h-4 w-4" />,
          duration: 3000,
        });
      }
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [wasOffline]);

  if (!isOffline) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[9998] flex items-center justify-center gap-2',
        'bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium',
        'animate-fade-in'
      )}
      role="alert"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You're offline — some features may be unavailable</span>
    </div>
  );
}
