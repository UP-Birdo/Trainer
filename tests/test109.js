/* v109-Test: adaptive Pläne-Liste. Die Dichte-Entscheidung (volle Karten /
   schlanke Zeilen / Sportart-Akkordeon) steckt in planListenDichte — dieser
   Test extrahiert die ECHTE Funktion samt ihrer Schwellen (nie kopieren) und
   prüft die drei Stufen und den Sonderfall „viele Pläne, aber nur 1 Sportart". */
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
/* Skalare Konstante (Zahl) wörtlich aus der Quelle ziehen — so tracked der Test
   die echten Schwellen mit, statt sie zu duplizieren. */
function grabZahl(name){
  const m = src.match(new RegExp("const " + name + " = (\\d+);"));
  if(!m) throw new Error("Konstante nicht gefunden: " + name);
  return "const " + name + " = " + m[1] + ";";
}

const code = [
  grabZahl("PLAN_VOLL_MAX"),
  grabZahl("PLAN_AKKORDEON_MIN"),
  grabFn("planListenDichte"),
  "module.exports = { planListenDichte, PLAN_VOLL_MAX, PLAN_AKKORDEON_MIN };"
].join("\n");

const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const liste = n => Array.from({ length: n }, (_, i) => ({ id: i }));
const VOLL = T.PLAN_VOLL_MAX, AKK = T.PLAN_AKKORDEON_MIN;

/* Schwellen selbst müssen sinnvoll gestaffelt sein. */
pruefe("Schwellen gestaffelt", VOLL >= 1 && AKK > VOLL);

/* 1) voll: bis einschließlich PLAN_VOLL_MAX -> volle Karten */
pruefe("0 Pläne -> voll", T.planListenDichte(liste(0), 0) === "voll");
pruefe("Genau VOLL_MAX -> voll", T.planListenDichte(liste(VOLL), 3) === "voll");

/* 2) zeilen: über VOLL_MAX, aber unter AKKORDEON_MIN */
pruefe("VOLL_MAX+1 -> zeilen", T.planListenDichte(liste(VOLL + 1), 3) === "zeilen");
pruefe("AKKORDEON_MIN-1 -> zeilen", T.planListenDichte(liste(AKK - 1), 3) === "zeilen");

/* 3) akkordeon: ab AKKORDEON_MIN UND mindestens 2 Sportarten */
pruefe("AKKORDEON_MIN & 2 Sportarten -> akkordeon", T.planListenDichte(liste(AKK), 2) === "akkordeon");
pruefe("Sehr viele & 3 Sportarten -> akkordeon", T.planListenDichte(liste(20), 3) === "akkordeon");

/* 4) Sonderfall: sehr viele Pläne, aber nur EINE Sportart -> kein Akkordeon */
pruefe("Viele Pläne, 1 Sportart -> zeilen", T.planListenDichte(liste(20), 1) === "zeilen");

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
