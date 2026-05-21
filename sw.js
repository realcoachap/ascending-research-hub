// Ascending Research Hub service worker v0.3.1 — Theokoles ☠️ — 2026-05-21
// WHY: Enables offline reload/install behavior for the static hub prototype without collecting data.
const CACHE = 'ascending-research-hub-v0.3.1';
const ASSETS = ['./', './index.html', './coa.html', './manifest.webmanifest', './icon.svg'];
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
