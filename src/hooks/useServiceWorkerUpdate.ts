import { useEffect, useCallback, useRef } from 'react';
import { showSuccessNotification, showInfoNotification, showNativeNotification } from '@/lib/nativeNotification';
import { safeStorage } from '@/lib/safeStorage';

interface UseServiceWorkerUpdateOptions {
  showNotifications?: boolean;
  /**
   * When true, reloads the page once after a new service worker takes control.
   * Useful for PWAs so users automatically get the latest assets.
   */
  autoReloadOnUpdate?: boolean;
}

export const useServiceWorkerUpdate = (options: UseServiceWorkerUpdateOptions = {}) => {
  const { showNotifications = true, autoReloadOnUpdate = false } = options;
  const didReloadRef = useRef(false);

  // Send message to service worker
  const sendMessageToSW = useCallback((message: { type: string; [key: string]: unknown }) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    }
  }, []);

  // Clear all caches manually
  const clearAllCaches = useCallback(() => {
    sendMessageToSW({ type: 'CLEAR_CACHE' });

    // Also clear browser caches directly as fallback
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }

    // Clear localStorage cache markers
    safeStorage.removeItem('sw-cache-timestamp');
  }, [sendMessageToSW]);

  // Force update the service worker
  const forceUpdate = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();

        if (registration.waiting) {
          // Tell the waiting SW to skip waiting
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }
  }, []);

  // Listen for SW messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      console.log('[App] SW message received:', event.data);

      if (event.data?.type === 'SW_UPDATED' && showNotifications) {
        // Show native notification for app update
        showInfoNotification('App Updated!', 'A new version is available. Reload to update.');
      }

      if (event.data?.type === 'CACHE_CLEARED' && showNotifications) {
        showSuccessNotification('Cache Cleared', 'App cache has been refreshed');
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Check for waiting service worker on mount
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting && showNotifications) {
        // There's an update waiting
        showInfoNotification('Update Available', 'Reload to get the latest version');
      }
    });

    // Listen for controller change (SW activated) - no auto-reload
    const handleControllerChange = () => {
      console.log('[App] SW controller changed - update available');

      // Auto-reload (PWA) to ensure new bundles/assets are used immediately.
      if (autoReloadOnUpdate && !didReloadRef.current) {
        didReloadRef.current = true;
        window.location.reload();
        return;
      }

      // Otherwise, don't auto-reload - let user decide when to refresh
      if (showNotifications && !didReloadRef.current) {
        didReloadRef.current = true;
        showInfoNotification('Update Ready', 'Refresh the page to apply the latest update');
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [showNotifications, autoReloadOnUpdate]);

  return {
    clearAllCaches,
    forceUpdate,
    sendMessageToSW,
  };
};

