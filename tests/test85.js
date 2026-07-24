/* v85-Test: Meilenstein-Flammen + Scheibenrechner.
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
  grabConst("SERIEN_MEILENSTEINE"),
  grabFn("serienMeilenstein"),
  grabConst("SCHEIBEN"),
  grabFn("scheibenRechnen"),
  "module.exports = { serienMeilenstein, scheibenRechnen, SCHEIBEN };"
].join("\n");

const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Meilenstein-Grenzen */
const ms = n => T.serienMeilenstein(n);
pruefe("0 -> keine, naechste 7",        ms(0).erreicht === 0   && ms(0).naechster === 7);
pruefe("6 -> keine, naechste 7",        ms(6).erreicht === 0   && ms(6).naechster === 7);
pruefe("7 -> 7, naechste 30",           ms(7).erreicht === 7   && ms(7).naechster === 30);
pruefe("29 -> 7, naechste 30",          ms(29).erreicht === 7  && ms(29).naechster === 30);
pruefe("30 -> 30, naechste 100",        ms(30).erreicht === 30 && ms(30).naechster === 100);
pruefe("100 -> 100, keine naechste",    ms(100).erreicht === 100 && ms(100).naechster === null);
pruefe("250 -> 100, keine naechste",    ms(250).erreicht === 100 && ms(250).naechster === null);

/* 2) Scheibenrechner */
const kurz = r => r.proSeite.map(p => p.anzahl + "x" + p.scheibe).join("+");
let r = T.scheibenRechnen(60, 20, T.SCHEIBEN);
pruefe("60/20 -> 1x20, rest 0",         kurz(r) === "1x20" && r.rest === 0 && r.machbar === true);
r = T.scheibenRechnen(100, 20, T.SCHEIBEN);
pruefe("100/20 -> 1x25+1x15, rest 0",   kurz(r) === "1x25+1x15" && r.rest === 0);
r = T.scheibenRechnen(61, 20, T.SCHEIBEN);
pruefe("61/20 -> 1x20, rest 0.5",       kurz(r) === "1x20" && r.rest === 0.5 && r.machbar === true);
r = T.scheibenRechnen(20, 20, T.SCHEIBEN);
pruefe("20/20 -> nur Stange, rest 0",   r.proSeite.length === 0 && r.rest === 0 && r.machbar === true);
r = T.scheibenRechnen(15, 20, T.SCHEIBEN);
pruefe("15/20 -> nicht machbar",        r.machbar === false);
r = T.scheibenRechnen(0, 20, T.SCHEIBEN);
pruefe("0 -> nicht machbar",            r.machbar === false);
r = T.scheibenRechnen(25, 15, T.SCHEIBEN);
pruefe("25/15 -> 1x5, rest 0",          kurz(r) === "1x5" && r.rest === 0);

/* 3) Summenprobe: Stange + 2*Scheiben == Ziel, wenn rest 0 */
r = T.scheibenRechnen(100, 20, T.SCHEIBEN);
const summe = 20 + 2 * r.proSeite.reduce((s, p) => s + p.anzahl * p.scheibe, 0);
pruefe("Summe 100/20 == 100",           summe === 100);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
