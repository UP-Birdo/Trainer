/* v117-Test: Nicht-Kraft Etappe 2 — Kletter-Schwierigkeitsgrad (Ordinalskala).
   Kern ist `massText`, das jetzt zwei Arten trägt: Skala (Grad als String, ohne
   Einheit) und numerisch (Beweglichkeit, Zahl + Einheit — Regression). Dazu
   strukturelle Verdrahtungs-Checks (Klettern-Skala, Auswahl-Feld, Helfer, Guard). */
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
  "const SPORTS = { yoga:{ mass:{ label:'Beweglichkeit', einheit:'°' } }, " +
    "klettern:{ mass:{ label:'Schwierigkeit', skala:['5a','6a','6a+'], start:'5a' } }, laufen:{ strecke:{} } };",
  "function sportart(id){ return SPORTS[id] || {}; }",
  "function zahlKurz(n){ return String(n).replace('.', ','); }",
  grabFn("massText"),
  "module.exports = { massText };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const massText = modul.exports.massText;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Skala (Kletter-Grad): String ohne Einheit. */
pruefe("Klettern 6a -> Schwierigkeit 6a", massText("klettern", "6a") === "Schwierigkeit 6a");
pruefe("Klettern 6a+ -> Schwierigkeit 6a+", massText("klettern", "6a+") === "Schwierigkeit 6a+");
pruefe("Klettern leer -> leer", massText("klettern", "") === "");
pruefe("Klettern undefined -> leer", massText("klettern", undefined) === "");

/* 2) Numerisch (Beweglichkeit) unverändert (Regression zu v115). */
pruefe("Yoga 45 -> Beweglichkeit 45°", massText("yoga", 45) === "Beweglichkeit 45°");
pruefe("Yoga 0 -> leer", massText("yoga", 0) === "");
pruefe("Sportart ohne mass -> leer", massText("laufen", 5) === "");

/* 3) Verdrahtung im Quelltext. */
pruefe("Klettern trägt Skala", /id:"klettern"[\s\S]{0,400}skala:\[/.test(src));
pruefe("Auswahl-Feld ein-mass-select vorhanden", src.includes('id="ein-mass-select"'));
pruefe("Helfer massFeldAufbauen da", src.includes("function massFeldAufbauen("));
pruefe("Helfer massEingabe da", src.includes("function massEingabe("));
pruefe("Speicher-Guard akzeptiert Grad-String (truthy)",
  src.includes("if(sportart(sport).mass && messwert) neu.messwert = messwert"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
