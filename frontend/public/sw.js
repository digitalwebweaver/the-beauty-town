// Service worker for The Beauty Town back-office PWA.
//
// Deliberately minimal and NOT a Workbox/offline-caching setup — this is an
// internal back-office tool where "always load the current version" matters
// more than working offline, so there's no fetch-intercepting cache here.
// Its job for now is just to exist (a PWA can't be installed without one)
// and to activate itself immediately, so future updates take effect on the
// very next load rather than the next-next load.
//
// Push notification handling is added in a later phase.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A push arrived while the app may not even be open — this is the entire
// point of the feature (see backend/src/api/push/push.service.ts for what
// sends these). Payload shape: { title, body, url }.
self.addEventListener('push', (event) => {
  let payload = { title: 'The Beauty Town', body: '' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Not JSON (shouldn't happen — every sender here always sends JSON) —
    // fall back to the plain-text body rather than dropping the notification.
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/brand/icons/icon-192.png',
      badge: '/brand/icons/icon-192.png',
      data: { url: payload.url || '/' },
    })
  );
});

// Clicking the notification focuses an already-open tab if there is one,
// rather than always spawning a new window.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
