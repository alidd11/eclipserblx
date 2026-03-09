import { useState, useEffect, ReactNode } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';
import { useAppVersionCheck } from '@/hooks/useAppVersionCheck';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { useThemeColor } from '@/hooks/useThemeColor';
import { toast } from 'sonner';

interface PWAWrapperProps {
  children: ReactNode;
}

export function PWAWrapper({ children }: PWAWrapperProps) {
  const [hasShownRecoveryToast, setHasShownRecoveryToast] = useState(false);
  const [prevStatus, setPrevStatus] = useState<string>('online');

  // Initialize SW update handler - notifications disabled, no auto-reload
  useServiceWorkerUpdate({ showNotifications: false, autoReloadOnUpdate: false });

  // Initialize app version check for remote forced updates
  useAppVersionCheck({ showNotifications: false });

  // Network status (event-driven, zero polling)
  const systemStatus = useSystemStatus();
  const isOffline = systemStatus === 'offline';

  // Dynamic theme color for PWA
  useThemeColor();

  // Show recovery toast when connection is restored
  useEffect(() => {
    const justRecovered = prevStatus === 'offline' && systemStatus === 'online';
    setPrevStatus(systemStatus);

    if (justRecovered && !hasShownRecoveryToast) {
      toast.success('Connection restored', {
        description: "You're back online!",
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000,
      });
      setHasShownRecoveryToast(true);
      setTimeout(() => setHasShownRecoveryToast(false), 10000);
    }
  }, [systemStatus, prevStatus, hasShownRecoveryToast]);

  return (
    <>
      {/* Offline banner — CSS-only animation, no framer-motion */}
      {isOffline && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] flex items-center justify-center gap-2 text-sm animate-slide-down"
        >
          <WifiOff className="h-4 w-4" />
          You're offline. Some features may be unavailable.
        </div>
      )}

      {/* Content — no transform wrapper */}
      <div
        className="bg-transparent overscroll-contain"
        style={{
          paddingTop: isOffline ? 'calc(env(safe-area-inset-top) + 2.5rem)' : undefined,
          minHeight: '100dvh',
        }}
      >
        {children}
      </div>
    </>
  );
}
