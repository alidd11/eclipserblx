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

export function ScrollToTop(): null {
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

  // Restore or reset scroll on route change, wrapped in View Transition when supported
  useEffect(() => {
    prevKeyRef.current = key;

    const applyScroll = () => {
      if (navigationType === 'POP') {
        const saved = scrollPositions.get(key);
        if (saved !== undefined) {
          requestAnimationFrame(() => window.scrollTo(0, saved));
          return;
        }
      }
      window.scrollTo(0, 0);
    };

    // Wrap in View Transition API if available (progressive enhancement)
    const doc = document as any;
    if (typeof doc.startViewTransition === 'function' && navigationType === 'PUSH') {
      doc.startViewTransition(applyScroll);
    } else {
      applyScroll();
    }
  }, [pathname, key, navigationType]);

  return null;
}
