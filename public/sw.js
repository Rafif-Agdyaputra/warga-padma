self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* gunakan teks bawaan */ }
  const target = typeof data.target === 'string' && /^\/warga(?:\/|$)/.test(data.target) && !data.target.startsWith('//') ? data.target : '/warga/notifikasi';
  event.waitUntil(self.registration.showNotification('Warga Padma', { body: 'Ada pembaruan untuk Anda. Buka aplikasi untuk melihatnya.', icon: '/icon-192.png', badge: '/icon-192.png', data: { target } }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.target || '/warga/notifikasi', self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(self.clients.openWindow(target.href));
});
