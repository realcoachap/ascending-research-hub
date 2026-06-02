// Ascending Research Hub service worker v0.8.52 - Theo ☠️ - 2026-06-01
// WHY: Retires the old root-scope offline fallback so Ascending Aminos routes can never fall back into Research index.html.
const CACHE_PREFIX = "ascending-research-hub-";

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX)).map(key => caches.delete(key)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach(client => client.postMessage({ type: "ASCENDING_RESEARCH_SW_RETIRED" }));
  })());
});
