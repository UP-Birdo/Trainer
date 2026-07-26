/* v142-Test: Uebungs-Beschreibungen — das ETAPPEN-REGISTER.
   Ab hier wird nicht mehr je Etappe eine eigene Testdatei angelegt (test138 =
   Beine, test141 = Druck bleiben als Historie stehen). Statt dessen steht hier
   EINE Liste der abgeschlossenen Kategorien: Wer eine Etappe fertig schreibt,
   traegt die Kategorie unten ein — der Rest prueft sich von selbst.
   Geprueft wird die DATENLAGE (welche Uebung hat einen Text), nicht die Form
   des Quelltextes.
   Hinweis: in Test-LABELS keine typografischen Anfuehrungszeichen (Haus-Falle). */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

/* ---- Register: Kategorie -> seit welcher Version vollstaendig beschrieben ---- */
const ETAPPEN = [
  { kat:"beine", version:"v138", anzahl:40 },
  { kat:"druck", version:"v141", anzahl:33 },
  { kat:"zug",   version:"v142", anzahl:31 }
  // offen: rumpf (23), cardio (8) — beim Fertigstellen hier ergaenzen.
];

function grabLiteral(name){
  const decl = "const " + name + " = ";
  const i = src.indexOf(decl);
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  let start = i + decl.length;
  while(start < src.length && src[start] !== "{" && src[start] !== "[") start++;
  const auf = src[start], zu = auf === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const UEBUNGEN_DB = eval("(" + grabLiteral("UEBUNGEN_DB") + ")");
const UEBUNG_TEXT = eval("(" + grabLiteral("UEBUNG_TEXT") + ")");
const UEBUNG_INFO = eval("(" + grabLiteral("UEBUNG_INFO") + ")");

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const namen = new Set(UEBUNGEN_DB.map(u => u.name));
const schluessel = Object.keys(UEBUNG_TEXT);

/* 1) Jede eingetragene Etappe ist und bleibt vollstaendig. */
ETAPPEN.forEach(e => {
  const uebungen = UEBUNGEN_DB.filter(u => u.kat === e.kat).map(u => u.name);
  pruefe("Kategorie " + e.kat + " hat " + e.anzahl + " Uebungen (ist: " + uebungen.length + ")",
    uebungen.length === e.anzahl);
  const fehlend = uebungen.filter(n => !UEBUNG_TEXT[n]);
  pruefe("Etappe " + e.kat + " (" + e.version + ") vollstaendig" + (fehlend.length ? " (fehlt: " + fehlend.join(", ") + ")" : ""),
    fehlend.length === 0);
  const ohneFehlerteil = uebungen.filter(n => !/Häufigster Fehler:/.test(UEBUNG_TEXT[n] || ""));
  pruefe("Etappe " + e.kat + ": jeder Text nennt den haeufigsten Fehler" + (ohneFehlerteil.length ? " (" + ohneFehlerteil.join(", ") + ")" : ""),
    ohneFehlerteil.length === 0);
});

/* 2) Das Register selbst ist plausibel: keine erfundene Kategorie. */
const kategorien = new Set(UEBUNGEN_DB.map(u => u.kat));
const unbekannt = ETAPPEN.filter(e => !kategorien.has(e.kat)).map(e => e.kat);
pruefe("Register nennt nur echte Kategorien" + (unbekannt.length ? " (" + unbekannt.join(", ") + ")" : ""),
  unbekannt.length === 0);

/* 3) Summe: so viele Uebungen wie erwartet haben einen Text. */
const summe = ETAPPEN.reduce((s, e) => s + e.anzahl, 0);
pruefe("mindestens " + summe + " Uebungen beschrieben (ist: " + schluessel.length + ")", schluessel.length >= summe);

/* 4) Unveraendert gueltig, egal wie viele Etappen fertig sind. */
const leichen = schluessel.filter(k => !namen.has(k));
pruefe("kein Schluessel ohne Uebung" + (leichen.length ? " (" + leichen.join(", ") + ")" : ""), leichen.length === 0);
const zuKurz = schluessel.filter(k => UEBUNG_TEXT[k].length < 120);
pruefe("jeder Text hat Substanz (>= 120 Zeichen)" + (zuKurz.length ? " (" + zuKurz.join(", ") + ")" : ""), zuKurz.length === 0);
const zuWenigSaetze = schluessel.filter(k => (UEBUNG_TEXT[k].match(/[.!?]/g) || []).length < 2);
pruefe("mindestens zwei Saetze je Text", zuWenigSaetze.length === 0);
const gleich = schluessel.filter(k => UEBUNG_TEXT[k] === UEBUNG_INFO[k]);
pruefe("Text ist nicht der Kurz-Tipp", gleich.length === 0);
const gesehen = new Set();
const mehrfach = schluessel.filter(k => { const t = UEBUNG_TEXT[k]; if(gesehen.has(t)) return true; gesehen.add(t); return false; });
pruefe("kein Text zweimal verwendet" + (mehrfach.length ? " (" + mehrfach.join(", ") + ")" : ""), mehrfach.length === 0);
const ohneTipp = [...namen].filter(n => !UEBUNG_INFO[n]);
pruefe("jede Uebung hat weiterhin einen Kurz-Tipp" + (ohneTipp.length ? " (" + ohneTipp.length + " fehlen)" : ""), ohneTipp.length === 0);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
