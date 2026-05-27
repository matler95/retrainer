/**
 * Atlas Service Worker
 *
 * Caching strategy:
 * - Static assets (JS, CSS, fonts) → Cache-first
 * - Exercise database → Cache-first (rarely changes)
 * - Supabase API calls → Network-first with cache fallback
 * - Navigation requests → Network-first (serve fresh HTML)
 */

const CACHE_NAME = "atlas-v1";
const STATIC_CACHE = "atlas-static-v1";

// Assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
];

// Install: pre-cache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: apply caching strategy based on request type
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Supabase API calls: network-first with cache fallback
  if (url.hostname.includes("supabase")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (JS, CSS, images, fonts): cache-first
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.includes("/icons/")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation requests (HTML): network-first
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ─── Caching Strategies ─────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}