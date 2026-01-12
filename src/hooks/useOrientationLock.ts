import { useEffect } from 'react';

/**
 * Locks the screen orientation to portrait mode in PWA/standalone mode
 * Uses the Screen Orientation API which is supported in most modern browsers
 */
export function useOrientationLock() {
  useEffect(() => {
    // Only attempt lock in standalone PWA mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    const lockOrientation = async () => {
      try {
        // Check if Screen Orientation API is available
        const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
        
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('portrait-primary');
          console.log('[OrientationLock] Locked to portrait');
        }
      } catch (error) {
        // Lock may fail if not in fullscreen or not supported
        // This is expected on some devices/browsers
        console.log('[OrientationLock] Could not lock orientation:', error);
      }
    };

    lockOrientation();

    // Also try to lock when entering fullscreen
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        lockOrientation();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      // Optionally unlock on cleanup
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
