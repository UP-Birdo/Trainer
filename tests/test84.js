/* v84-Test: grobe Fallback-Zuordnung KAT_MUSKELN (Kategorie -> Muskeln).
   Das FEINE Verhalten von uebungMuskeln() prueft seit v86 tests/test86.js.
   Extrahiert die ECHTEN Daten aus index.html (nie kopieren). */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

function grabConst(name){
  const i = src.indexOf("const " + name + " =");
  if(i < 0) throw new Error("const nicht gefunden: " + name);
  let s = i; while(src[s] !== "{" && src[s] !== "[") s++;
  const auf = src[s], zu = auf === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = s; k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const code = [
  grabConst("MUSKEL_ORDER"),
  grabConst("KAT_MUSKELN"),
  grabConst("UEBUNGEN_DB"),
  "module.exports = { MUSKEL_ORDER, KAT_MUSKELN, UEBUNGEN_DB };"
].join("\n");

const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* KAT_MUSKELN-Integritaet (grobe Fallback-Zuordnung je Kategorie) */
const kats = Object.keys(T.KAT_MUSKELN);
pruefe("5 Kategorien", kats.length === 5);
pruefe("Muskeln alle in MUSKEL_ORDER",
  kats.every(k => T.KAT_MUSKELN[k].muskeln.every(m => T.MUSKEL_ORDER.indexOf(m) >= 0)));
pruefe("Ansicht front/back", kats.every(k => ["front","back"].indexOf(T.KAT_MUSKELN[k].ansicht) >= 0));
pruefe("Jede Kategorie hat Label",
  kats.every(k => typeof T.KAT_MUSKELN[k].label === "string" && T.KAT_MUSKELN[k].label.length > 0));

/* Jede in UEBUNGEN_DB vorkommende Kategorie ist abgedeckt (Fallback greift immer) */
const dbKats = [...new Set(T.UEBUNGEN_DB.map(u => u.kat))];
pruefe("Jede DB-Kategorie in KAT_MUSKELN", dbKats.every(k => !!T.KAT_MUSKELN[k]));

/* Cardio = Ganzkoerper: leere Muskelliste -> Figur wird bewusst ausgelassen */
pruefe("Cardio ohne Einzel-Fokus", T.KAT_MUSKELN.cardio.muskeln.length === 0);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
