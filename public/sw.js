// Food Storage service worker: shows push notifications (API ADR 0004) and opens the app when one
// is tapped. It caches nothing: the app always loads fresh from the server.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {
    msg = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(msg.title || 'Food Storage', {
      body: msg.body || '',
      tag: msg.tag || 'food-storage',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: msg.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of windows) {
        if (w.url.startsWith(self.location.origin)) {
          await w.focus();
          return w.navigate(url);
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
