import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * Renders a full-screen blocking overlay when in landscape mode on PWA/mobile.
 * Uses JavaScript-based detection which is more reliable than CSS on iOS Safari.
 */
export function OrientationLockOverlay() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const standalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Also add class to html for any CSS that needs it
    if (standalone) {
      document.documentElement.classList.add('pwa-standalone');
    }
  }, []);

  useEffect(() => {
    if (!isStandalone) return;

    const checkOrientation = () => {
      // Multiple detection methods for reliability
      const isLandscape = 
        window.matchMedia('(orientation: landscape)').matches ||
        window.innerWidth > window.innerHeight ||
        (typeof window.orientation === 'number' && (window.orientation === 90 || window.orientation === -90));
      
      // Only block on mobile-sized screens (not tablets/desktops)
      const isMobileSize = window.innerWidth < 1024 || window.innerHeight < 1024;
      
      setShowOverlay(isLandscape && isMobileSize);
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
  }, [isStandalone]);

  if (!showOverlay) return null;

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
