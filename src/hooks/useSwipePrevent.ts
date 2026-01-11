import { useEffect } from 'react';

/**
 * Prevents browser back/forward navigation via horizontal swipe gestures
 * Only active in standalone PWA mode
 */
export function useSwipePrevent() {
  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;

      const deltaX = touchX - touchStartX;
      const deltaY = Math.abs(touchY - touchStartY);

      // Check if it's a horizontal swipe near the screen edges
      const isEdgeSwipe = touchStartX < 30 || touchStartX > window.innerWidth - 30;
      const isHorizontalSwipe = Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10;

      // Prevent edge swipes that would trigger navigation
      if (isEdgeSwipe && isHorizontalSwipe) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      touchStartX = 0;
      touchStartY = 0;
    };

    // Use passive: false to allow preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Also prevent the popstate event when needed
    const preventPopstate = (e: PopStateEvent) => {
      // This prevents the browser from going back/forward
      // when triggered by edge swipes
    };

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
}
