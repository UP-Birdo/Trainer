/* ============================================================
   Service Worker — macht die App offline-fähig.

   Strategie:
   - index.html: NETZ ZUERST, Cache als Rückfall.
     So kommen Updates sofort an, offline läuft die letzte Version.
   - Alles andere (Icons, Manifest): CACHE ZUERST.

   Bei jeder neuen App-Version unten die VERSION hochzählen —
   dann wird der alte Cache beim nächsten Besuch weggeräumt.
   ============================================================ */
"use strict";

const VERSION = "v40";
const CACHE = "trainingsapp-" + VERSION;
const DATEIEN = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "icon-180.png"];

self.addEventListener("install", ereignis => {
  ereignis.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(DATEIEN)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", ereignis => {
  ereignis.waitUntil(
    caches.keys().then(namen =>
      Promise.all(namen.filter(n => n !== CACHE).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ereignis => {
  const anfrage = ereignis.request;
  if (anfrage.method !== "GET") return;

  const istSeite = anfrage.mode === "navigate" || anfrage.url.endsWith("index.html");

  if (istSeite) {
    // Netz zuerst: frische Version holen, im Cache ablegen, offline aus dem Cache.
    ereignis.respondWith(
      fetch(anfrage)
        .then(antwort => {
          const kopie = antwort.clone();
          caches.open(CACHE).then(cache => cache.put(anfrage, kopie));
          return antwort;
        })
        .catch(() => caches.match(anfrage).then(t => t || caches.match("index.html")))
    );
  } else {
    // Cache zuerst: schnell und offline-sicher.
    ereignis.respondWith(
      caches.match(anfrage).then(treffer => treffer || fetch(anfrage))
    );
  }
});
