/* v162-Test: Ueberlastete Muskeln faerben sich langsam rot — ueberall.
   Kern ist `lastFarbe`: keine Schwelle, sondern ein stetiger Uebergang von der
   Signalfarbe ins Warnrot zwischen 70 % und 130 % der Richtgroesse. Dazu die
   Verdrahtung: EINE Stelle (muskelnAufCanvas) faerbt, und `miniFigurenZeichnen`
   holt die Quoten genau einmal je Zeichenlauf.
   Hinweis: in Test-LABELS keine typografischen Anfuehrungszeichen (Haus-Falle). */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

function grabFn(name){
  const i = src.indexOf("function " + name + "(");
  if(i < 0) throw new Error("Funktion nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf("{", i); k < src.length; k++){
    if(src[k] === "{") tiefe++;
    else if(src[k] === "}"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports",
  // 0.227.0: lastFarbe mischt ueber den gemeinsamen Helfer farbMischung.
  grabFn("farbMischung") + "\n" + grabFn("lastFarbe") +
  "\nmodule.exports = { lastFarbe };")(modul, modul.exports);
const lastFarbe = modul.exports.lastFarbe;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const SIGNAL = [244, 199, 78];   // --signal
const WARN   = [217,  92, 71];   // --warn
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------- 1) Die Enden ---------- */
pruefe("ohne Belastung die gewohnte Signalfarbe", gleich(lastFarbe(0, SIGNAL, WARN), SIGNAL));
pruefe("bis 70 Prozent bleibt es dabei", gleich(lastFarbe(0.7, SIGNAL, WARN), SIGNAL));
pruefe("auch darunter", gleich(lastFarbe(0.5, SIGNAL, WARN), SIGNAL));
pruefe("bei 130 Prozent ganz im Warnrot", gleich(lastFarbe(1.3, SIGNAL, WARN), WARN));
pruefe("darueber nicht weiter", gleich(lastFarbe(5, SIGNAL, WARN), WARN));

/* ---------- 2) Der Uebergang ist stetig ----------
   0.227.0 (Nutzer-Ansage): Die Skala hat einen dritten Ton bekommen — Gruen fuer
   „bereit". Damit liegt der Verlauf anders: 0 bis 1 wandert von Gruen nach Gelb,
   1 bis 1,3 von Gelb nach Rot. Der Punkt von v162 bleibt derselbe und wird hier
   weiter geprueft: STUFENLOS statt Schwelle. Die Aufrufe ohne Gruen-Ton (oben)
   pruefen zusaetzlich, dass alte Aufrufer unveraendert weiterlaufen. */
const GRUEN = [90, 164, 105];   // --ok
const mitte = lastFarbe(1.15, SIGNAL, WARN);
pruefe("bei 115 Prozent genau zwischen Gelb und Rot",
  gleich(mitte, [Math.round((244+217)/2), Math.round((199+92)/2), Math.round((78+71)/2)]));
pruefe("es gibt keine Schwelle, sondern viele Werte",
  new Set([1.0,1.05,1.1,1.15,1.2,1.25,1.3].map(q => lastFarbe(q, SIGNAL, WARN).join(","))).size === 7);
pruefe("und im gruenen Bereich ebenso",
  new Set([0,0.2,0.4,0.6,0.8,1.0].map(q => lastFarbe(q, SIGNAL, WARN, GRUEN).join(","))).size === 6);
/* Beide Farben liegen so, dass ALLE drei Kanaele auf dem Weg vom Signal- zum
   Warnton kleiner werden. Geprueft wird deshalb: kein Kanal springt zurueck —
   die Farbe wandert durchgehend in dieselbe Richtung, ohne Zacken. */
let stetig = true;
for(let q = 0.7; q < 1.3; q += 0.05){
  const a = lastFarbe(q, SIGNAL, WARN), b = lastFarbe(q + 0.05, SIGNAL, WARN);
  if([0,1,2].some(i => (SIGNAL[i] >= WARN[i]) ? b[i] > a[i] : b[i] < a[i])) stetig = false;
}
pruefe("die Farbe wandert durchgehend in eine Richtung", stetig);

/* ---------- 3) Randfaelle ---------- */
pruefe("ohne Quote wie ohne Belastung",
  gleich(lastFarbe(undefined, SIGNAL, WARN), SIGNAL) && gleich(lastFarbe(null, SIGNAL, WARN), SIGNAL));
pruefe("negative Quote schadet nicht", gleich(lastFarbe(-3, SIGNAL, WARN), SIGNAL));
pruefe("es kommen immer drei ganze Zahlen zurueck",
  lastFarbe(1.1, SIGNAL, WARN).length === 3 &&
  lastFarbe(1.1, SIGNAL, WARN).every(v => Number.isInteger(v)));

/* ---------- 4) Verdrahtung: EINE Stelle faerbt ---------- */
const canvas = grabFn("muskelnAufCanvas");
pruefe("die Mal-Funktion nimmt Quoten entgegen", canvas.includes("function muskelnAufCanvas(cx, ansicht, muskeln, alpha, sekundaer, quoten)"));
// 0.227.0: dazu der Gruen-Ton, und ein fehlender Eintrag heisst „keine Last" (0).
pruefe("und faerbt je Muskel", canvas.includes("lastFarbe(quoten ? (quoten[key] || 0) : undefined, signal, warn, ok)"));
pruefe("die Warnfarbe kommt aus dem Thema", src.includes('function muskelWarnRgb(){ return themeRgb("--warn"'));
const figuren = grabFn("miniFigurenZeichnen");
pruefe("die Quoten werden EINMAL je Zeichenlauf geholt",
  figuren.includes("const quoten = auslastungsQuoten()") &&
  (figuren.match(/auslastungsQuoten\(\)/g) || []).length === 1);
pruefe("und an jede Figur durchgereicht", figuren.includes("(el.dataset.mfSek || \"\").split(\",\").filter(Boolean), quoten)"));
pruefe("die Mini-Figur reicht sie weiter",
  grabFn("miniMuskelFigur").includes("muskeln, 205, sekundaer, quoten"));
/* 0.227.0: `null` statt `{}` — mit der Gruen-Skala sind das zwei verschiedene
   Aussagen. Kein Objekt heisst „keine Daten" (Signalfarbe), ein leeres Objekt
   hiesse „alles ruhig" (gruen). */
pruefe("ohne Konto gibt es gar keine Quoten",
  grabFn("auslastungsQuoten").includes("if(!sitzung || !sitzung.daten) return null"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
