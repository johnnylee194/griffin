// Service Worker for Griffin PWA
// 版本号：每次更新代码时需要修改此版本号
const CACHE_VERSION = 'griffin-v0.5.0';
const CACHE_NAME = `${CACHE_VERSION}-static`;

// 只缓存静态资源（图标、manifest）
const STATIC_CACHE_URLS = [
  '/manifest.json',
  '/icon-72x72.png',
  '/icon-96x96.png',
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-152x152.png',
  '/icon-192x192.png',
  '/icon-384x384.png',
  '/icon-512x512.png',
  '/griffin-logo.svg'
];

// 安装事件：缓存静态资源，立即激活
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing ${CACHE_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting(); // 强制激活新版本
      })
  );
});

// 激活事件：清理旧缓存，立即控制页面
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating ${CACHE_VERSION}`);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim(); // 立即控制所有页面
      })
  );
});

// 拦截请求：Network First 策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 不缓存的请求
  if (
    request.method !== 'GET' ||  // 非 GET 请求
    url.pathname.startsWith('/api/') ||  // API 请求
    url.pathname.endsWith('.hot-update.json') ||  // HMR 请求
    url.search.includes('_timestamp=')  // 带时间戳的请求
  ) {
    // 直接网络请求，不缓存
    event.respondWith(fetch(request));
    return;
  }

  // HTML 文档：始终从网络获取
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // 离线时返回基本页面
          return new Response(
            '<html><body><h1>Griffin</h1><p>当前离线，请检查网络连接</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 静态资源：Stale-While-Revalidate（返回缓存，后台更新）
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          // 只缓存成功的响应
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });

        // 返回缓存（如果有），同时后台更新
        return cachedResponse || fetchPromise;
      });
    })
  );
});

