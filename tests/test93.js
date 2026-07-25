/* v93-Test: geteilte Tag-Logik der Statistik-Neuordnung.
   Kalender UND 7-Tage-Vorschau entscheiden über EINE Quelle (tagStatus) und
   färben über EINE Routine (tagZellenStil → tagFarben) — dieser Test sichert
   diese gemeinsame Basis. Extrahiert die ECHTEN Funktionen (nie kopieren). */
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
  // Sportart→Farbe wird gestubbt (die echte liest die SPORTARTEN-Tabelle) —
  // hier zählt nur, dass tagZellenStil die Farben durchreicht.
  "const sportartFarbe = id => ({kraft:'#f4c74e', laufen:'#4e9af4', rad:'#4ef49a'})[id] || '#888888';",
  grabFn("wocheSeitEpoche"), grabFn("planAmTag"),
  grabFn("tagFarben"), grabFn("tagStatus"), grabFn("tagZellenStil"),
  "module.exports = { tagStatus, tagZellenStil };"
].join("\n");

const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const heute = "2026-07-24";
const keine = new Set();

/* 1) tagStatus — die Rolle eines Tages (Vorschau-Fall: mitPlan=false) */
let st = T.tagStatus("2026-07-24", heute, {"2026-07-24":[{sportart:"kraft"}]}, keine, null, false);
pruefe("Training erkannt (1 Sportart)",
  st.art === "trainiert" && st.farben.length === 1 && st.farben[0] === "kraft" && st.sonder === false);

st = T.tagStatus("2026-07-24", heute, {"2026-07-24":[{sportart:"kraft",sonder:true}]}, keine, null, false);
pruefe("Sondertraining -> sonder true", st.art === "trainiert" && st.sonder === true);

st = T.tagStatus("2026-07-24", heute, {"2026-07-24":[{sportart:"kraft"},{sportart:"laufen"}]}, keine, null, false);
pruefe("Zwei Sportarten -> zwei Farben", st.art === "trainiert" && st.farben.length === 2);

st = T.tagStatus("2026-07-24", heute, {"2026-07-24":[{sportart:"kraft"},{sportart:"kraft"}]}, keine, null, false);
pruefe("Gleiche Sportart doppelt -> eine Farbe", st.farben.length === 1);

st = T.tagStatus("2026-07-24", heute, {"2026-07-24":[{sportart:"kraft"}]}, new Set(["2026-07-24"]), null, false);
pruefe("Training schlägt Ruhetag", st.art === "trainiert");

st = T.tagStatus("2026-07-20", heute, {}, new Set(["2026-07-20"]), null, false);
pruefe("Ruhetag erkannt", st.art === "ruhe");

st = T.tagStatus("2026-07-20", heute, {}, keine, null, false);
pruefe("Vergangenheit ohne Training -> autoruhe", st.art === "autoruhe");

st = T.tagStatus("2026-07-24", heute, {}, keine, null, false);
pruefe("Heute ohne Training -> leer (Vorschau, ohne Plan)", st.art === "leer");

st = T.tagStatus("2026-07-25", heute, {}, keine, null, false);
pruefe("Zukunft ohne Plan (mitPlan=false) -> leer", st.art === "leer");

/* 2) tagStatus — Kalender-Fall (mitPlan=true zeigt Planung für Zukunft/Heute) */
const einzelPlan = { tage:[], einzelTermine:["2026-07-25"], sportart:"laufen" };
st = T.tagStatus("2026-07-25", heute, {}, keine, [einzelPlan], true);
pruefe("Zukunft mit Einzeltermin -> geplant + sonder",
  st.art === "geplant" && st.farben[0] === "laufen" && st.sonder === true);

const wtPlan = { tage:[1,2,3,4,5,6,7], einzelTermine:[], sportart:"kraft" };
st = T.tagStatus("2026-07-20", heute, {}, keine, [wtPlan], true);
pruefe("Vergangenheit schlägt Planung (autoruhe trotz Wochenplan)", st.art === "autoruhe");

/* 3) tagZellenStil — Status -> Darstellung (Klasse/Stil/Kern/Punkt) */
let z = T.tagZellenStil({art:"trainiert", farben:["kraft"], sonder:false});
pruefe("Zelle trainiert: Klasse + gefüllter Stil, kein Punkt",
  z.klasse === "tag trainiert" && z.stil.indexOf("style=") >= 0 && z.kern === false && z.punkt === "");

z = T.tagZellenStil({art:"trainiert", farben:["kraft"], sonder:true});
pruefe("Zelle trainiert + sonder -> Sonderpunkt", z.punkt.indexOf("sonderpunkt") >= 0);

z = T.tagZellenStil({art:"trainiert", farben:["kraft","laufen","rad"], sonder:false});
pruefe("Zelle 3 Sportarten -> mehrfach + Kern", z.klasse.indexOf("mehrfach") >= 0 && z.kern === true);

z = T.tagZellenStil({art:"geplant", farben:["laufen"], sonder:false});
pruefe("Zelle geplant: Klasse", z.klasse === "tag geplant");

z = T.tagZellenStil({art:"ruhe", farben:[], sonder:false});
pruefe("Zelle ruhe: Klasse, kein Stil", z.klasse === "tag ruhe" && z.stil === "");

z = T.tagZellenStil({art:"autoruhe", farben:[], sonder:false});
pruefe("Zelle autoruhe: Klasse", z.klasse === "tag autoruhe");

z = T.tagZellenStil({art:"leer", farben:[], sonder:false});
pruefe("Zelle leer: nur tag, kein Stil", z.klasse === "tag" && z.stil === "");

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
