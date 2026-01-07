// Custom Service Worker for Push Notifications

// Handle push events (when notification arrives while app is closed/background)
self.addEventListener('push', (event) => {
  console.log('[Custom SW] Push event received:', event);
  
  if (!event.data) {
    console.log('[Custom SW] No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Custom SW] Push data:', data);

    const options = {
      body: data.body || 'New notification',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag || 'default',
      data: {
        url: data.url || '/',
        ...data.data
      },
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Eclipse', options)
    );
  } catch (error) {
    console.error('[Custom SW] Error processing push:', error);
    
    // Fallback for plain text
    event.waitUntil(
      self.registration.showNotification('Eclipse', {
        body: event.data.text(),
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png'
      })
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Custom SW] Notification clicked:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      
      // Open a new window if none found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Custom SW] Notification closed:', event);
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Custom SW] Push subscription changed:', event);
  
  // Re-subscribe with the new subscription
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    }).then((subscription) => {
      console.log('[Custom SW] Re-subscribed:', subscription);
      // Note: The app will need to update the server with the new subscription
    }).catch((error) => {
      console.error('[Custom SW] Failed to re-subscribe:', error);
    })
  );
});
