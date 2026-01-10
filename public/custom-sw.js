// Custom Service Worker for Push Notifications
// This file is imported by the Workbox-generated service worker

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

// Log when service worker is installed
self.addEventListener('install', (event) => {
  console.log('[Eclipse SW] Custom push handler installed');
  self.skipWaiting();
});

// Log when service worker is activated
self.addEventListener('activate', (event) => {
  console.log('[Eclipse SW] Custom push handler activated');
  event.waitUntil(clients.claim());
});
