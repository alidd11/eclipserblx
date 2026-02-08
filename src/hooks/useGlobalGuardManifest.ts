import { useEffect } from 'react';
import { useGlobalGuardDomain } from './useGlobalGuardDomain';

/**
 * Dynamically injects and switches the PWA manifest for Global Guard subdomain.
 * - Global Guard routes use manifest-global-guard.json
 * - Updates theme color and app name meta tags
 */
export function useGlobalGuardManifest() {
  const { isGlobalGuardDomain } = useGlobalGuardDomain();

  useEffect(() => {
    if (!isGlobalGuardDomain) return;

    const targetManifest = '/manifest-global-guard.json';
    
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = targetManifest;
      document.head.appendChild(manifestLink);
    } else if (manifestLink.getAttribute('href') !== targetManifest) {
      manifestLink.setAttribute('href', targetManifest);
    }

    // Update theme-color for Global Guard (deep blue)
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#1e40af');
    }

    // Update apple-mobile-web-app-title
    const appTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appTitleMeta) {
      appTitleMeta.setAttribute('content', 'Global Guard');
    }

    // Update application-name
    const appNameMeta = document.querySelector('meta[name="application-name"]');
    if (appNameMeta) {
      appNameMeta.setAttribute('content', 'Global Guard');
    }

    // Update document title
    document.title = 'Global Guard - Cross-Server Ban Management';
  }, [isGlobalGuardDomain]);
}
