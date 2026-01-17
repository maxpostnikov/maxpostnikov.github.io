const CACHE_NAME = 'match3-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/images/icon.svg',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './assets/js/game.js',
  './assets/js/Scene1.js',
  './assets/js/WavePipeline.js',
  './assets/js/ExplosionPipeline.js',
  './assets/images/background.png',
  './assets/images/gems.png',
  'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js'
];

self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Even if found in cache, we fetch from network to update the cache for NEXT time
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Clone the response because it's a stream and can only be consumed once
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Network failed (offline), do nothing (we already have cachedResponse or will fail)
      });

      // Return cached response if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});