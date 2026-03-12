import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Smart scroll restoration that mimics traditional website behaviour:
 * - New navigation (PUSH) → scroll to top
 * - Back / Forward (POP)  → restore previous scroll position
 *
 * Placed inside <BrowserRouter> to access location.
 */

const scrollPositions = new Map<string, number>();

export function ScrollToTop() {
  const { pathname, key } = useLocation();
  const navigationType = useNavigationType();
  const prevKeyRef = useRef(key);

  // Save scroll position before leaving current route
  useEffect(() => {
    const prevKey = prevKeyRef.current;

    return () => {
      scrollPositions.set(prevKey, window.scrollY);
    };
  }, [key]);

  // Restore or reset scroll on route change
  useEffect(() => {
    prevKeyRef.current = key;

    if (navigationType === 'POP') {
      // Back/forward: restore saved position
      const saved = scrollPositions.get(key);
      if (saved !== undefined) {
        // Use rAF to let the DOM render first
        requestAnimationFrame(() => {
          window.scrollTo(0, saved);
        });
        return;
      }
    }

    // New navigation: scroll to top
    window.scrollTo(0, 0);
  }, [pathname, key, navigationType]);

  return null;
}
