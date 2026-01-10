import { useState, useEffect, ReactNode } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';

interface PWAWrapperProps {
  children: ReactNode;
}

export function PWAWrapper({ children }: PWAWrapperProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  // Initialize SW update handler (listens for updates and shows toasts)
  const { clearAllCaches, forceUpdate } = useServiceWorkerUpdate();

  const PULL_THRESHOLD = 80;

  useEffect(() => {
    // Check if running as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Pull-to-refresh for PWA
  useEffect(() => {
    if (!isStandalone) return;

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || startY === 0) return;
      
      currentY = e.touches[0].clientY;
      const distance = Math.max(0, Math.min(currentY - startY, 150));
      
      if (distance > 0 && window.scrollY === 0) {
        setPullDistance(distance);
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance >= PULL_THRESHOLD) {
        handleRefresh();
      }
      setPullDistance(0);
      setIsPulling(false);
      startY = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isStandalone, isPulling, pullDistance]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Clear all caches via SW and directly
    clearAllCaches();
    
    // Force SW update check
    await forceUpdate();
    
    // Reload after a short delay to ensure caches are cleared
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <>
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {pullDistance > 10 && isStandalone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
            style={{ paddingTop: pullDistance * 0.5 }}
          >
            <div
              className="bg-primary rounded-full p-3 shadow-lg"
              style={{
                transform: `rotate(${pullProgress * 360}deg)`,
                opacity: pullProgress,
              }}
            >
              <RefreshCw className="h-5 w-5 text-primary-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 text-sm"
          >
            <WifiOff className="h-4 w-4" />
            You're offline. Some features may be unavailable.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with pull offset */}
      <div
        style={{
          transform: isStandalone && pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : undefined,
          transition: !isPulling ? 'transform 0.2s ease-out' : undefined,
        }}
      >
        {children}
      </div>
    </>
  );
}
