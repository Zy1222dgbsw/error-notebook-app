// Service Worker for 智能错题本
const CACHE_NAME = 'error-notebook-v1';
const ASSETS = [
  '.',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', function (e) {
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request).then(function (response) {
        return caches.open(CACHE_NAME).then(function (cache) {
          cache.put(e.request, response.clone());
          return response;
        });
      });
    })
  );
});
