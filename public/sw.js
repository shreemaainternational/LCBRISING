// Minimal service worker for LCBRS Pay PWA.
// Caches the app shell and the most recent successfully-visited
// payment pages so that customers can still see their invoice
// (read-only) when the network drops mid-transaction.

const VERSION = 'lcbrs-pwa-v2';
const SHELL = [
  '/m',
  '/m/activities',
  '/m/checkin',
  '/m/beneficiaries',
  '/m/reports',
  '/m/profile',
  '/portal/login',
  '/invoices/lookup',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Stale-while-revalidate for app pages.
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req);
      const fresh = fetch(req).then((res) => {
        if (res.ok && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fresh;
    }),
  );
});

// --- Web Push -------------------------------------------------------
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { title: 'LCBRS', body: event.data && event.data.text() }; }
  const title = payload.title || 'Lions Club';
  const opts = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.svg',
    badge: payload.badge || '/icons/icon-192.svg',
    tag: payload.tag,
    data: { url: payload.url || '/m', ...(payload.data || {}) },
    actions: payload.actions || [],
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/m';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((all) => {
      const existing = all.find((c) => c.url.includes(new URL(url, self.location.origin).pathname));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});
