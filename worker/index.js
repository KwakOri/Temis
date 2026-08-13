const STALE_RUNTIME_CACHE_NAMES = new Set([
  "offlineCache",
  "offlineCache-v2",
  "start-url",
]);

const isStalePwaCache = (cacheName) =>
  STALE_RUNTIME_CACHE_NAMES.has(cacheName) ||
  cacheName.startsWith("workbox-precache");

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(isStalePwaCache)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      ),
  );
});
