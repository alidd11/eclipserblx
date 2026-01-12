import { useEffect } from 'react';

/**
 * Prevents browser back/forward navigation via horizontal swipe gestures.
 * Only active in standalone PWA mode.
 *
 * Uses a wider edge zone (100px) and immediately prevents any rightward
 * swipe from the left edge to stop iOS Safari from interpreting it as a
 * "back" navigation gesture.
 */
export function useSwipePrevent() {
  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    const EDGE_ZONE_PX = 100; // Match AdminLayout for consistency
    let touchStartX = 0;
    let touchStartY = 0;
    let isLeftEdge = false;
    let isRightEdge = false;

    const handleTouchStart = (e: TouchEvent) => {
      const x = e.touches[0].clientX;
      touchStartX = x;
      touchStartY = e.touches[0].clientY;
      isLeftEdge = x < EDGE_ZONE_PX;
      isRightEdge = x > window.innerWidth - EDGE_ZONE_PX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX) return;
      if (!isLeftEdge && !isRightEdge) return;

      const touchX = e.touches[0].clientX;
      const deltaX = touchX - touchStartX;

      // Immediately prevent browser navigation for any horizontal movement from edge
      // Left edge + rightward swipe = back gesture
      // Right edge + leftward swipe = forward gesture
      if ((isLeftEdge && deltaX > 0) || (isRightEdge && deltaX < 0)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchEnd = () => {
      touchStartX = 0;
      touchStartY = 0;
      isLeftEdge = false;
      isRightEdge = false;
    };

    // Use capture phase to intercept before any other handlers
    document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, []);
}
