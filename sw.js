// Service Worker for 智能错题本
// 简化版：只在网络失败时使用缓存，确保用户始终看到最新版本
const CACHE_NAME = 'error-notebook-v5';
const ASSETS = ['.', 'index.html', 'style.css', 'app.js', 'manifest.json'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 拦截请求：网络优先，失败时用缓存
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(e.request);
      })
  );
});
