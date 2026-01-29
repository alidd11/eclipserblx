import { Capacitor } from '@capacitor/core';

/**
 * Opens an external URL in the appropriate browser based on the platform:
 * - Native Capacitor app: Uses SFSafariViewController (iOS) or Chrome Custom Tabs (Android)
 * - PWA standalone mode: Uses window.location.href (required for iOS PWA)
 * - Regular browser: Opens in new tab with window.open
 */
export async function openExternalUrl(url: string): Promise<void> {
  // Native Capacitor app - use Browser plugin for best experience
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return;
  }
  
  // PWA standalone mode - use location.href 
  // (iOS PWA doesn't properly support window.open to Safari)
  if (isStandalonePWA()) {
    window.location.href = url;
    return;
  }
  
  // Regular browser - open in new tab
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Checks if the app is running as a standalone PWA (installed to home screen)
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}
