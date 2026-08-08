/* v224-Test: Die Versionierung folgt der Haus-Regel — und das Auto-Update
   ueberlebt sie.

   Seit 0.224.0 zaehlt der Trainer wie jedes andere Projekt im Haus nach
   0.MINOR.PATCH (dev\CLAUDE.md, Abschnitt Versionierung). Vorher war er die
   dokumentierte Ausnahme: ein reiner Ganzzahl-Zaehler (223).

   Der gefaehrliche Teil ist nicht die Anzeige, sondern das Auto-Update. Die
   INSTALLIERTE App holt die index.html vom Server und liest die Zahl per
   Textmuster `const APP_VERSION = <Zahl>;` heraus — sie kennt vom Rest der
   neuen Datei nichts. Faellt diese Zeile weg, aendert sie ihre Schreibweise
   oder wird die Zahl kleiner als die auf dem Geraet, bemerkt das Geraet nie
   wieder ein Update. Reparieren liesse sich das nur am Geraet selbst.

   Dieser Test nagelt darum drei Dinge fest:
     1. VERSION ist die einzige gepflegte Stelle und hat das Haus-Format.
     2. APP_VERSION ist exakt MINOR * 1000 + PATCH — berechenbar, also kann
        sie nicht von VERSION wegdriften.
     3. Die Zeile steht genau einmal, in der Schreibweise, die das alte
        Auto-Update erwartet, und ist groesser als der letzte Stand vor der
        Umstellung (223).
   Hinweis: in Test-LABELS keine typografischen Anfuehrungszeichen (Haus-Falle). */
"use strict";
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(process.argv[2], "utf8");
const wurzel = path.dirname(process.argv[2]);
const sw = fs.readFileSync(path.join(wurzel, "sw.js"), "utf8");

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) VERSION: die eine Quelle, im Haus-Format ---------- */
const versionTreffer = src.match(/^const VERSION = "([^"]+)";/gm) || [];
pruefe("VERSION steht genau einmal in index.html (gefunden: " + versionTreffer.length + ")",
  versionTreffer.length === 1);

const version = (/^const VERSION = "([^"]+)";/m.exec(src) || [])[1];
pruefe("VERSION ist lesbar", Boolean(version));
pruefe("VERSION hat das Haus-Format 0.MINOR.PATCH (" + version + ")",
  /^0\.\d+\.\d+$/.test(version));

/* ---------- 2) APP_VERSION: aus VERSION berechenbar ---------- */
/* Die Schreibweise ist Teil des Vertrags mit alten Geraeten: genau ein
   Leerzeichen um das Gleichheitszeichen, Ziffern, Semikolon. */
const appTreffer = src.match(/const APP_VERSION = (\d+);/g) || [];
pruefe("die Auto-Update-Zeile steht genau einmal (gefunden: " + appTreffer.length + ")",
  appTreffer.length === 1);

const appVersion = Number((/const APP_VERSION = (\d+);/.exec(src) || [])[1]);
const teile = (version || "0.0.0").split(".");
const erwartet = Number(teile[1]) * 1000 + Number(teile[2]);
pruefe("APP_VERSION ist MINOR * 1000 + PATCH (erwartet " + erwartet + ", gefunden " + appVersion + ")",
  appVersion === erwartet);

/* Die Umstellung darf die Zahl nie unter den letzten Zaehlerstand druecken —
   sonst haelt ein Geraet mit 223 die neue Fassung fuer aelter. */
pruefe("APP_VERSION ist groesser als der letzte Stand vor der Umstellung (223)",
  appVersion > 223);

/* Die Patch-Stelle darf nicht in die Minor-Stelle ueberlaufen. */
pruefe("die Patch-Stelle bleibt unter 1000 (sonst kollidiert sie mit MINOR)",
  Number(teile[2]) < 1000);

/* ---------- 3) Das Auto-Update liest weiter dieselbe Zeile ---------- */
pruefe("der Auto-Update-Code sucht unveraendert nach const APP_VERSION",
  src.includes('quelltext.match(/const APP_VERSION = (\\d+);/)'));
pruefe("verglichen wird weiter numerisch gegen die eigene APP_VERSION",
  /serverVersion > APP_VERSION/.test(src));

/* ---------- 4) Service Worker, Anzeige, Changelog ziehen mit ---------- */
const swVersion = (/^const VERSION = "v([^"]+)";/m.exec(sw) || [])[1];
pruefe("sw.js traegt v + dieselbe Version (" + swVersion + ")", swVersion === version);

pruefe("die Anzeige zeigt den Versionstext, nicht mehr die gerechnete Zahl",
  /const ANZEIGE_VERSION = VERSION;/.test(src));
pruefe("die alte Rechen-Formel ist raus", !/APP_VERSION \/ 1000/.test(src));

pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"' + version + '", punkte:['));

const changelog = fs.readFileSync(path.join(wurzel, "CHANGELOG.md"), "utf8");
pruefe("CHANGELOG.md nennt die Version (## " + version + ")",
  changelog.includes("## " + version));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
