// apps/web/public/sw.js
// HPC Jashore — Production Service Worker for PWA Offline Resilience & TV Kiosk Reliability
// Version 7: Eliminates HTML caching to guarantee fresh CSS & JS assets on every deployment.

const CACHE_NAME = 'hpc-cache-v7';

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

  // 5. Navigation requests (HTML page navigations): Always Network-First (NEVER cache HTML)
  // This guarantees clients always receive fresh HTML with the exact matching CSS/JS chunk hashes.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse) {
            return new Response('Network unavailable', { status: 503 });
          }
          // CRITICAL FOR SAFARI / WEBKIT (iOS & macOS):
          // In Safari, if a response followed any HTTP redirect (e.g. 307 /admin -> /auth/login),
          // returning it directly to event.respondWith throws WebKitServiceWorker: 0.
          if (networkResponse.redirected) {
            return Response.redirect(networkResponse.url, 307);
          }
          return networkResponse;
        })
        .catch(() => {
          // Clean, standalone offline fallback page — no unstyled HTML or broken bodies
          return new Response(
            '<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/><title>HPC Jashore - অফলাইন</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#09090b;color:#f4f4f5;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1.5rem;box-sizing:border-box;text-align:center;}h2{font-size:1.5rem;margin:0 0 0.5rem 0;color:#10b981;font-weight:700;}p{color:#a1a1aa;margin:0 0 1.5rem 0;font-size:0.95rem;max-width:320px;line-height:1.5;}button{background:#10b981;color:#000;border:none;padding:0.75rem 1.75rem;border-radius:0.75rem;font-weight:700;font-size:1rem;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.25);}</style></head><body><div style="font-size:2.5rem;margin-bottom:1rem;">⚡</div><h2>পুনরায় চেষ্টা করুন</h2><p>পৃষ্ঠাটি লোড হতে সমস্যা হয়েছে অথবা সার্ভার আপডেট হচ্ছে। দয়া করে আবার চেষ্টা করুন।</p><button onclick="window.location.reload()">রিলোড করুন (Reload)</button></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
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
