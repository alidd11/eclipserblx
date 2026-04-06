import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Announces route changes to screen readers via an aria-live region.
 * Enterprise a11y pattern — ensures blind users know when the page changes in an SPA.
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Derive a human-readable page name from the document title
    const title = document.title || pathname.replace(/\//g, ' ').trim() || 'Home';
    if (ref.current) {
      ref.current.textContent = `Navigated to ${title}`;
    }
  }, [pathname]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
