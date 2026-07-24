/* v84-Test: Fokus-Muskel je Uebung — KAT_MUSKELN-Integritaet + uebungMuskeln().
   Extrahiert die ECHTEN Daten/Funktionen aus index.html (nie kopieren). */
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
  grabFn("normName"),
  grabFn("uebungMuskeln"),
  "module.exports = { MUSKEL_ORDER, KAT_MUSKELN, UEBUNGEN_DB, uebungMuskeln };"
].join("\n");

const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) KAT_MUSKELN-Integritaet */
const kats = Object.keys(T.KAT_MUSKELN);
pruefe("5 Kategorien", kats.length === 5);
pruefe("Muskeln alle in MUSKEL_ORDER",
  kats.every(k => T.KAT_MUSKELN[k].muskeln.every(m => T.MUSKEL_ORDER.indexOf(m) >= 0)));
pruefe("Ansicht front/back", kats.every(k => ["front","back"].indexOf(T.KAT_MUSKELN[k].ansicht) >= 0));
pruefe("Jede Kategorie hat Label",
  kats.every(k => typeof T.KAT_MUSKELN[k].label === "string" && T.KAT_MUSKELN[k].label.length > 0));

/* 2) Jede in UEBUNGEN_DB vorkommende Kategorie ist abgedeckt — keine Uebung ohne Eintrag */
const dbKats = [...new Set(T.UEBUNGEN_DB.map(u => u.kat))];
pruefe("Jede DB-Kategorie in KAT_MUSKELN", dbKats.every(k => !!T.KAT_MUSKELN[k]));

/* 3) uebungMuskeln: exakter Treffer + richtige Ansicht je Kategorie */
const bein  = T.UEBUNGEN_DB.find(u => u.kat === "beine");
const druck = T.UEBUNGEN_DB.find(u => u.kat === "druck");
const zug   = T.UEBUNGEN_DB.find(u => u.kat === "zug");
pruefe("Beine-Uebung -> beine-Eintrag (Identitaet)", T.uebungMuskeln(bein.name) === T.KAT_MUSKELN.beine);
pruefe("Druck-Uebung -> vorne", T.uebungMuskeln(druck.name).ansicht === "front");
pruefe("Zug-Uebung -> hinten",  T.uebungMuskeln(zug.name).ansicht === "back");

/* 4) Normalisierung (Gross/Klein/Leerzeichen) + Freitext faellt auf null */
pruefe("Normalisiert getroffen",
  T.uebungMuskeln("  " + bein.name.toUpperCase() + "  ") === T.KAT_MUSKELN.beine);
pruefe("Unbekannt -> null", T.uebungMuskeln("Voellig Erfundene Uebung XYZ") === null);
pruefe("Leer/null -> null", T.uebungMuskeln("") === null && T.uebungMuskeln(null) === null);

/* 5) Cardio = Ganzkoerper: leere Muskelliste -> Figur wird bewusst ausgelassen */
pruefe("Cardio ohne Einzel-Fokus", T.KAT_MUSKELN.cardio.muskeln.length === 0);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
