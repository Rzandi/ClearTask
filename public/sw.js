/* ═══════════════════════════════════════════════════════════
   Service Worker — ClearTask PWA
   Cache-first for assets, Network-first for navigation
   ═══════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `cleartask-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `cleartask-dynamic-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

// ─── Install ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing ClearTask SW...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating ClearTask SW...');
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== STATIC_CACHE && n !== DYNAMIC_CACHE)
          .map((n) => {
            console.log('[SW] Deleting old cache:', n);
            return caches.delete(n);
          })
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // Static assets: cache-first
  if (url.pathname.match(/\.(css|js|png|jpg|svg|woff2|ico)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML navigation: network-first
  if (request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('/offline.html');
  }
}
