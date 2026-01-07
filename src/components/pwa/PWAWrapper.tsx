import { useState, useEffect, ReactNode } from 'react';
import { RefreshCw, WifiOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface PWAWrapperProps {
  children: ReactNode;
}

export function PWAWrapper({ children }: PWAWrapperProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showRefreshHint, setShowRefreshHint] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const PULL_THRESHOLD = 80;

  useEffect(() => {
    // Check if running as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Show refresh hint after 10 seconds in standalone mode
    if (standalone) {
      const timer = setTimeout(() => {
        setShowRefreshHint(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
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
    setShowRefreshHint(false);
    
    // Clear service worker cache and reload
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    window.location.reload();
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

      {/* Subtle refresh hint in header area for PWA */}
      <AnimatePresence>
        {isStandalone && showRefreshHint && !isOffline && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-20 right-4 z-[100] flex items-center gap-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg"
          >
            <span className="text-xs text-muted-foreground">Stuck?</span>
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 hover:bg-primary/10"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <button
              onClick={() => setShowRefreshHint(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
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
