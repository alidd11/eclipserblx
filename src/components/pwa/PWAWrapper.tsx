import { useState, useEffect, useLayoutEffect, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';
import { useAppVersionCheck } from '@/hooks/useAppVersionCheck';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';
import { useSwipePrevent } from '@/hooks/useSwipePrevent';
import { useThemeColor } from '@/hooks/useThemeColor';
import { OrientationLockOverlay } from '@/components/pwa/OrientationLockOverlay';
import { toast } from 'sonner';
import { recalculatePWAViewport, isStandalonePWA } from '@/lib/externalBrowser';

interface PWAWrapperProps {
  children: ReactNode;
}

export function PWAWrapper({ children }: PWAWrapperProps) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  const [isStandalone, setIsStandalone] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [hasShownRecoveryToast, setHasShownRecoveryToast] = useState(false);
  
  // Initialize SW update handler - notifications disabled
  const { clearAllCaches, forceUpdate } = useServiceWorkerUpdate({
    showNotifications: false,
    // Ensure installed PWA actually updates its cached assets (flags, etc.)
    // without the user needing to manually refresh.
    autoReloadOnUpdate: true,
  });
  
  // Initialize app version check for remote forced updates - notifications disabled
  useAppVersionCheck({ showNotifications: false });
  
  // Network quality monitoring
  const { status, isOffline, isDegraded, justRecovered, forceCheck } = useNetworkQuality();

  // Prevent swipe navigation in PWA
  useSwipePrevent();

  // Dynamic theme color for PWA
  useThemeColor();

  const PULL_THRESHOLD = 80;

  // Check if running as PWA
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // In standalone PWA mode, aggressively check for SW updates on launch.
  // If a new SW becomes active, useServiceWorkerUpdate will reload once.
  useEffect(() => {
    if (!isStandalone) return;
    // Small delay to avoid racing initial render / SW init.
    const t = setTimeout(() => {
      forceUpdate();
    }, 250);
    return () => clearTimeout(t);
  }, [isStandalone, forceUpdate]);

  // PERMANENT SAFE AREA FIX: Set html/body background to match the app background.
  // This prevents the "white/grey strip" that appears behind safe-area insets
  // when returning from external links, when iOS recalculates the viewport, or
  // during any overscroll/rubber-banding. Same approach as AdminLayout.
  useLayoutEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    if (!standalone) return;

    const html = document.documentElement;
    const body = document.body;

    // Store original styles to restore if component unmounts
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;

    // Set background to match the theme background - this fills safe-area gaps
    const themeBg = 'hsl(var(--background))';
    html.style.backgroundColor = themeBg;
    body.style.backgroundColor = themeBg;

    // Handle returning from external links - aggressive viewport recalculation
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        html.style.backgroundColor = themeBg;
        body.style.backgroundColor = themeBg;
        
        // Check if returning from external navigation
        const wasExternal = sessionStorage.getItem('pwa-external-navigation');
        if (wasExternal) {
          sessionStorage.removeItem('pwa-external-navigation');
          // Aggressive viewport recalculation after external navigation
          recalculatePWAViewport();
        }
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      html.style.backgroundColor = themeBg;
      body.style.backgroundColor = themeBg;
      
      // If page was restored from bfcache or we're returning from navigation
      if (e.persisted) {
        recalculatePWAViewport();
      }
      
      // Check for external navigation flag
      const wasExternal = sessionStorage.getItem('pwa-external-navigation');
      if (wasExternal) {
        sessionStorage.removeItem('pwa-external-navigation');
        recalculatePWAViewport();
      }
    };

    // Also handle focus events for when Safari returns control to PWA
    const handleFocus = () => {
      const wasExternal = sessionStorage.getItem('pwa-external-navigation');
      if (wasExternal) {
        sessionStorage.removeItem('pwa-external-navigation');
        // Delay to let iOS settle
        setTimeout(() => recalculatePWAViewport(), 100);
        setTimeout(() => recalculatePWAViewport(), 300);
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Restore previous backgrounds (or keep theme bg if none was set)
      html.style.backgroundColor = prevHtmlBg || themeBg;
      body.style.backgroundColor = prevBodyBg || themeBg;
    };
  }, []);

  // Show recovery toast when connection is restored
  useEffect(() => {
    if (justRecovered && !hasShownRecoveryToast) {
      toast.success('Connection restored', {
        description: 'You\'re back online!',
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000,
      });
      setHasShownRecoveryToast(true);
      
      // Reset after a short delay so it can show again if needed
      setTimeout(() => setHasShownRecoveryToast(false), 10000);
    }
  }, [justRecovered, hasShownRecoveryToast]);

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
      {/* Orientation lock overlay - blocks landscape mode in PWA */}
      <OrientationLockOverlay />
      
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {pullDistance > 10 && isStandalone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
            style={{ paddingTop: `calc(env(safe-area-inset-top) + ${pullDistance * 0.5}px)` }}
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
            className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] flex items-center justify-center gap-2 text-sm"
          >
            <WifiOff className="h-4 w-4" />
            You're offline. Some features may be unavailable.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Degraded connection warning */}
      <AnimatePresence>
        {isDegraded && !isOffline && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] flex items-center justify-center gap-2 text-sm cursor-pointer"
            onClick={() => forceCheck()}
          >
            <AlertTriangle className="h-4 w-4" />
            Connection unstable. Tap to retry.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with pull offset */}
      <div
        className="bg-background overscroll-contain"
        style={{
          transform: isStandalone && pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : undefined,
          transition: !isPulling ? 'transform 0.2s ease-out' : undefined,
          // Add padding when showing banners
          paddingTop: (isOffline || isDegraded) ? 'calc(env(safe-area-inset-top) + 2.5rem)' : undefined,
          // Ensure background extends behind safe areas
          minHeight: '100dvh',
        }}
      >
        {children}
      </div>
    </>
  );
}
