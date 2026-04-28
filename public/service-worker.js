// service-worker.js
const CACHE_NAME = 'cartes-famille-v1';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/app.js', '/js/game.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
