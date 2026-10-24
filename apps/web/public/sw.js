// apps/web/public/sw.js
// HPC Jashore — Production Service Worker for PWA Offline Resilience & TV Kiosk Reliability
// Version 8: Native browser page navigation (no synthetic redirects) to completely prevent Chrome "This page couldn't load" errors.

const CACHE_NAME = 'hpc-cache-v8';

// Core shell static assets (immutable images, icons, and manifest only — NO HTML)
const CORE_SHELL_ASSETS = [
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Core shell cache error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass non-HTTP schemes (e.g. chrome-extension://, file://)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 2. Bypass SSE feeds, WebSockets, socket.io, and mutating requests
  if (
    url.pathname.includes('/sse/') ||
    url.pathname.includes('/socket.io/') ||
    url.pathname.includes('/api/events') ||
    event.request.headers.get('accept')?.includes('text/event-stream') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 3. Dynamic API requests strictly bypass Service Worker cache (Always Fresh Network)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 4. Next.js App Router RSC payload requests bypass Service Worker cache
  if (
    url.searchParams.has('_rsc') ||
    event.request.headers.get('RSC') === '1' ||
    event.request.headers.get('Next-Router-State-Tree')
  ) {
    return;
  }

  // 5. Navigation requests (HTML page navigations): Native Browser Navigation.
  // We NEVER intercept navigate requests in Service Worker, guaranteeing native browser redirect handling (301/302/307),
  // completely eliminating Chrome "This page couldn't load" and Safari WebKit 0 errors!
  if (event.request.mode === 'navigate') {
    return;
  }

  // 6. Cache-first / Stale-while-revalidate for static assets (images, fonts, static Next.js chunks)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            (networkResponse.status === 200 || networkResponse.type === 'opaque') &&
            !networkResponse.redirected
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      if (cachedResponse) {
        return cachedResponse;
      }
      return fetchPromise.then((res) => {
        if (res) return res;
        return new Response('', { status: 404, statusText: 'Not Found' });
      });
    })
  );
});
