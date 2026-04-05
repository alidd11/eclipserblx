import { useState, useEffect, useRef } from 'react';

/**
 * Tracks scroll direction and returns 'up' | 'down'.
 * Uses a threshold to prevent jittery toggling.
 * @param threshold - minimum scroll delta to trigger a direction change
 * @param desktopOnly - if true, only activates on desktop (≥768px). Default false (all viewports).
 */
export function useScrollDirection(threshold = 10, desktopOnly = false): 'up' | 'down' {
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    // Optionally restrict to desktop only
    if (desktopOnly && window.innerWidth < 768) return;

    const update = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (Math.abs(delta) < threshold) {
        ticking.current = false;
        return;
      }

      // Always show header at the very top
      if (currentY < 60) {
        setDirection('up');
      } else {
        setDirection(delta > 0 ? 'down' : 'up');
      }

      lastScrollY.current = currentY;
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return direction;
}
