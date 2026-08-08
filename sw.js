/* ============================================================
   Service Worker — macht die App offline-fähig.

   Strategie:
   - index.html: NETZ ZUERST, Cache als Rückfall.
     So kommen Updates sofort an, offline läuft die letzte Version.
   - Alles andere (Icons, Manifest): CACHE ZUERST.

   Bei jeder neuen App-Version unten die VERSION mitziehen —
   dann wird der alte Cache beim nächsten Besuch weggeräumt. Sie ist
   IMMER "v" + die VERSION aus index.html (Haus-Regel 0.MINOR.PATCH);
   `tests\test224.js` prüft das, weil es der häufigste Flüchtigkeitsfehler
   beim Ausliefern ist.
   ============================================================ */
"use strict";

const VERSION = "v0.225.0";
const CACHE = "trainingsapp-" + VERSION;
const DATEIEN = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "icon-180.png",
                 "muskeln/figur-vorne.png", "muskeln/figur-hinten.png",
                 "muskeln/muskel-front.png", "muskeln/muskel-back.png"];

/* v209 — teuer erkauft, und es ist DIESELBE Lehre wie in v64 (siehe unten bei
   index.html), nur eine Etage tiefer.

   Hier stand `cache.addAll(DATEIEN)`. Das sieht harmlos aus, holt die Dateien
   aber durch den NORMALEN Browser-Cache: Steht dort noch die alte
   `muskel-back.png`, landet genau die im frischen Cache der neuen Version —
   und weil unten alles außer index.html CACHE ZUERST ausgeliefert wird, bleibt
   sie dort für immer. Solange sich nur `index.html` änderte, ist das nie
   aufgefallen. Mit v208 hat sich zum ersten Mal ein BILD geändert (die
   Muskelkarte), und der Fehler zeigte sich sofort: Auf dem iPhone waren die
   Füße weiter gelb eingefärbt, obwohl auf dem Server längst die korrigierte
   Karte lag.

   `cache: "reload"` umgeht den HTTP-Cache und schreibt die Antwort zugleich
   frisch hinein — die Version im Cache stammt danach garantiert vom Server.
   Ein Fehlschlag lässt die ganze Installation scheitern (wie zuvor bei
   `addAll`): Ein halb gefüllter Cache wäre schlimmer als gar keiner. */
self.addEventListener("install", ereignis => {
  ereignis.waitUntil(
    caches.open(CACHE).then(cache => Promise.all(
      DATEIEN.map(datei =>
        fetch(datei, { cache: "reload" }).then(antwort => {
          if (!antwort.ok) throw new Error("Konnte " + datei + " nicht laden (" + antwort.status + ")");
          return cache.put(datei, antwort);
        })
      )
    )).then(() => self.skipWaiting())
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
    // Netz zuerst, aber CACHE UMGEHEN (no-store). Sonst kann der HTTP-Cache
    // nach einem Deploy noch die ALTE index.html liefern -> die laufende
    // Version bleibt alt, der Auto-Update-Check sieht am Server eine neuere
    // Version und löst endlose location.reload() aus (Update greift nie).
    // Offline fällt es wie gehabt auf den Cache zurück.
    ereignis.respondWith(
      fetch(anfrage.url, { cache: "no-store" })
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
