/* v112-Test: Statistik-Karten oeffnen per Tipp statt per Knopf. Reine Markup-
   Verdrahtung -> struktureller Quelltext-Check: die zwei Oeffnen-Knoepfe sind weg,
   die Karten tragen den Tap-Handler, und die inneren Klick-Elemente (Info-i,
   Vorschau-Tage) stoppen das Bubbling, damit sie nicht die Karte mit-ausloesen.
   (Labels bewusst ohne Anfuehrungszeichen — sonst bricht ein ASCII-" den String.) */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Die beiden Oeffnen-Knoepfe sind entfernt. */
pruefe("Kein Muskelkarte-oeffnen-Knopf mehr", !src.includes(">Muskelkarte öffnen</button>"));
pruefe("Kein Kalender-oeffnen-Knopf mehr", !src.includes(">Kalender öffnen</button>"));

/* 2) Die Karten oeffnen die jeweilige Ansicht per Tipp. */
pruefe("Karte Zuletzt-trainiert oeffnet Muskelkarte",
  src.includes('class="karte stat-tap" onclick="muskelnOeffnen()"'));
pruefe("Serie/Vorschau-Karte oeffnet Kalender",
  src.includes('class="karte stat-tap" onclick="kalenderOeffnen()"'));

/* 3) Die Muskel-Vorschau traegt den Handler nicht mehr doppelt (Karte reicht). */
pruefe("koerper-vorschau ohne eigenen onclick",
  src.includes('<div class="koerper-vorschau">') && !src.includes('class="koerper-vorschau" onclick'));

/* 4) Innere Klick-Ziele stoppen das Bubbling, sonst loest jeder Tipp die Karte aus. */
pruefe("Vorschau-Tag stoppt Bubbling", src.includes("event.stopPropagation(); tagOeffnen("));
pruefe("Info-i Muskel stoppt Bubbling", src.includes("event.stopPropagation(); infoUmschalten('info-koerper')"));
pruefe("Info-i Serie stoppt Bubbling", src.includes("event.stopPropagation(); infoUmschalten('statistik-klein')"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
