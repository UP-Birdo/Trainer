/* v209-Test: Der Offline-Speicher holt seine Dateien beim Aktualisieren FRISCH.

   Der Fehler, den dieser Test festnagelt: `cache.addAll()` holt die Dateien
   durch den normalen Browser-Cache. Liegt dort noch die alte muskel-back.png,
   landet genau die im frischen Cache der neuen Version — und weil alles ausser
   index.html CACHE ZUERST ausgeliefert wird, bleibt sie dort fuer immer. Auf
   dem iPhone waren nach v208 deshalb weiter die Fuesse eingefaerbt, obwohl auf
   dem Server laengst die korrigierte Karte lag.

   Zusaetzlich: die Waden-Flaeche selbst. Sie ist das, was der Nutzer gesehen
   hat — und ohne Pruefung koennte eine kuenftige Vorlage sie wieder ueber den
   Knoechel hinaus ziehen, ohne dass es jemand merkt.
   Hinweis: in Test-LABELS keine typografischen Anfuehrungszeichen (Haus-Falle). */
"use strict";
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(process.argv[2], "utf8");
const swPfad = path.join(path.dirname(process.argv[2]), "sw.js");
const sw = fs.readFileSync(swPfad, "utf8");
/* Ohne Kommentare pruefen: Der Kommentar ERKLAERT den alten Fehler und nennt
   ihn dabei beim Namen — sonst schlaegt die Regressions-Pruefung auf dem
   eigenen Merkzettel an. */
const swCode = sw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Der Service Worker holt frisch ---------- */
pruefe("die Installation umgeht den Browser-Cache",
  /fetch\(datei, \{ cache: "reload" \}\)/.test(swCode));
/* Die Regression: addAll darf NICHT zurueckkommen. */
pruefe("cache.addAll ist raus (es holt durch den Browser-Cache)",
  !/\.addAll\(/.test(swCode));
pruefe("ein Fehlschlag laesst die Installation scheitern (kein halber Vorrat)",
  /if \(!antwort\.ok\) throw new Error/.test(swCode));
pruefe("gespeichert wird die frisch geholte Antwort",
  /cache\.put\(datei, antwort\)/.test(swCode));
pruefe("die Muskelkarten stehen in der Datei-Liste",
  /muskeln\/muskel-front\.png/.test(swCode) && /muskeln\/muskel-back\.png/.test(swCode));
/* index.html bleibt Netz-zuerst (v64) — der Rest Cache-zuerst (offline-sicher). */
pruefe("index.html wird weiter am Cache vorbei geholt",
  /fetch\(anfrage\.url, \{ cache: "no-store" \}\)/.test(swCode));
pruefe("alles andere bleibt Cache zuerst",
  /caches\.match\(anfrage\)\.then\(treffer => treffer \|\| fetch\(anfrage\)\)/.test(swCode));
/* Der Kommentar soll die Lehre festhalten — sonst baut sie jemand zurueck. */
pruefe("der Quelltext erklaert, warum nicht addAll", /Browser-Cache/.test(sw));
/* Die Version im sw.js muss die der App sein — sonst raeumt der alte Cache nie ab. */
{
  const appV = Number(/const APP_VERSION = (\d+);/.exec(src)[1]);
  const swV = Number(/const VERSION = "v(\d+)";/.exec(swCode)[1]);
  pruefe("sw.js traegt dieselbe Version wie die App (" + appV + ")", appV === swV);
}

/* ---------- 2) Die Waden hoeren am Knoechel auf ---------- */
/* Gepruefte Groessen aus tools\Muskelkarte-Bauen.ps1 (v208). Die alte Maske
   nahm Schienbein UND Fuss mit: 26900 px vorne, 12164 px hinten. Der Test
   haelt die korrigierten Zahlen fest — nicht als Selbstzweck, sondern damit
   eine kuenftige Vorlage nicht stillschweigend wieder die Fuesse einfaerbt. */
const PNG = require("zlib");
function indexKarte(datei){
  const roh = fs.readFileSync(path.join(path.dirname(process.argv[2]), "muskeln", datei));
  // Minimaler PNG-Leser: IHDR fuer die Groesse, IDAT entpacken, Filter loesen.
  const breite = roh.readUInt32BE(16), hoehe = roh.readUInt32BE(20);
  const tiefe = roh[24], farbtyp = roh[25];
  if(tiefe !== 8 || farbtyp !== 6) throw new Error(datei + ": erwartet 8-Bit RGBA");
  const stuecke = [];
  let p = 8;
  while(p < roh.length){
    const laenge = roh.readUInt32BE(p);
    const typ = roh.toString("ascii", p + 4, p + 8);
    if(typ === "IDAT") stuecke.push(roh.slice(p + 8, p + 8 + laenge));
    p += 12 + laenge;
  }
  const daten = PNG.inflateSync(Buffer.concat(stuecke));
  const zeile = breite * 4;
  const bild = Buffer.alloc(hoehe * zeile);
  for(let y = 0; y < hoehe; y++){
    const filter = daten[y * (zeile + 1)];
    const ein = daten.slice(y * (zeile + 1) + 1, y * (zeile + 1) + 1 + zeile);
    const aus = bild.slice(y * zeile, (y + 1) * zeile);
    for(let x = 0; x < zeile; x++){
      const a = x >= 4 ? aus[x - 4] : 0;
      const b = y > 0 ? bild[(y - 1) * zeile + x] : 0;
      const c = (x >= 4 && y > 0) ? bild[(y - 1) * zeile + x - 4] : 0;
      let wert = ein[x];
      if(filter === 1) wert += a;
      else if(filter === 2) wert += b;
      else if(filter === 3) wert += (a + b) >> 1;
      else if(filter === 4){
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        wert += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      aus[x] = wert & 255;
    }
  }
  return { breite, hoehe, bild };
}
function zaehle(karte, nummer){
  let n = 0;
  for(let i = 0; i < karte.bild.length; i += 4) if(karte.bild[i] === nummer) n++;
  return n;
}
/** Der unterste Punkt eines Muskels als Anteil der Figurhoehe (0 = oben). */
function untersteZeile(karte, nummer){
  for(let y = karte.hoehe - 1; y >= 0; y--){
    for(let x = 0; x < karte.breite; x++){
      if(karte.bild[(y * karte.breite + x) * 4] === nummer) return y / karte.hoehe;
    }
  }
  return -1;
}

const WADE = 19;   // Position in MUSKEL_ORDER + 1
const vorne = indexKarte("muskel-front.png");
const hinten = indexKarte("muskel-back.png");
pruefe("die Karte vorne hat die erwartete Groesse", vorne.breite === 591 && vorne.hoehe === 1086);
pruefe("die Karte hinten auch", hinten.breite === 468 && hinten.hoehe === 786);
pruefe("die Wade vorne ist die korrigierte Flaeche (nicht mehr 26900 px)",
  zaehle(vorne, WADE) === 16928);
pruefe("die Wade hinten ebenfalls (nicht mehr 12164 px)",
  zaehle(hinten, WADE) === 8363);
/* Der eigentliche Punkt: Sie darf nicht bis zum Bildrand hinunterreichen.
   Die alte Maske ging bis in die Zehen — also praktisch bis ganz unten. */
pruefe("die Wade vorne endet ueber den Fuessen",
  untersteZeile(vorne, WADE) > 0 && untersteZeile(vorne, WADE) < 0.93);
pruefe("die Wade hinten endet ueber den Fuessen",
  untersteZeile(hinten, WADE) > 0 && untersteZeile(hinten, WADE) < 0.93);
/* Gegenprobe: Der Schienbeinmuskel gibt es weiterhin, und er liegt HOEHER als
   das untere Ende der Wade — sonst waere die Zuordnung vertauscht. */
pruefe("der Schienbeinmuskel steht weiter in der Karte vorne", zaehle(vorne, 18) > 0);

/* ---------- 3) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v209",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 209);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.209", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
