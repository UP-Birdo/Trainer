/* v118-Test: Nicht-Kraft Etappe 3 — geführter Intervall-Timer. Die kniffligen
   Teile (Phasen-Abfolge, Gesamtdauer, aktuelle Phase + Restsekunden) sind reine
   Funktionen und hier abgesichert. Die DOM-/Ton-/Wach-Verdrahtung ist iOS-eigen
   und nur am Gerät prüfbar. Echte Funktionen extrahiert (nie kopiert). */
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
  grabFn("intervallPhasen"), grabFn("intervallGesamt"), grabFn("intervallPhaseBei"),
  "module.exports = { intervallPhasen, intervallGesamt, intervallPhaseBei };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Phasen-Abfolge: je Runde Belastung, dazwischen Pause (nicht nach der letzten). */
const p = T.intervallPhasen(3, 30, 15);
pruefe("3 Runden/15 Pause -> 5 Phasen", p.length === 5);
pruefe("Erste Phase Belastung ab 0", p[0].art === "belastung" && p[0].ab === 0 && p[0].runde === 1);
pruefe("Zweite Phase Pause ab 30", p[1].art === "pause" && p[1].ab === 30);
pruefe("Dritte Phase Belastung ab 45", p[2].art === "belastung" && p[2].ab === 45 && p[2].runde === 2);
pruefe("Letzte Phase Belastung ab 90 (keine End-Pause)", p[p.length - 1].art === "belastung" && p[p.length - 1].runde === 3 && p[p.length - 1].ab === 90);
pruefe("Gesamtdauer 120 s (3×30 + 2×15)", T.intervallGesamt(p) === 120);

/* 2) Pause 0 -> nur Belastungen. */
const p0 = T.intervallPhasen(3, 30, 0);
pruefe("Pause 0 -> 3 Phasen", p0.length === 3 && p0.every(x => x.art === "belastung"));
pruefe("Pause 0 -> Gesamt 90 s", T.intervallGesamt(p0) === 90);

/* 3) Eine Runde -> eine Phase, keine Pause. */
const p1 = T.intervallPhasen(1, 60, 20);
pruefe("1 Runde -> 1 Phase", p1.length === 1 && T.intervallGesamt(p1) === 60);

/* 4) Aktuelle Phase + Restsekunden. */
pruefe("bei 0 -> Belastung r1, Rest 30", (() => { const s = T.intervallPhaseBei(p, 0); return s.phase.art === "belastung" && s.rest === 30; })());
pruefe("bei 29,5 -> Rest 1", T.intervallPhaseBei(p, 29.5).rest === 1);
pruefe("bei 30 -> Pause r1", (() => { const s = T.intervallPhaseBei(p, 30); return s.phase.art === "pause" && s.phase.runde === 1 && s.rest === 15; })());
pruefe("bei 45 -> Belastung r2", (() => { const s = T.intervallPhaseBei(p, 45); return s.phase.art === "belastung" && s.phase.runde === 2; })());
pruefe("bei 119,9 -> Belastung r3, Rest 1", (() => { const s = T.intervallPhaseBei(p, 119.9); return s.phase.runde === 3 && s.phase.art === "belastung" && s.rest === 1; })());
pruefe("bei 120 -> fertig (null)", T.intervallPhaseBei(p, 120) === null);
pruefe("weit danach -> fertig (null)", T.intervallPhaseBei(p, 500) === null);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
