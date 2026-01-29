import { Capacitor } from '@capacitor/core';

/**
 * Opens an external URL in the appropriate browser based on the platform:
 * - Native Capacitor app: Uses SFSafariViewController (iOS) or Chrome Custom Tabs (Android)
 * - PWA standalone mode: Uses anchor tag with target="_blank" to attempt Safari opening
 * - Regular browser: Opens in new tab with window.open
 * 
 * Note: iOS PWAs have limitations - window.location.href navigates within the PWA,
 * and window.open may open an in-app browser. Using an anchor tag with _blank
 * sometimes works better on iOS 15.4+.
 */
export async function openExternalUrl(url: string): Promise<void> {
  // Native Capacitor app - use Browser plugin for best experience
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return;
  }
  
  // PWA standalone mode - use anchor click technique
  // This has better Safari compatibility on iOS 15.4+ than window.location.href
  if (isStandalonePWA()) {
    // Create a temporary anchor and click it
    // This technique sometimes opens Safari on iOS instead of in-app browser
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    
    // For OAuth flows, we need to ensure the callback can return
    // Store a flag to help with safe-area recalculation on return
    sessionStorage.setItem('pwa-external-navigation', 'true');
    
    // Trigger click
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    
    // Fallback: if the anchor click didn't navigate away,
    // use location.href after a short delay
    setTimeout(() => {
      if (document.hasFocus()) {
        window.location.href = url;
      }
    }, 100);
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

/**
 * Force recalculate viewport and safe-areas after returning from external navigation.
 * Call this on visibility change or page show events in PWA.
 */
export function recalculatePWAViewport(): void {
  if (!isStandalonePWA()) return;
  
  const html = document.documentElement;
  const body = document.body;
  
  // Force a reflow by reading and writing styles
  const themeBg = 'hsl(var(--background))';
  
  // Temporarily remove and re-add styles to force recalculation
  html.style.removeProperty('background-color');
  body.style.removeProperty('background-color');
  
  // Force synchronous reflow
  void html.offsetHeight;
  
  // Reapply
  html.style.backgroundColor = themeBg;
  body.style.backgroundColor = themeBg;
  
  // Also dispatch a resize event to trigger any viewport-dependent layouts
  window.dispatchEvent(new Event('resize'));
  
  // Scroll to trigger safe-area recalculation
  if (window.scrollY === 0) {
    window.scrollTo(0, 1);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  }
}
