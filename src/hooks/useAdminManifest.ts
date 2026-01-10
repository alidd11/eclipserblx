import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Dynamically switches the PWA manifest based on the current route.
 * - Admin routes (/admin/*) use manifest-admin.json
 * - All other routes use the default manifest from Vite PWA plugin
 */
export function useAdminManifest() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    
    if (!manifestLink) {
      // Create manifest link if it doesn't exist
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = isAdminRoute ? '/manifest-admin.json' : '/manifest.webmanifest';
      document.head.appendChild(link);
    } else {
      // Update existing manifest link
      const targetManifest = isAdminRoute ? '/manifest-admin.json' : '/manifest.webmanifest';
      if (manifestLink.getAttribute('href') !== targetManifest) {
        manifestLink.setAttribute('href', targetManifest);
      }
    }

    // Also update theme-color for admin
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
