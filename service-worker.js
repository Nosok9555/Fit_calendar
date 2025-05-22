const CACHE_NAME = 'fit-calendar-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './main.js',
    './manifest.json',
    './assets/icons/dumbbell-icon.png',
    './assets/icons/dumbbell-icon-512.png'
];

// Установка Service Worker и кеширование файлов
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Активация Service Worker и удаление старого кеша
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Перехват запросов и возврат кешированных ресурсов
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
    const options = {
        body: event.data.text(),
        icon: './assets/icons/dumbbell-icon.png',
        badge: './assets/icons/dumbbell-icon.png'
    };

    event.waitUntil(
        self.registration.showNotification('FIT calendar', options)
    );
});

// Установка Service Worker и кеширование файлов
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Активация Service Worker и удаление старого кеша
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Перехват запросов и возврат кешированных ресурсов
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
    const options = {
        body: event.data.text(),
        icon: '/assets/icons/dumbbell-icon.png',
        badge: '/assets/icons/dumbbell-icon.png'
    };

    event.waitUntil(
        self.registration.showNotification('FIT calendar', options)
    );
});