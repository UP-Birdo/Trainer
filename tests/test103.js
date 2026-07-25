/* v103-Test: Flammen-Grenzdatum + Ruhetag-Block-Länge (Variante B + Auto-Ruhetage).
   Extrahiert die ECHTEN Funktionen aus index.html (nie kopieren). */
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

// MAX_LUECKE ist ein Skalar — Wert driftfrei aus der Quelle lesen.
const maxLuecke = (src.match(/MAX_LUECKE\s*=\s*(\d+)/) || [])[1] || "3";

const code = [
  "const MAX_LUECKE = " + maxLuecke + ";",
  grabFn("tageVerschieben"), grabFn("flammeGrenzdatum"), grabFn("ruhetagRunLen"),
  "module.exports = { flammeGrenzdatum, ruhetagRunLen, MAX_LUECKE };"
].join("\n");

const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) flammeGrenzdatum = letzter Trainingstag + MAX_LUECKE + 1 */
pruefe("Grenzdatum: kein Training -> null", T.flammeGrenzdatum([]) === null);
pruefe("Grenzdatum = letzter Trainingstag + (MAX_LUECKE+1)",
  T.flammeGrenzdatum([{datum:"2026-07-20"}]) === "2026-07-24");   // 20 + 4 = 24
pruefe("Grenzdatum nimmt den SPÄTESTEN Tag (auch unsortiert)",
  T.flammeGrenzdatum([{datum:"2026-07-10"},{datum:"2026-07-20"},{datum:"2026-07-05"}]) === "2026-07-24");
pruefe("Grenzdatum über den Monatswechsel",
  T.flammeGrenzdatum([{datum:"2026-07-30"}]) === "2026-08-03");   // 30 + 4

/* 2) ruhetagRunLen: Länge des zusammenhängenden Ruhetag-Blocks um ein Datum */
const set = new Set(["2026-07-10","2026-07-11","2026-07-12","2026-07-20"]);
pruefe("RunLen: allein stehender Tag = 1", T.ruhetagRunLen("2026-07-20", set) === 1);
pruefe("RunLen: Mitte eines 3er-Blocks = 3", T.ruhetagRunLen("2026-07-11", set) === 3);
pruefe("RunLen: linker Rand des Blocks = 3", T.ruhetagRunLen("2026-07-10", set) === 3);
pruefe("RunLen: rechter Rand des Blocks = 3", T.ruhetagRunLen("2026-07-12", set) === 3);
pruefe("RunLen: Tag ausserhalb zählt nur sich selbst = 1", T.ruhetagRunLen("2026-07-15", set) === 1);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
