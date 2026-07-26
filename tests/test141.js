/* v141-Test: Uebungs-Beschreibungen Etappe 2 = Druck (Brust, Schulter, Trizeps).
   Gleiche Logik wie test138, nur fuer die naechste Etappe: die Kategorie muss
   VOLLSTAENDIG beschrieben sein, waehrend die Tabelle insgesamt lueckenhaft
   bleiben darf. Zusaetzlich: Etappe 1 (Beine) darf dabei nicht kaputtgehen.
   Hinweis: in Test-LABELS keine typografischen Anfuehrungszeichen (Haus-Falle). */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

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
const druck = UEBUNGEN_DB.filter(u => u.kat === "druck").map(u => u.name);
const beine = UEBUNGEN_DB.filter(u => u.kat === "beine").map(u => u.name);

/* 1) Etappe 2 ist vollstaendig: alle Druck-Uebungen haben einen Text. */
const fehlend = druck.filter(n => !UEBUNG_TEXT[n]);
pruefe("alle Druck-Uebungen beschrieben" + (fehlend.length ? " (fehlt: " + fehlend.join(", ") + ")" : ""),
  fehlend.length === 0);
pruefe("Druck sind 33 Uebungen (ist: " + druck.length + ")", druck.length === 33);

/* 2) Etappe 1 bleibt vollstaendig — kein Verlust durch das Einfuegen. */
const fehlendeBeine = beine.filter(n => !UEBUNG_TEXT[n]);
pruefe("Bein-Etappe unveraendert vollstaendig" + (fehlendeBeine.length ? " (fehlt: " + fehlendeBeine.join(", ") + ")" : ""),
  fehlendeBeine.length === 0);

/* 3) Keine Karteileichen: jeder Schluessel ist eine echte Uebung. */
const leichen = schluessel.filter(k => !namen.has(k));
pruefe("kein Schluessel ohne Uebung" + (leichen.length ? " (" + leichen.join(", ") + ")" : ""), leichen.length === 0);

/* 4) Substanz: Laenge, mehrere Saetze, keine Dublette des Kurz-Tipps,
      und der versprochene Aufbau (was/wie/haeufigster Fehler) je Druck-Text. */
const zuKurz = schluessel.filter(k => UEBUNG_TEXT[k].length < 120);
pruefe("jeder Text hat Substanz (>= 120 Zeichen)" + (zuKurz.length ? " (" + zuKurz.join(", ") + ")" : ""),
  zuKurz.length === 0);
const zuWenigSaetze = schluessel.filter(k => (UEBUNG_TEXT[k].match(/[.!?]/g) || []).length < 2);
pruefe("mindestens zwei Saetze je Text", zuWenigSaetze.length === 0);
const ohneFehlerteil = druck.filter(n => !/Häufigster Fehler:/.test(UEBUNG_TEXT[n] || ""));
pruefe("jeder Druck-Text nennt den haeufigsten Fehler" + (ohneFehlerteil.length ? " (" + ohneFehlerteil.join(", ") + ")" : ""),
  ohneFehlerteil.length === 0);
const gleich = schluessel.filter(k => UEBUNG_TEXT[k] === UEBUNG_INFO[k]);
pruefe("Text ist nicht der Kurz-Tipp", gleich.length === 0);
const gesehen = new Set();
const mehrfach = schluessel.filter(k => { const t = UEBUNG_TEXT[k]; if(gesehen.has(t)) return true; gesehen.add(t); return false; });
pruefe("kein Text zweimal verwendet" + (mehrfach.length ? " (" + mehrfach.join(", ") + ")" : ""), mehrfach.length === 0);

/* 5) Der Kurz-Tipp bleibt fuer ALLE Uebungen erhalten (v89-Zusage). */
const ohneTipp = [...namen].filter(n => !UEBUNG_INFO[n]);
pruefe("jede Uebung hat weiterhin einen Kurz-Tipp" + (ohneTipp.length ? " (" + ohneTipp.length + " fehlen)" : ""),
  ohneTipp.length === 0);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
