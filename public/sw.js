// Bald Eagle Service Worker - Lightweight
const CACHE_NAME = 'bald-eagle-v1.1.0';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/logo.png',
    '/favicon.png'
];

// インストール時
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// アクティベーション時
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// フェッチイベント（シンプル化）
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request)
                    .then(fetchResponse => {
                        // 静的リソースのみキャッシュ
                        if (fetchResponse.status === 200 && 
                            (event.request.url.includes('.css') || 
                             event.request.url.includes('.js') || 
                             event.request.url.includes('.png'))) {
                            const responseClone = fetchResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, responseClone));
                        }
                        return fetchResponse;
                    });
            })
            .catch(() => {
                // オフライン時のフォールバック
                if (event.request.url.endsWith('.html') || event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            })
    );
});
