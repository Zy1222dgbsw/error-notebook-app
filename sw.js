// 自毁型 Service Worker - 装上后立刻自我注销
// 用于清掉所有旧版本的 Service Worker 缓存
self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    Promise.all([
      // 注销当前 SW
      self.registration.unregister(),
      // 清空所有缓存
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }),
      // 让所有打开的页面重新加载
      self.clients.matchAll().then(function (clients) {
        clients.forEach(function (client) { client.navigate(client.url); });
      })
    ]).then(function () { return self.clients.claim(); })
  );
});
