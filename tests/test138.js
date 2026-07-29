/* v138-Test: Uebungs-Beschreibungen (UEBUNG_TEXT), Etappe 1 = Beine.
   Die Tabelle darf LUECKENHAFT sein (Content-Etappen), darum wird KEINE
   Vollstaendigkeit geprueft — sondern: jeder Schluessel ist eine echte Uebung
   (keine Karteileichen durch Tippfehler), die Texte haben Substanz, und die
   Bein-Kategorie ist in dieser Etappe vollstaendig.
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
const beine = UEBUNGEN_DB.filter(u => u.kat === "beine").map(u => u.name);

/* 1) Keine Karteileichen: jeder Schluessel ist eine echte Uebung. */
const leichen = schluessel.filter(k => !namen.has(k));
pruefe("kein Schluessel ohne Uebung" + (leichen.length ? " (" + leichen.join(", ") + ")" : ""), leichen.length === 0);
pruefe("ueberhaupt Texte vorhanden", schluessel.length >= 40);

/* 2) Etappe 1 ist vollstaendig: alle Bein-Uebungen haben einen Text. */
const fehlendeBeine = beine.filter(n => !UEBUNG_TEXT[n]);
pruefe("alle Bein-Uebungen beschrieben" + (fehlendeBeine.length ? " (fehlt: " + fehlendeBeine.join(", ") + ")" : ""),
  fehlendeBeine.length === 0);
pruefe("Beine sind 40 Uebungen", beine.length === 40);

/* 3) Substanz: 2-3 Saetze, kein Platzhalter, keine Dublette des Kurz-Tipps. */
const zuKurz = schluessel.filter(k => UEBUNG_TEXT[k].length < 120);
pruefe("jeder Text hat Substanz (>= 120 Zeichen)" + (zuKurz.length ? " (" + zuKurz.join(", ") + ")" : ""),
  zuKurz.length === 0);
const zuWenigSaetze = schluessel.filter(k => (UEBUNG_TEXT[k].match(/[.!?]/g) || []).length < 2);
pruefe("mindestens zwei Saetze je Text", zuWenigSaetze.length === 0);
const gleich = schluessel.filter(k => UEBUNG_TEXT[k] === UEBUNG_INFO[k]);
pruefe("Text ist nicht der Kurz-Tipp", gleich.length === 0);
const doppelt = new Set();
const mehrfach = schluessel.filter(k => { const t = UEBUNG_TEXT[k]; if(doppelt.has(t)) return true; doppelt.add(t); return false; });
pruefe("kein Text zweimal verwendet" + (mehrfach.length ? " (" + mehrfach.join(", ") + ")" : ""), mehrfach.length === 0);

/* 4) Der Kurz-Tipp bleibt fuer ALLE Uebungen erhalten (v89-Zusage). */
const ohneTipp = [...namen].filter(n => !UEBUNG_INFO[n]);
pruefe("jede Uebung hat weiterhin einen Kurz-Tipp" + (ohneTipp.length ? " (" + ohneTipp.length + " fehlen)" : ""),
  ohneTipp.length === 0);

/* 5) Verdrahtung in der Bibliothek. */
/* v183: Die Bibliothek liest die Beschreibung ueber `drillText` — das ist
   dieselbe Quelle, nur eine Ebene weiter: `drillText` faellt fuer eine
   Kraftuebung auf genau dieses UEBUNG_TEXT zurueck (v151). Noetig wurde es,
   weil dort jetzt auch Sportart-Drills stehen. */
pruefe("Bibliothek liest die Beschreibung ueber die gemeinsame Quelle",
  src.includes("const beschreibung = drillText(u.name)"));
pruefe("und die faellt fuer Kraftuebungen auf UEBUNG_TEXT zurueck",
  /return SPORT_TEXT\[name\] \|\| UEBUNG_TEXT\[name\] \|\| "";/.test(src));
pruefe("Beschreibung steht unter dem Tipp",
  src.indexOf("(tip ? '<div class=\"meta\" style=\"margin-top:6px\"'") < src.indexOf("(beschreibung ?"));
pruefe("Text wird escaped", src.includes("text(beschreibung)"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
