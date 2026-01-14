const CACHE_NAME = 'match3-v1';
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
  './assets/images/background.png',
  './assets/images/gems.png',
  'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
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