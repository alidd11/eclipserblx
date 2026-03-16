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

function hasVolatileParams(path: string): boolean {
  try {
    const url = new URL(path, window.location.origin);
    return VOLATILE_QUERY_PARAMS.some((param) => url.searchParams.has(param));
  } catch {
    return false;
  }
}

export function usePWALastRoute() {
  const location = useLocation();
  const hasRestored = useRef(false);

  // Check if running as standalone PWA
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  // Save current route when it changes (only in PWA mode)
  useEffect(() => {
    if (!isStandalone) return;

    const rawPath = `${location.pathname}${location.search}${location.hash}`;
    const path = sanitizeRoute(rawPath);

    // Don't save excluded routes
    if (EXCLUDED_ROUTES.some((route) => path.startsWith(route))) return;

    safeStorage.setItem(LAST_ROUTE_KEY, path);
  }, [location.pathname, location.search, location.hash, isStandalone]);

  // Get the saved route for restoration
  const getLastRoute = (): string | null => {
    if (!isStandalone) return null;
    if (hasRestored.current) return null;

    hasRestored.current = true;
    const saved = safeStorage.getItem(LAST_ROUTE_KEY);
    return saved ? sanitizeRoute(saved) : null;
  };

  return { getLastRoute, isStandalone };
}

// Component to handle route restoration on PWA launch
export function PWARouteRestorer() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasAttemptedRestore = useRef(false);

  useEffect(() => {
    if (hasAttemptedRestore.current) return;
    hasAttemptedRestore.current = true;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    // Only restore if we're on the home page (initial launch)
    if (location.pathname !== '/') return;

    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    if (hasVolatileParams(currentPath)) {
      const cleanedCurrent = sanitizeRoute(currentPath);
      if (cleanedCurrent !== currentPath) {
        navigate(cleanedCurrent, { replace: true });
        return;
      }
    }

    const storedRoute = safeStorage.getItem(LAST_ROUTE_KEY);
    if (!storedRoute) return;

    const lastRoute = sanitizeRoute(storedRoute);
    if (lastRoute !== storedRoute) {
      safeStorage.setItem(LAST_ROUTE_KEY, lastRoute);
    }

    if (lastRoute !== '/' && !EXCLUDED_ROUTES.some((route) => lastRoute.startsWith(route))) {
      // Use React Router navigation instead of reload
      navigate(lastRoute, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
