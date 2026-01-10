import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ADMIN_PWA_KEY = 'eclipse_admin_pwa';

/**
 * Marks the PWA as installed from admin context
 * Call this when staff logs in or visits admin pages
 */
export function markAdminPWA() {
  try {
    localStorage.setItem(ADMIN_PWA_KEY, 'true');
  } catch {
    // localStorage might not be available
  }
}

/**
 * Clears the admin PWA marker
 */
export function clearAdminPWA() {
  try {
    localStorage.removeItem(ADMIN_PWA_KEY);
  } catch {
    // localStorage might not be available
  }
}

/**
 * Checks if this PWA was installed from admin context
 */
export function isAdminPWA(): boolean {
  try {
    return localStorage.getItem(ADMIN_PWA_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Hook to redirect to admin dashboard if:
 * 1. User is on the root page
 * 2. PWA was installed from admin context
 * 3. App is running in standalone mode (installed PWA)
 */
export function usePWAAdminRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only run on root path
    if (location.pathname !== '/') return;

    // Check if running as installed PWA
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    // Check if this is an admin PWA installation
    if (isAdminPWA()) {
      navigate('/admin/login', { replace: true });
    }
  }, [location.pathname, navigate]);
}
