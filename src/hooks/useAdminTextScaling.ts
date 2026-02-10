import { useEffect } from 'react';

/**
 * Respects the user's OS-level text size preference for the admin PWA.
 * 
 * On iOS (Dynamic Type) and Android (font scaling), the browser exposes the
 * system preference via the CSS `font-size` on the root element when
 * `-webkit-text-size-adjust: auto` is set. However, many PWAs override this.
 *
 * This hook uses a test element to detect the system's preferred font size
 * and scales the admin layout accordingly using a CSS variable.
 */
export function useAdminTextScaling() {
  useEffect(() => {
    // Only apply on standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    const html = document.documentElement;

    // Create an off-screen probe element that inherits the system font size
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:absolute;top:-9999px;left:-9999px;width:auto;height:auto;' +
      'font-size:1rem;-webkit-text-size-adjust:auto;text-size-adjust:auto;';
    document.body.appendChild(probe);

    const applyScale = () => {
      const probeSize = parseFloat(getComputedStyle(probe).fontSize);
      // Default browser rem is 16px. If the system scales it, ratio > 1 or < 1.
      const scale = probeSize / 16;

      // Clamp between 0.85x and 1.35x to keep the UI functional
      const clamped = Math.min(Math.max(scale, 0.85), 1.35);

      // Apply to root so all rem-based sizing scales
      html.style.fontSize = `${clamped * 100}%`;
    };

    applyScale();

    // Re-check on visibility change (user may change settings and return)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay to let the system propagate
        setTimeout(applyScale, 300);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.body.removeChild(probe);
      html.style.removeProperty('font-size');
    };
  }, []);
}
