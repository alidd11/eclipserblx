import { useEffect } from 'react';

/**
 * Locks the screen orientation to portrait mode in PWA/standalone mode.
 * Uses CSS class for reliable blocking since Screen Orientation API
 * requires fullscreen on most browsers/iOS doesn't support it at all.
 */
export function useOrientationLock() {
  useEffect(() => {
    // Check if we're in standalone PWA mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Add class to html for CSS-based orientation lock
    if (isStandalone) {
      document.documentElement.classList.add('pwa-standalone');
    }

    // Try the Screen Orientation API (works on Android Chrome)
    const lockOrientation = async () => {
      try {
        const orientation = screen.orientation as ScreenOrientation & { 
          lock?: (orientation: string) => Promise<void> 
        };
        
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('portrait-primary');
          console.log('[OrientationLock] Locked to portrait via API');
        }
      } catch (error) {
        // Expected to fail on iOS and when not fullscreen
        console.log('[OrientationLock] API lock not available, using CSS fallback');
      }
    };

    if (isStandalone) {
      lockOrientation();
    }

    // Handle orientation changes to re-attempt lock
    const handleOrientationChange = () => {
      if (isStandalone) {
        lockOrientation();
      }
    };

    // Listen for orientation changes
    screen.orientation?.addEventListener('change', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      screen.orientation?.removeEventListener('change', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      
      // Don't remove the class on cleanup - we want it persistent
      // Only try to unlock if we're unmounting completely
      try {
        const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
        if (orientation && typeof orientation.unlock === 'function') {
          orientation.unlock();
        }
      } catch {
        // Ignore unlock errors
      }
    };
  }, []);
}
