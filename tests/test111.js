/* v111-Test: Ziele erscheinen erst mit einer Plan-Übung. Kern ist die Regel
   `zieleVerfuegbar()` = es gibt eine Übung/Aktivität in einem Plan ODER bereits
   Ziele. Getestet über die ECHTEN planUebungen()/zieleVerfuegbar() gegen ein
   gestubbtes `sitzung` (nie kopieren). */
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

const code = [
  grabFn("planUebungen"),
  grabFn("zieleVerfuegbar"),
  "module.exports = { planUebungen, zieleVerfuegbar };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

// sitzung ist global — planUebungen/zieleVerfuegbar lesen sitzung.daten.
function setze(plaene, ziele){ global.sitzung = { daten: { plaene, ziele } }; }

const kraftPlan = uebungen => ({ typ:"kraft", name:"Plan", tage:[1], uebungen });
const uebung = name => ({ name, modus:"wdh", wdh:10, gewicht:20, gewichtSchritt:2.5, dauer:0, zeitEinheit:"s" });
const aktivitaet = { typ:"aktivitaet", name:"Laufen", tage:[2], sportart:"laufen", dauer:1800, strecke:5, zeitEinheit:"min", uebungen:[] };

/* 1) Nichts da -> Ziele nicht verfügbar */
setze([], []);
pruefe("Keine Pläne, keine Ziele -> planUebungen leer", T.planUebungen().length === 0);
pruefe("Keine Pläne, keine Ziele -> nicht verfügbar", T.zieleVerfuegbar() === false);

/* 2) Plan mit einer echten Übung -> verfügbar */
setze([kraftPlan([uebung("Kniebeuge")])], []);
pruefe("Plan mit Übung -> planUebungen findet sie", T.planUebungen().some(u => u.name === "Kniebeuge"));
pruefe("Plan mit Übung -> verfügbar", T.zieleVerfuegbar() === true);

/* 3) Aktivitätsplan (ohne Übungen) zählt selbst als Ziel-Kandidat */
setze([aktivitaet], []);
pruefe("Aktivitätsplan -> planUebungen enthält ihn", T.planUebungen().some(u => u.name === "Laufen"));
pruefe("Aktivitätsplan -> verfügbar", T.zieleVerfuegbar() === true);

/* 4) Keine Plan-Übung, aber bestehende Ziele -> weiter verfügbar (Daten erreichbar) */
setze([], [{ id:"z1", uebung:"Kniebeuge", art:"wdh", wert:20, einheit:"Wdh", datum:"2026-12-01" }]);
pruefe("Nur bestehendes Ziel -> planUebungen leer", T.planUebungen().length === 0);
pruefe("Nur bestehendes Ziel -> trotzdem verfügbar", T.zieleVerfuegbar() === true);

/* 5) Plan nur mit leerem Übungsnamen -> keine echte Übung -> nicht verfügbar */
setze([kraftPlan([uebung("   ")])], []);
pruefe("Leerer Übungsname zählt nicht", T.planUebungen().length === 0);
pruefe("Nur leere Übung -> nicht verfügbar", T.zieleVerfuegbar() === false);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
