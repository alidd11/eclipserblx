// Custom Service Worker for Push Notifications + Cache Busting
// This file is imported by the Workbox-generated service worker

const SW_VERSION = '1.0.1';
const CACHE_PREFIX = 'eclipse-v';

// Clear old caches on activation (cache busting)
const clearOldCaches = async () => {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => {
    // Keep only current version caches and workbox caches
    if (name.startsWith('workbox-')) return false;
    if (name === 'supabase-cache') return false;
    if (name === 'image-cache') return false;
    if (name === 'font-cache') return false;
    // Clear any other stale caches
    return true;
  });
  
  console.log('[Eclipse SW] Clearing old caches:', oldCaches);
  return Promise.all(oldCaches.map(cache => caches.delete(cache)));
};

// Force refresh all clients when a new SW activates
const refreshAllClients = async () => {
  const clientsList = await clients.matchAll({ type: 'window' });
  console.log('[Eclipse SW] Notifying', clientsList.length, 'clients of update');
  
  clientsList.forEach(client => {
    // Post message to trigger refresh in the app
    client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
  });
};

// Handle push events (when notification arrives while app is closed/background)
self.addEventListener('push', (event) => {
  console.log('[Eclipse SW] Push event received');
  
  // Always show a notification to comply with browser requirements
  const showNotification = async () => {
    let title = 'Eclipse';
    let options = {
      body: 'You have a new notification',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      // Use a unique tag by default so multiple notifications are shown (some platforms collapse same-tag notifications)
      tag: 'eclipse-' + Date.now(),
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: { url: '/' }
    };

    if (event.data) {
      try {
        const data = event.data.json();
        console.log('[Eclipse SW] Push data:', JSON.stringify(data));
        
        title = data.title || title;
        options = {
          body: data.body || options.body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: data.tag || 'eclipse-' + Date.now(),
          renotify: true,
          requireInteraction: data.requireInteraction === true,
          vibrate: [200, 100, 200],
          silent: false,
          data: {
            url: data.url || '/',
            ...data.data
          }
        };
      } catch (e) {
        console.log('[Eclipse SW] Failed to parse push data as JSON, using text');
        try {
          options.body = event.data.text();
        } catch (textError) {
          console.error('[Eclipse SW] Failed to get text from push data');
        }
      }
    }

    console.log('[Eclipse SW] Showing notification:', title, options);
    return self.registration.showNotification(title, options);
  };

  event.waitUntil(showNotification());
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Eclipse SW] Notification clicked');
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            if (focusedClient && urlToOpen !== '/') {
              return focusedClient.navigate(fullUrl);
            }
          });
        }
      }
      
      // Open a new window if none found
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Eclipse SW] Notification closed');
});

// Handle push subscription change (e.g., when browser refreshes the subscription)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Eclipse SW] Push subscription changed');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    }).then((subscription) => {
      console.log('[Eclipse SW] Re-subscribed successfully');
      // The main app will need to sync this new subscription to the database
      // This happens automatically when the user opens the app next time
    }).catch((error) => {
      console.error('[Eclipse SW] Failed to re-subscribe:', error);
    })
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[Eclipse SW] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[Eclipse SW] Skip waiting requested');
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    console.log('[Eclipse SW] Clear cache requested');
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('[Eclipse SW] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('[Eclipse SW] All caches cleared');
        // Notify the client that caches are cleared
        if (event.source) {
          event.source.postMessage({ type: 'CACHE_CLEARED' });
        }
      })
    );
  }
  
  if (event.data?.type === 'GET_VERSION') {
    if (event.source) {
      event.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
    }
  }
});

// Handle fetch with network-first for navigation requests (prevents stale HTML)
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests specially
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response for caching
          const responseClone = response.clone();
          caches.open('navigation-cache').then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
  }
  // Let Workbox handle other requests
});

// Log when service worker is installed
self.addEventListener('install', (event) => {
  console.log('[Eclipse SW] Installing version:', SW_VERSION);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Log when service worker is activated
self.addEventListener('activate', (event) => {
  console.log('[Eclipse SW] Activating version:', SW_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clear old caches
      clearOldCaches(),
      // Take control of all clients immediately
      clients.claim(),
      // Enable navigation preload if available
      (async () => {
        if ('navigationPreload' in self.registration) {
          await self.registration.navigationPreload.enable();
          console.log('[Eclipse SW] Navigation preload enabled');
        }
      })(),
    ]).then(() => {
      // Notify all clients that SW has been updated
      refreshAllClients();
    })
  );
});
