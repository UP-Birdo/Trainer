/* v134-Test: Koerpermasse (Umfaenge neben dem Gewicht).
   Kern sind drei reine Funktionen: `koerpermassReihe` (Einträge einer Maßart,
   chronologisch), `koerpermassSetzen` (EIN Wert je Tag UND Art) und
   `koerpermassTrend` (Veraenderung seit dem ersten Eintrag). Dazu die
   Verdrahtung (Datenfeld nachgeruestet, Kachel, Stufen-Gate).
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
function grabLiteral(name){
  const decl = "const " + name + " = ";
  const i = src.indexOf(decl);
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  let start = i + decl.length;
  while(start < src.length && src[start] !== "[" && src[start] !== "{") start++;
  const auf = src[start], zu = auf === "[" ? "]" : "}";
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("koerpermassReihe"), grabFn("koerpermassSetzen"), grabFn("koerpermassTrend"),
  "module.exports = { koerpermassReihe, koerpermassSetzen, koerpermassTrend };"
].join("\n"))(modul, modul.exports);
const { koerpermassReihe, koerpermassSetzen, koerpermassTrend } = modul.exports;
const KOERPERMASSE = eval("(" + grabLiteral("KOERPERMASSE") + ")");

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const werte = r => r.map(e => e.wert).join(",");

/* 1) Die Maß-Tabelle. */
pruefe("fuenf Umfaenge", KOERPERMASSE.length === 5);
pruefe("jeder mit id und Namen", KOERPERMASSE.every(m => m.id && m.name));
pruefe("keine doppelte id", new Set(KOERPERMASSE.map(m => m.id)).size === KOERPERMASSE.length);
pruefe("Taille ist dabei", KOERPERMASSE.some(m => m.id === "taille"));

/* 2) koerpermassReihe — nur die eigene Art, chronologisch. */
const liste = [
  { datum:"2026-03-01", art:"arm", wert:38 },
  { datum:"2026-01-01", art:"arm", wert:36 },
  { datum:"2026-02-01", art:"taille", wert:80 }
];
pruefe("nur die gewaehlte Art", werte(koerpermassReihe(liste, "arm")) === "36,38");
pruefe("chronologisch sortiert", koerpermassReihe(liste, "arm")[0].datum === "2026-01-01");
pruefe("Original bleibt unsortiert", liste[0].datum === "2026-03-01");
pruefe("andere Art getrennt", werte(koerpermassReihe(liste, "taille")) === "80");
pruefe("unbekannte Art -> leer", koerpermassReihe(liste, "nase").length === 0);
pruefe("leere Liste -> leer", koerpermassReihe([], "arm").length === 0);
pruefe("undefined -> leer", koerpermassReihe(undefined, "arm").length === 0);
pruefe("kaputte Zeile wirft nicht", koerpermassReihe([null, { art:"arm", datum:"2026-01-01", wert:1 }], "arm").length === 1);

/* 3) koerpermassSetzen — ein Wert je Tag UND Art. */
let l = [];
koerpermassSetzen(l, "2026-01-01", "arm", 36);
koerpermassSetzen(l, "2026-01-01", "taille", 80);
pruefe("gleicher Tag, andere Art = zwei Zeilen", l.length === 2);
koerpermassSetzen(l, "2026-01-01", "arm", 37);
pruefe("gleicher Tag + gleiche Art korrigiert", l.length === 2 && koerpermassReihe(l, "arm")[0].wert === 37);
koerpermassSetzen(l, "2025-12-01", "arm", 35);
pruefe("frueherer Eintrag wird einsortiert", werte(koerpermassReihe(l, "arm")) === "35,37");
pruefe("Liste bleibt insgesamt sortiert", l[0].datum === "2025-12-01");

/* 4) koerpermassTrend — die eigentliche Aussage. */
pruefe("Zuwachs", koerpermassTrend(koerpermassReihe(l, "arm")) === 2);
pruefe("ein Eintrag hat keinen Trend", koerpermassTrend(koerpermassReihe(l, "taille")) === null);
pruefe("leere Reihe hat keinen Trend", koerpermassTrend([]) === null);
pruefe("Abnahme ist negativ", koerpermassTrend([{wert:82},{wert:79.5}]) === -2.5);
pruefe("rundet auf Zehntel", koerpermassTrend([{wert:80},{wert:80.26}]) === 0.3);

/* 5) Verdrahtung. */
pruefe("Datenfeld wird nachgeruestet",
  src.includes("if(!Array.isArray(daten.koerpermasse)) daten.koerpermasse = []"));
pruefe("eigene Statistik-Kachel", src.includes('id="stat-koerpermasse"') && src.includes('["koerpermasse",'));
pruefe("immer waehlbar (manuell befuellt)", src.includes('if(id === "koerpermasse")   return true'));
pruefe("Kachel wird beim Oeffnen gezeichnet",
  grabFn("statistikOeffnen").includes("koerpermassZeichnen()"));
pruefe("Detail-Ansicht ab Stufe 4", src.includes('"view-koerpermasse": 4'));
pruefe("Tipp auf die Kurve oeffnet die Eintraege",
  src.includes('onclick="koerpermassDetailsOeffnen()"'));
pruefe("Namen kollidieren nicht mit der Messgroesse (mass...)",
  src.includes("function koerpermassSetzen(") && src.includes("function massSchritt("));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
