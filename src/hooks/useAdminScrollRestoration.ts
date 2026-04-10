import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets scroll position to top on admin route changes.
 * Should be used in AdminLayout.
 */
export function useAdminScrollRestoration() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll the main content area or window to top on route change
    window.scrollTo(0, 0);
    // Also scroll any overflow containers
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  }, [pathname]);
}
