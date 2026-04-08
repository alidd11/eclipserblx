// Custom Service Worker for Push Notifications + Cache Busting + Offline Support
// This file is imported by the Workbox-generated service worker

const SW_VERSION = '1.3.0';
const OFFLINE_CACHE = 'offline-v1';
const OFFLINE_URL = '/offline.html';

// Caches that should be purged on every activation (stale API data causes boot failures)
const PURGE_CACHES = ['supabase-cache'];

// Clear ALL caches on activation - full reset for every new SW version
const clearOldCaches = async () => {
  const cacheNames = await caches.keys();
  // Always purge known-bad caches; clear all others on version change
  const toPurge = cacheNames.filter(name => PURGE_CACHES.includes(name));
  console.log('[Eclipse SW] Force-clearing caches:', cacheNames);
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

// Network-first for navigation (Safari-safe): no HTML stream rewriting / no nav cache reuse
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith((async () => {
    try {
      // Prefer navigation preload when available (enabled in activate)
      const preload = await event.preloadResponse;
      if (preload) return preload;

      const response = await fetch(event.request);
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
      return response;
    } catch {
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
    }
  })());
});

// Install — resilient: if offline.html fetch fails, cache inline fallback instead
self.addEventListener('install', (event) => {
  console.log('[Eclipse SW] Installing version:', SW_VERSION);
  self.skipWaiting();
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then(async (cache) => {
      try {
        const resp = await fetch(OFFLINE_URL, { cache: 'no-store' });
        if (resp.ok) {
          await cache.put(OFFLINE_URL, resp);
          return;
        }
      } catch (e) {
        console.warn('[Eclipse SW] offline.html fetch failed, using inline fallback');
      }
      // Cache an inline fallback so install never fails
      const fallback = new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="background:#0a0a0f;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h1>You\'re Offline</h1><p>Please check your connection and try again.</p><button onclick="location.reload()" style="padding:10px 20px;background:#7c3aed;color:white;border:none;border-radius:8px;cursor:pointer;">Retry</button></div></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
      await cache.put(OFFLINE_URL, fallback);
    })
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
