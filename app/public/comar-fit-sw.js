self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { notification: { body: event.data.text() } }; }
  const notification = payload.notification || payload.data || {};
  event.waitUntil(self.registration.showNotification(notification.title || 'Comar-Fit', {
    body: notification.body || 'Tienes una nueva actualización.',
    icon: '/comar-fit-app-icon.png',
    badge: '/comar-fit-favicon.png',
    tag: notification.tag || 'comar-fit-update',
    data: { url: notification.url || payload.data?.url || '/dashboard' },
  }));
});
