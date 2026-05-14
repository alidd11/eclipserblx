import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { safeStorage } from '@/lib/safeStorage';

const LAST_ROUTE_KEY = 'pwa-last-route';
const EXCLUDED_ROUTES = ['/auth', '/admin/login', '/order-success'];
const VOLATILE_QUERY_PARAMS = ['__chunk', '__v', '__t', '__ra'];

function sanitizeRoute(path: string): string {
  try {
    const url = new URL(path, window.location.origin);
    VOLATILE_QUERY_PARAMS.forEach((param) => {
      url.searchParams.delete(param);
    });
    const next = `${url.pathname}${url.search}${url.hash}`;
    return next || '/';
  } catch {
    return path || '/';
  }
}

function currentUrlHasVolatileParams(): boolean {
  try {
    const url = new URL(window.location.href);
    return VOLATILE_QUERY_PARAMS.some((param) => url.searchParams.has(param));
  } catch {
    return false;
  }
}

function isStandaloneMode(): boolean {
  return typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function usePWALastRoute() {
  const location = useLocation();
  const hasRestored = useRef(false);
  const isStandalone = isStandaloneMode();

  // Save current route when it changes (only in PWA mode)
  useEffect(() => {
    if (!isStandalone) return;

    const rawPath = `${location.pathname}${location.search}${location.hash}`;
    const path = sanitizeRoute(rawPath);

    // Don't save excluded routes
    if (EXCLUDED_ROUTES.some((route) => path.startsWith(route))) return;

    safeStorage.setItem(LAST_ROUTE_KEY, path);
  }, [location.pathname, location.search, location.hash, isStandalone]);

  const getLastRoute = (): string | null => {
    if (!isStandalone) return null;
    if (hasRestored.current) return null;

    hasRestored.current = true;
    const saved = safeStorage.getItem(LAST_ROUTE_KEY);
    return saved ? sanitizeRoute(saved) : null;
  };

  return { getLastRoute, isStandalone };
}

/**
 * Component to handle route restoration on PWA launch.
 * IMPORTANT: Also sanitizes volatile query params on ANY route on first boot,
 * not just '/'. This prevents the admin PWA from getting stuck on ?__chunk= URLs.
 */
export function PWARouteRestorer(): null {
  const location = useLocation();
  const navigate = useNavigate();
  const hasAttemptedRestore = useRef(false);

  useEffect(() => {
    if (hasAttemptedRestore.current) return;
    hasAttemptedRestore.current = true;

    const isStandalone = isStandaloneMode();
    if (!isStandalone) {
      // Even in non-standalone mode, strip volatile params from the URL
      // to prevent users landing on ?__chunk= bookmarked URLs
      if (currentUrlHasVolatileParams()) {
        const clean = sanitizeRoute(`${location.pathname}${location.search}${location.hash}`);
        if (clean !== `${location.pathname}${location.search}${location.hash}`) {
          navigate(clean, { replace: true });
        }
      }
      return;
    }

    // Step 1: Always sanitize volatile params from current URL first
    if (currentUrlHasVolatileParams()) {
      const clean = sanitizeRoute(`${location.pathname}${location.search}${location.hash}`);
      if (clean !== `${location.pathname}${location.search}${location.hash}`) {
        navigate(clean, { replace: true });
        // Don't attempt route restoration after sanitization — let the next
        // render cycle handle it if needed
        return;
      }
    }

    // Step 2: Sanitize stored route if dirty
    const storedRoute = safeStorage.getItem(LAST_ROUTE_KEY);
    if (storedRoute) {
      const cleanStored = sanitizeRoute(storedRoute);
      if (cleanStored !== storedRoute) {
        safeStorage.setItem(LAST_ROUTE_KEY, cleanStored);
      }
    }

    // Step 3: Only restore if we're on the home page (initial launch)
    if (location.pathname !== '/') return;

    if (!storedRoute) return;
    const lastRoute = sanitizeRoute(storedRoute);

    if (lastRoute !== '/' && !EXCLUDED_ROUTES.some((route) => lastRoute.startsWith(route))) {
      navigate(lastRoute, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
