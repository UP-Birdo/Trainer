/* v115-Test: Nicht-Kraft Etappe 1 — generische Aktivitäts-Messgröße (`mass`).
   Kern ist der reine `massText` (Text der Messgröße, parallel zur Strecke). Dazu
   strukturelle Verdrahtungs-Checks: Yoga trägt die mass-Config, die Erfassungs-
   maske hat das Feld, aktivitaetAblegen nimmt den Messwert, das Protokoll zeigt ihn.
   Echte Funktion extrahiert, Abhängigkeiten (sportart/zahlKurz) gestubbt. */
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
/* v144: die Yoga-Prüfung liest jetzt die ECHTE Tabelle statt mit einer
   Zeichen-Abstands-Regex im Quelltext zu suchen — ein zusätzliches Feld an der
   Sportart (hier `fortschritt`) darf sie nicht umwerfen (Lehre aus v136). */
function grabLiteral(name){
  const decl = "const " + name + " = ";
  const i = src.indexOf(decl);
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  let start = i + decl.length;
  while(start < src.length && src[start] !== "{" && src[start] !== "[") start++;
  const auf = src[start], zu = auf === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}
const SPORTARTEN_ECHT = eval("(" + grabLiteral("SPORTARTEN") + ")");

const code = [
  "const SPORTS = { yoga:{ mass:{ label:'Beweglichkeit', einheit:'°', schritt:5, start:30 } }, laufen:{ strecke:{ einheit:'km' } } };",
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

/* 1) massText: Wert nur, wo Sportart eine mass hat und ein Wert vorliegt. */
pruefe("Yoga 45 -> Beweglichkeit 45°", massText("yoga", 45) === "Beweglichkeit 45°");
pruefe("Yoga 0 -> leer", massText("yoga", 0) === "");
pruefe("Yoga undefined -> leer", massText("yoga", undefined) === "");
pruefe("Sportart ohne mass -> leer", massText("laufen", 5) === "");
pruefe("Unbekannte Sportart -> leer", massText("xxx", 5) === "");

/* 2) Verdrahtung im Quelltext. */
const yogaEintrag = SPORTARTEN_ECHT.find(s => s.id === "yoga");
pruefe("Yoga trägt mass-Config", !!(yogaEintrag && yogaEintrag.mass && yogaEintrag.mass.label && yogaEintrag.mass.schritt));
pruefe("Erfassungsfeld ein-mass vorhanden", src.includes('id="ein-mass"'));
pruefe("aktivitaetAblegen nimmt messwert",
  src.includes("function aktivitaetAblegen(sport, datum, dauerS, strecke, einheit, messwert)"));
pruefe("aktivitaetAblegen speichert messwert additiv", src.includes("neu.messwert = messwert"));
pruefe("Protokoll zeigt Messwert", src.includes("massText(e.sportart, e.messwert)"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
