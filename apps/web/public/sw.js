// Minimal service worker: enables installability (PWA) without intercepting or caching
// dynamic app data. It activates immediately and lets the browser handle every request.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Intentionally a pass-through. A registered fetch handler is what makes the app installable;
  // we do not cache so operational data always comes fresh from the network.
})
