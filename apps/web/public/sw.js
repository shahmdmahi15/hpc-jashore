// apps/web/public/sw.js
// HPC Jashore — Service Worker for PWA Offline Resilience & TV Kiosk Reliability

const CACHE_NAME = 'hpc-cache-v5';

// Core shell assets that are guaranteed to exist statically
const CORE_SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/hpclogo-transparent.png',
];

// Secondary dynamic pages to pre-cache opportunistically
const SECONDARY_PAGES = [
  '/tv',
  '/admin',
  '/auth/login',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Reliably cache core shell assets
      await cache.addAll(CORE_SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Core shell cache error:', err);
      });

      // 2. Opportunistically cache secondary routes without breaking install if offline/auth
      await Promise.all(
        SECONDARY_PAGES.map((url) =>
          fetch(url, { credentials: 'same-origin' })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass non-HTTP schemes (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 2. Bypass SSE feeds, WebSockets, socket.io, and mutating POST/PUT/DELETE requests
  if (
    url.pathname.includes('/sse/') ||
    url.pathname.includes('/socket.io/') ||
    url.pathname.includes('/api/events') ||
    event.request.headers.get('accept')?.includes('text/event-stream') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 3. Network-first strategy for HTML page navigations (Landing, TV, Admin, Auth)
  const isNavigateRequest =
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.startsWith('/tv') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/auth/');

  if (isNavigateRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedMatch = await caches.match(event.request);
          if (cachedMatch) return cachedMatch;
          // Fallback to cached root shell
          return caches.match('/');
        })
    );
    return;
  }

  // 4. Network-first strategy for API reads
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 5. Stale-while-revalidate for static assets, fonts, icons, and Next.js static bundles
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
