/* ── La Crema Multiservicios — Service Worker v3 ──
   Bump CACHE_VERSION to force update on all devices     */
const CACHE_VERSION = 'lcm-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './bhd-logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

/* Install: cache shell */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

/* Activate: purge old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch: network-first for HTML (always fresh), cache-first for assets */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  const isHTML = e.request.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    /* Network-first for index.html — ensures updates load */
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    /* Cache-first for icons, fonts, etc. */
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp?.status === 200 && resp.type === 'basic') {
            caches.open(CACHE_VERSION).then(c => c.put(e.request, resp.clone()));
          }
          return resp;
        });
      }).catch(() => caches.match('./index.html'))
    );
  }
});

/* Message from page: skip waiting (force update) */
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
