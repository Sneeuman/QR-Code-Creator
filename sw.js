/* Offline support: network first, cache as a fallback. Bump VERSION when you publish changes. */
const VERSION = "qr-studio-v1";
const FILES = ["./", "index.html", "css/style.css", "manifest.webmanifest", "assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png",
  "vendor/qrcode.js", "vendor/jsQR.js", "js/payloads.js", "js/qr-core.js", "js/render.js", "js/export.js", "js/storage.js", "js/scancheck.js", "js/main.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
