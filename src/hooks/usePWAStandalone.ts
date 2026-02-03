import { useState, useEffect } from 'react';

interface PWAStandaloneState {
  isStandalone: boolean;
  isLoading: boolean;
}

/**
 * Hook to detect if the app is running in PWA standalone mode
 * Returns isStandalone: true when running as installed PWA
 */
export function usePWAStandalone(): PWAStandaloneState {
  const [state, setState] = useState<PWAStandaloneState>({
    isStandalone: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check for standalone mode using multiple detection methods
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setState({
      isStandalone,
      isLoading: false,
    });

    // Listen for changes (e.g., if user switches display modes)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setState({
        isStandalone: e.matches || (window.navigator as any).standalone === true,
        isLoading: false,
      });
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return state;
}
