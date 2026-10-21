/**
 * KALEN Offline PWA Service Worker
 * Caches application shell for offline mesh operations without WiFi/Cellular.
 */

const CACHE_NAME = 'kalen-mesh-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/mesh',
  '/chat',
  '/manifest.json',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // Return offline fallback if network unavailable
        return caches.match('/');
      });
    })
  );
});
