// Custom Service Worker for Push Notifications + Cache Busting + Offline Support
// This file is imported by the Workbox-generated service worker

const SW_VERSION = '1.0.8';
const OFFLINE_CACHE = 'offline-v1';
const OFFLINE_URL = '/offline.html';
// Short-lived navigation cache: max 60s to prevent stale HTML loops after deployments
const NAV_CACHE = 'navigation-cache-v2';
const NAV_CACHE_MAX_AGE = 60000; // 60 seconds

// Clear ALL caches on activation - full reset for every new SW version
const clearOldCaches = async () => {
  const cacheNames = await caches.keys();
  console.log('[Eclipse SW] Force-clearing ALL caches:', cacheNames);
  return Promise.all(cacheNames.map(cache => caches.delete(cache)));
};

// Force refresh all clients when a new SW activates
const refreshAllClients = async () => {
  const clientsList = await clients.matchAll({ type: 'window' });
  console.log('[Eclipse SW] Notifying', clientsList.length, 'clients of update');
  clientsList.forEach(client => {
    client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
  });
};

// Handle push events
self.addEventListener('push', (event) => {
  console.log('[Eclipse SW] Push event received');
  const showNotification = async () => {
    let title = 'Eclipse';
    let options = {
      body: 'You have a new notification',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'eclipse-' + Date.now(),
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: { url: '/' }
    };

    if (event.data) {
      try {
        const data = event.data.json();
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
          data: { url: data.url || '/', ...data.data }
        };
      } catch (e) {
        try { options.body = event.data.text(); } catch {}
      }
    }
    return self.registration.showNotification(title, options);
  };
  event.waitUntil(showNotification());
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            if (focusedClient && urlToOpen !== '/') return focusedClient.navigate(fullUrl);
          });
        }
      }
      if (clients.openWindow) return clients.openWindow(fullUrl);
    })
  );
});

self.addEventListener('notificationclose', () => {});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    }).catch(() => {})
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames =>
        Promise.all(cacheNames.map(name => caches.delete(name)))
      ).then(() => {
        if (event.source) event.source.postMessage({ type: 'CACHE_CLEARED' });
      })
    );
  }
  if (event.data?.type === 'GET_VERSION') {
    if (event.source) event.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
  }
});

// Network-first for navigation, with short-lived cache fallback only
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response.ok && response.status >= 500) {
            throw new Error(`Server error: ${response.status}`);
          }
          // Cache with timestamp header for age checking
          const responseClone = response.clone();
          caches.open(NAV_CACHE).then(cache => {
            const headers = new Headers(responseClone.headers);
            headers.set('sw-cache-time', Date.now().toString());
            const timedResponse = new Response(responseClone.body, {
              status: responseClone.status,
              statusText: responseClone.statusText,
              headers
            });
            cache.put(event.request, timedResponse);
          });
          return response;
        })
        .catch(async () => {
          // Only use cached navigation if it's recent (< 60s old)
          const cache = await caches.open(NAV_CACHE);
          const cached = await cache.match(event.request);
          if (cached) {
            const cacheTime = parseInt(cached.headers.get('sw-cache-time') || '0', 10);
            if (Date.now() - cacheTime < NAV_CACHE_MAX_AGE) {
              return cached;
            }
            // Stale — delete it to prevent serving old HTML with wrong chunk hashes
            await cache.delete(event.request);
          }

          // Offline fallback chain
          const offlineCache = await caches.open(OFFLINE_CACHE);
          const offlinePage = await offlineCache.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;

          const indexCache = await caches.match('/index.html');
          if (indexCache) return indexCache;

          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="background:#0a0a0f;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h1>You\'re Offline</h1><p>Please check your connection and try again.</p><button onclick="location.reload()" style="padding:10px 20px;background:#7c3aed;color:white;border:none;border-radius:8px;cursor:pointer;">Retry</button></div></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
  }
});

// Install
self.addEventListener('install', (event) => {
  console.log('[Eclipse SW] Installing version:', SW_VERSION);
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then(cache => cache.add(OFFLINE_URL))
  );
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('[Eclipse SW] Activating version:', SW_VERSION);
  event.waitUntil(
    Promise.all([
      clearOldCaches(),
      clients.claim(),
      (async () => {
        if ('navigationPreload' in self.registration) {
          await self.registration.navigationPreload.enable();
        }
      })(),
    ]).then(() => refreshAllClients())
  );
});
