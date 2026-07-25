/* v89-Test: Uebungs-Bibliothek — UEBUNG_INFO-Vollstaendigkeit + bibFilter.
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
  grabConst("UEBUNGEN_DB"),
  grabConst("UEBUNG_INFO"),
  grabFn("normName"),
  grabFn("bibFilter"),
  "module.exports = { UEBUNGEN_DB, UEBUNG_INFO, bibFilter };"
].join("\n");

const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) UEBUNG_INFO: jede DB-Uebung hat einen nicht-leeren Tipp, keine Leiche */
pruefe("Jede DB-Uebung hat eine Info",
  T.UEBUNGEN_DB.every(u => typeof T.UEBUNG_INFO[u.name] === "string" && T.UEBUNG_INFO[u.name].length > 5));
pruefe("Keine Info-Leiche (Name nicht in DB)",
  Object.keys(T.UEBUNG_INFO).every(n => T.UEBUNGEN_DB.some(u => u.name === n)));

/* 2) bibFilter: Kategorie + Suche */
pruefe("alle -> ganze DB", T.bibFilter(T.UEBUNGEN_DB, "alle", "").length === T.UEBUNGEN_DB.length);
const beine = T.bibFilter(T.UEBUNGEN_DB, "beine", "");
pruefe("beine -> nur beine", beine.length > 0 && beine.every(u => u.kat === "beine"));
const suche = T.bibFilter(T.UEBUNGEN_DB, "alle", "kniebeug");
pruefe("Suche 'kniebeug' findet Kniebeugen", suche.some(u => u.name === "Kniebeugen") && suche.every(u => /kniebeug/i.test(u.name)));
pruefe("Suche normalisiert (Grossschreibung)", T.bibFilter(T.UEBUNGEN_DB, "alle", "PLANK").some(u => u.name === "Plank"));
pruefe("Kategorie + Suche kombiniert", T.bibFilter(T.UEBUNGEN_DB, "druck", "bank").every(u => u.kat === "druck"));
pruefe("Nichts gefunden -> leer", T.bibFilter(T.UEBUNGEN_DB, "alle", "xyz-gibt-es-nicht").length === 0);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
