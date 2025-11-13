const CACHE_NAME = 'dashboard-v61';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/todo.html',
  '/help.html',
  '/styles.css',
  '/js/features/dashboard/script.js',
  '/js/features/tasks/todo.js',
  '/js/features/tasks/task-data.js',
  '/js/features/notes/notes.js',
  '/js/features/notes/notes-ui.js',
  '/js/features/retirement/retirement-timer.js',
  '/js/features/retirement/auto-backup.js',
  '/js/core/theme.js',
  '/js/core/logger.js',
  '/js/core/keyboard-nav.js',
  '/js/core/input-validator.js',
  '/js/core/error-handler.js',
  '/js/core/modal-manager.js',
  '/js/core/export-utils.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon.svg',
  '/assets/css/fontawesome-all.min.css',
  '/assets/webfonts/fa-brands-400.woff2',
  '/assets/webfonts/fa-regular-400.woff2',
  '/assets/webfonts/fa-solid-900.woff2',
  '/assets/webfonts/fa-v4compatibility.woff2',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap',
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
