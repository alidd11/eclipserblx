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
 * Detects if the current manifest is the admin manifest
 * by checking the manifest link href
 */
function isAdminManifest(): boolean {
  const manifestLink = document.querySelector('link[rel="manifest"]');
  return manifestLink?.getAttribute('href')?.includes('manifest-admin') || false;
}

/**
 * Hook to redirect to admin dashboard if:
 * 1. User is on the root page
 * 2. App is running in standalone mode (installed PWA)
 * 3. Either: PWA was installed from admin context OR admin manifest is active
 */
export function usePWAAdminRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if running as installed PWA
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    // If we're already on an admin route, mark as admin PWA
    if (location.pathname.startsWith('/admin')) {
      markAdminPWA();
      return;
    }

    // Only redirect if on root path
    if (location.pathname !== '/') return;

    // Check if this is an admin PWA installation
    if (isAdminPWA() || isAdminManifest()) {
      markAdminPWA();
      navigate('/admin', { replace: true });
    }
  }, [location.pathname, navigate]);
}
