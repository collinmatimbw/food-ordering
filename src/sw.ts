/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'wl-pwa-v1';
const STATIC_CACHE = 'wl-static-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

const API_PATHS = ['/api/', '/uploads/'];

function isStatic(url: string) {
  return STATIC_ASSETS.includes(url) || /\.(html|js|css|png|svg|woff2?)$/i.test(url);
}

function isApiOrUpload(url: string) {
  return API_PATHS.some((p) => url.startsWith(p));
}

self.addEventListener('install', (event) => {
  // Precache the app shell so the offline splash/logo screen is available immediately.
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url, location.origin);

  // Keep API and uploads live: network-first, fallback to cache only when offline.
  if (isApiOrUpload(url.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Static assets: cache-first, falling back to network.
  if (isStatic(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Everything else (fonts, analytics, third parties): leave alone.
  return;
});

async function cacheFirst(request: Request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request: Request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
}
