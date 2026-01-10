import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Dynamically injects and switches the PWA manifest based on the current route.
 * - Admin routes (/admin/*) use manifest-admin.json with start_url: /admin
 * - All other routes use manifest.webmanifest with start_url: /
 * 
 * IMPORTANT: VitePWA manifest injection is disabled, so this hook is responsible
 * for creating and managing the manifest link element.
 */
export function useAdminManifest() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const hasInitialized = useRef(false);

  useEffect(() => {
    const targetManifest = isAdminRoute ? '/manifest-admin.json' : '/manifest.webmanifest';
    
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    
    if (!manifestLink) {
      // Create manifest link if it doesn't exist
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = targetManifest;
      document.head.appendChild(manifestLink);
      hasInitialized.current = true;
    } else if (manifestLink.getAttribute('href') !== targetManifest) {
      // Update existing manifest link
      manifestLink.setAttribute('href', targetManifest);
    }

    // Update theme-color for admin
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isAdminRoute ? '#7c3aed' : '#1a1a2e');
    }

    // Update apple-mobile-web-app-title
    const appTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appTitleMeta) {
      appTitleMeta.setAttribute('content', isAdminRoute ? 'Eclipse Admin' : 'Eclipse');
    }

    // Update application-name
    const appNameMeta = document.querySelector('meta[name="application-name"]');
    if (appNameMeta) {
      appNameMeta.setAttribute('content', isAdminRoute ? 'Eclipse Admin' : 'Eclipse');
    }

    // Update apple-touch-icon for iOS
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleTouchIcon) {
      appleTouchIcon.setAttribute('href', isAdminRoute ? '/admin-apple-touch-icon.png' : '/apple-touch-icon.png');
    }
  }, [isAdminRoute]);
}
