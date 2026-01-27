import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { safeStorage } from '@/lib/safeStorage';

const LAST_ROUTE_KEY = 'pwa-last-route';
const EXCLUDED_ROUTES = ['/auth', '/admin/login', '/order-success'];

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
    
    const path = location.pathname + location.search;
    
    // Don't save excluded routes
    if (EXCLUDED_ROUTES.some(route => path.startsWith(route))) return;
    
    safeStorage.setItem(LAST_ROUTE_KEY, path);
  }, [location.pathname, location.search, isStandalone]);

  // Get the saved route for restoration
  const getLastRoute = (): string | null => {
    if (!isStandalone) return null;
    if (hasRestored.current) return null;
    
    hasRestored.current = true;
    return safeStorage.getItem(LAST_ROUTE_KEY);
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

    const lastRoute = safeStorage.getItem(LAST_ROUTE_KEY);
    
    if (lastRoute && lastRoute !== '/' && !EXCLUDED_ROUTES.some(route => lastRoute.startsWith(route))) {
      // Use React Router navigation instead of reload
      navigate(lastRoute, { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
