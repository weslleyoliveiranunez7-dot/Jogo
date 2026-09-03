const CACHE = "caja-vila-cache-v1";
const ASSETS = [
  "./", "./index.html", "./css/style.css", "./js/app.js", "./js/players.js",
  "./js/auth.js", "./js/online.js", "./js/firebase-config.js", "./manifest.webmanifest",
  "./assets/caja-vila-logo-192.png", "./assets/caja-vila-logo-180.png", "./assets/caja-vila-logo-512.png"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const live = url.pathname.endsWith(".html") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith("manifest.webmanifest");
  if (live) {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone(); caches.open(CACHE).then(c => c.put(event.request, copy)); return response;
    }).catch(() => caches.match(event.request).then(r => r || caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone(); caches.open(CACHE).then(c => c.put(event.request, copy)); return response;
  })));
});
