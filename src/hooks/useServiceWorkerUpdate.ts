import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export const useServiceWorkerUpdate = () => {
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
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    
    // Clear localStorage cache markers
    localStorage.removeItem('sw-cache-timestamp');
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
      
      if (event.data?.type === 'SW_UPDATED') {
        // Show toast offering to reload
        toast.info('App updated!', {
          description: 'A new version is available.',
          action: {
            label: 'Reload',
            onClick: () => window.location.reload(),
          },
          duration: 10000,
        });
      }
      
      if (event.data?.type === 'CACHE_CLEARED') {
        toast.success('Cache cleared successfully');
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Check for waiting service worker on mount
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration?.waiting) {
        // There's an update waiting, offer to reload
        toast.info('Update available', {
          description: 'Reload to get the latest version.',
          action: {
            label: 'Reload',
            onClick: () => {
              registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            },
          },
          duration: 15000,
        });
      }
    });

    // Listen for controller change (SW activated)
    const handleControllerChange = () => {
      console.log('[App] SW controller changed, reloading...');
      // Auto-reload when SW takes control
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return {
    clearAllCaches,
    forceUpdate,
    sendMessageToSW,
  };
};
