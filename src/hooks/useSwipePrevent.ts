import { useEffect } from 'react';

/**
 * Prevents browser back/forward navigation via horizontal swipe gestures.
 * Only active in standalone PWA mode.
 *
 * Uses multiple strategies:
 * 1. CSS touch-action and overscroll-behavior (in index.css)
 * 2. JavaScript touchmove prevention for edge swipes
 * 3. History manipulation to block navigation
 */
export function useSwipePrevent() {
  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    // Strategy 1: Push extra history entry to trap back navigation
    // This prevents the back gesture from leaving the app
    const pushState = () => {
      if (window.history.state?.preventBack !== true) {
        window.history.pushState({ preventBack: true }, '');
      }
    };
    pushState();

    const handlePopState = (e: PopStateEvent) => {
      // Re-push the state to trap the user in the app
      pushState();
    };

    window.addEventListener('popstate', handlePopState);

    // Strategy 2: Touch event prevention for edge swipes
    const EDGE_ZONE_PX = 50; // Smaller zone for more precise detection
    let touchStartX = 0;
    let touchStartY = 0;
    let isHorizontalSwipe = false;

    const isGestureExemptTarget = (target: EventTarget | null) => {
      const el = target as Element | null;
      return !!el?.closest?.('[data-gesture-exempt="true"]');
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isGestureExemptTarget(e.target)) return;

      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      isHorizontalSwipe = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartX);
      const deltaY = Math.abs(touch.clientY - touchStartY);

      // Detect if this is primarily a horizontal swipe
      if (!isHorizontalSwipe && deltaX > 10) {
        isHorizontalSwipe = deltaX > deltaY * 1.5;
      }

      // Block horizontal swipes from edges
      const isFromLeftEdge = touchStartX < EDGE_ZONE_PX;
      const isFromRightEdge = touchStartX > window.innerWidth - EDGE_ZONE_PX;

      if (isHorizontalSwipe && (isFromLeftEdge || isFromRightEdge)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchEnd = () => {
      touchStartX = 0;
      touchStartY = 0;
      isHorizontalSwipe = false;
    };

    // Use capture phase to intercept before any other handlers
    document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, []);
}
