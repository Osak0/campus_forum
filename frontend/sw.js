const CACHE_NAME = 'campus-forum-static-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/create_post.html',
    '/profile.html',
    '/notifications.html',
    '/post_detail.html',
    '/style.css',
    '/manifest.webmanifest',
    '/js/auth.js',
    '/js/index.js',
    '/js/login.js',
    '/js/register.js',
    '/js/create_post.js',
    '/js/profile.js',
    '/js/notifications.js',
    '/js/post_detail.js',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const networkFetch = fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
                    }
                    return response;
                })
                .catch(() => cached || new Response('Offline', { status: 503, statusText: 'Offline' }));
            return cached || networkFetch;
        })
    );
});
