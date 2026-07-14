// Service Worker for 智能错题本
const CACHE_NAME = 'error-notebook-v4';
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
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  // 清理旧版本缓存
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 改用 network-first 策略：每次都尝试拿新版本
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(function (response) {
        // 成功拿到新内容，更新缓存
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(e.request, clone);
        });
        return response;
      })
      .catch(function () {
        // 离线时才用缓存
        return caches.match(e.request);
      })
  );
});
