// apps/web/public/sw.js
// HPC Jashore — Service Worker for PWA Offline Resilience & TV Kiosk Reliability

const CACHE_NAME = 'hpc-cache-v6';

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

// Public routes to pre-cache opportunistically
const SECONDARY_PAGES = [
  '/tv',
  '/auth/login',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Reliably cache core shell assets
      await cache.addAll(CORE_SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Core shell cache error:', err);
      });

      // 2. Opportunistically cache public routes without breaking install if redirected
      await Promise.all(
        SECONDARY_PAGES.map((url) =>
          fetch(url, { credentials: 'same-origin' })
            .then((res) => {
              if (res.ok && !res.redirected) return cache.put(url, res);
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

  // 1. Bypass non-HTTP schemes (e.g. chrome-extension://, file://)
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

  // 5. Navigation requests (HTML page navigations and URL loads)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse) {
            return new Response('Network unavailable', { status: 503 });
          }
          // CRITICAL FOR SAFARI / WEBKIT (iOS & macOS):
          // In Safari, if a response followed any HTTP redirect (e.g. 307 /admin -> /auth/login),
          // returning it directly to event.respondWith throws:
          // "Response served by service worker has redirections" (WebKitServiceWorker: 0).
          // Reconstructing a brand-new Response object strips the internal 'redirected: true'
          // flag, allowing Safari to cleanly render the page without "This page couldn't load"!
          if (networkResponse.redirected) {
            return new Response(networkResponse.body, {
              status: networkResponse.status,
              statusText: networkResponse.statusText,
              headers: networkResponse.headers,
            });
          }
          // Cache successful non-redirected navigation pages
          if (networkResponse.status === 200 && !networkResponse.redirected) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedMatch = (await cache.match(event.request)) || (await cache.match('/'));
          if (cachedMatch) {
            return new Response(cachedMatch.body, {
              status: cachedMatch.status,
              statusText: cachedMatch.statusText,
              headers: cachedMatch.headers,
            });
          }
          return new Response(
            '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - HPC</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center;background:#09090b;color:#f4f4f5"><h2>Network Offline</h2><p>Please check your internet connection and reload.</p><button onclick="window.location.reload()" style="padding:0.6rem 1.2rem;background:#10b981;border:none;border-radius:0.5rem;color:#000;font-weight:bold;cursor:pointer">Reload</button></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 6. Cache-first / Stale-while-revalidate for static assets, fonts, icons, and Next.js static bundles
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

      // CRITICAL: event.respondWith MUST receive a valid Response, NEVER undefined!
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
