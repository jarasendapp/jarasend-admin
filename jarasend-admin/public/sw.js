// Deliberately minimal — this app is entirely dependent on live Supabase
// data (user accounts, KYC records, everything), so there is nothing
// meaningful to cache for offline use, and caching stale data here could
// actively mislead an admin. This service worker exists only to satisfy
// the browser's installability requirement for "Add to Home Screen" /
// desktop install support — every request still goes straight to the
// network, exactly as if there were no service worker at all.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
