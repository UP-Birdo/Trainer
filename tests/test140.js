/* v140-Test: Muskel-Zuordnung fuer die Sportart-Drills.
   Geprueft wird die ECHTE `uebungMuskeln` mit den echten Tabellen: findet sie
   einen Drill (exakt und normalisiert), liefert sie Primaer- und Sekundaer-
   muskeln, waehlt sie die richtige Figur-Seite — und bleibt sie bei Kraft-
   uebungen und Unbekanntem unveraendert. Dazu die Integritaet von SPORT_MUSKELN:
   jeder Schluessel ist ein echter Drill, jeder Muskel ein bekannter.
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
  while(start < src.length && src[start] !== "{" && src[start] !== "[") start++;
  const auf = src[start], zu = auf === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabLiteral("MUSKELKARTEN") ? "const MUSKELKARTEN = " + grabLiteral("MUSKELKARTEN") + ";" : "",
  "const MUSKELKARTE_AKTIV = 'standard';",
  grabFn("muskelKarteDef"),
  "const MUSKEL_ORDER = muskelKarteDef().order;",
  "const MUSKEL_SEITE = muskelKarteDef().seite;",
  "const MUSKEL_INFO = " + grabLiteral("MUSKEL_INFO") + ";",
  "const UEBUNGEN_DB = " + grabLiteral("UEBUNGEN_DB") + ";",
  "const UEBUNG_MUSKELN = " + grabLiteral("UEBUNG_MUSKELN") + ";",
  "const KAT_MUSKELN = " + grabLiteral("KAT_MUSKELN") + ";",
  "const SPORT_MUSKELN = " + grabLiteral("SPORT_MUSKELN") + ";",
  "const SPORT_UEBUNGEN = " + grabLiteral("SPORT_UEBUNGEN") + ";",
  grabFn("normName"), grabFn("muskelAufKarte"), grabFn("muskelnAufKarte"),
  grabFn("uebungMuskelSatz"), grabFn("muskelSatzAnzeige"), grabFn("uebungMuskeln"),
  "module.exports = { uebungMuskeln, SPORT_MUSKELN, SPORT_UEBUNGEN, UEBUNGEN_DB, MUSKEL_ORDER };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Drills finden jetzt eine Figur. */
const topspin = T.uebungMuskeln("Vorhand-Topspin (Übungskorb)");
pruefe("Drill wird gefunden", !!topspin);
pruefe("Topspin: Rumpf-Rotation primaer", topspin.muskeln.indexOf("obliques") >= 0);
pruefe("Topspin: Sekundaermuskeln dabei", topspin.sekundaer.length > 0);
pruefe("Topspin: Vorderseite", topspin.ansicht === "front");
pruefe("Topspin: Label aus den Regionen", !!topspin.label);

const yoga = T.uebungMuskeln("Tiefe Vorbeuge (Dehnung)");
pruefe("Yoga-Dehnung gefunden", !!yoga && yoga.muskeln.join() === "hamstrings");
pruefe("Beinbeuger liegt hinten -> Rueckansicht", yoga.ansicht === "back");

/* Normalisierter Treffer (Gross/Klein, Leerzeichen) — wie bei Kraftuebungen. */
pruefe("normalisierter Name findet auch", !!T.uebungMuskeln("  schattenboxen  "));

/* 2) Kraftuebungen unveraendert (Regression). */
const kn = T.uebungMuskeln("Kniebeugen");
pruefe("Kniebeugen weiter primaer Quadrizeps", kn.muskeln[0] === "quadriceps");
pruefe("Kniebeugen haben Sekundaermuskeln (v139)", kn.sekundaer.length > 0);
pruefe("Unbekanntes bleibt ohne Figur", T.uebungMuskeln("Phantasie-Uebung") === null);
pruefe("leerer Name bleibt null", T.uebungMuskeln("") === null);
/* Ein Drill-Name, der ABSICHTLICH nicht zugeordnet ist, bleibt figurlos. */
pruefe("Aufschlag-Training bleibt bewusst ohne Figur", T.uebungMuskeln("Aufschlag-Training") === null);

/* 3) Integritaet von SPORT_MUSKELN. */
const drills = new Set();
Object.keys(T.SPORT_UEBUNGEN).forEach(s => T.SPORT_UEBUNGEN[s].forEach(u => drills.add(u.name)));
const leichen = Object.keys(T.SPORT_MUSKELN).filter(n => !drills.has(n));
pruefe("kein Schluessel ohne Drill" + (leichen.length ? " (" + leichen.join(", ") + ")" : ""), leichen.length === 0);
const gueltig = new Set(T.MUSKEL_ORDER);
const schlecht = [];
Object.keys(T.SPORT_MUSKELN).forEach(n => {
  const e = T.SPORT_MUSKELN[n];
  (e.p || []).concat(e.s || []).forEach(m => { if(!gueltig.has(m)) schlecht.push(n + ":" + m); });
});
pruefe("nur bekannte Muskeln" + (schlecht.length ? " (" + schlecht.slice(0,5).join(", ") + ")" : ""),
  schlecht.length === 0);
pruefe("jeder Eintrag hat Primaermuskeln",
  Object.keys(T.SPORT_MUSKELN).every(n => (T.SPORT_MUSKELN[n].p || []).length > 0));
pruefe("mindestens 30 Drills zugeordnet", Object.keys(T.SPORT_MUSKELN).length >= 30);
pruefe("mindestens 8 Sportarten abgedeckt", (() => {
  const sp = Object.keys(T.SPORT_UEBUNGEN).filter(s =>
    T.SPORT_UEBUNGEN[s].some(u => T.SPORT_MUSKELN[u.name]));
  return sp.length >= 8;
})());

/* 4) Eine Stelle fuer beide Wege. */
pruefe("gemeinsame Anzeige-Funktion", src.includes("function muskelSatzAnzeige("));
pruefe("Kraft-Zweig nutzt sie", grabFn("uebungMuskeln").includes("const fein = muskelSatzAnzeige("));
pruefe("Drill-Zweig nutzt sie", grabFn("uebungMuskeln").includes("muskelSatzAnzeige(uebungMuskelSatz(s))"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
