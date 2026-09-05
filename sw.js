// Intelligenter Service Worker mit Zero-Maintenance Auto-Update
const CACHE_NAME = 'lerntracker-pwa-v-auto';

// Unveränderliche externe CDN-Bibliotheken (bleiben dauerhaft im Offline-Cache)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

// Installation: Lädt CDN-Bibliotheken vor und aktiviert sich sofort
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of ASSETS_TO_CACHE) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn('Asset konnte nicht vorab geladen werden:', url);
        }
      }
    })
  );
});

// Aktivierung: Übernimmt sofort die Kontrolle über alle offenen Fenster
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intelligente Abruf-Strategie:
self.addEventListener('fetch', (event) => {
  // 1. Navigation / HTML (Deine App-Oberfläche):
  // STRATEGIE: Network-First!
  // Wenn Internet da ist: IMMER die neueste Version von Vercel laden & Cache direkt erneuern.
  // Wenn offline: Sofort die Version aus dem lokalen Cache anzeigen.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('./index.html') || caches.match('./');
          });
        })
    );
    return;
  }

  // 2. Bibliotheken, Icons & Fonts:
  // STRATEGIE: Cache-First (schnellster Start) mit automatischem Nachladen
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});
