const CACHE_NAME = 'dashboard-v12';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/todo.html',
  '/help.html',
  '/styles.css',
  '/script.js',
  '/todo.js',
  '/theme.js',
  '/logger.js',
  '/keyboard-nav.js',
  '/auto-backup.js',
  '/input-validator.js',
  '/error-handler.js',
  '/modal-manager.js',
  '/export-utils.js',
  '/retirement-timer.js',
  '/task-data.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.14.0/Sortable.min.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, falling back to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response as it can only be consumed once
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});
