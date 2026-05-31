// Ascending Research Hub service worker v0.5.14 — Theo 🧪 — 2026-05-31
// WHY: Enables offline reload/install behavior for the static hub prototype without collecting data.
const CACHE = 'ascending-research-hub-v0.5.14';
const ASSETS = ['./', './index.html', './ask-ai.html', './coa.html', './shop.html', './peptide-price-tracker.html', './data/peptide-price-tracker-baseline-v0-1-0.json', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => caches.match('./index.html'))));
});
