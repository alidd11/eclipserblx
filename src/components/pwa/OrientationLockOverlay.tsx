import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

/**
 * Renders a full-screen blocking overlay when in landscape mode on PWA/mobile.
 * Uses JavaScript-based detection which is more reliable than CSS on iOS Safari.
 * 
 * NOTE: On native Capacitor apps, true orientation locking is handled by the
 * @capacitor/screen-orientation plugin, so this overlay is not needed.
 */
export function OrientationLockOverlay() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Skip entirely on native platforms where true orientation lock is active
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    // Don't set up anything on native platforms
    if (isNative) return;

    // Check if running as PWA
    const standalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Also add class to html for any CSS that needs it
    if (standalone) {
      document.documentElement.classList.add('pwa-standalone');
    }
  }, [isNative]);

  useEffect(() => {
    // Skip on native or non-standalone
    if (isNative || !isStandalone) return;

    const checkOrientation = () => {
      // Multiple detection methods for reliability
      const isLandscape = 
        window.matchMedia('(orientation: landscape)').matches ||
        window.innerWidth > window.innerHeight ||
        (typeof window.orientation === 'number' && (window.orientation === 90 || window.orientation === -90));
      
      // Check if this is actually a mobile/touch device, not just a small screen
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isMobileDevice = isTouchDevice && isMobileUA;
      
      // Only block on actual mobile devices in landscape (not desktop browsers)
      const isMobileSize = window.innerWidth < 1024 || window.innerHeight < 1024;
      
      setShowOverlay(isLandscape && isMobileSize && isMobileDevice);
    };

    // Check immediately
    checkOrientation();

    // Listen to all possible orientation change events
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    mediaQuery.addEventListener('change', checkOrientation);

    // Also poll occasionally for edge cases
    const interval = setInterval(checkOrientation, 500);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      mediaQuery.removeEventListener('change', checkOrientation);
      clearInterval(interval);
    };
  }, [isNative, isStandalone]);

  // Don't render on native platforms or when not needed
  if (isNative || !showOverlay) return null;

  return (
    <div 
      className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-background text-foreground p-8"
      style={{ 
        // Ensure it covers everything including safe areas
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        position: 'fixed',
      }}
    >
      <div className="animate-bounce mb-6">
        <RotateCcw className="h-16 w-16 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-center">
        Please rotate your device
      </h2>
      <p className="text-muted-foreground text-center max-w-xs">
        This app works best in portrait mode. Please rotate your device to continue.
      </p>
    </div>
  );
}
