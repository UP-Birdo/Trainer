/* 0.225.0-Test: Der Versions-Verlauf beginnt mit einer Zusammenfassung.

   Nutzer-Wunsch: „Fass den Versions-Verlauf in der App zusammen, mit nur den
   wichtigsten Punkten."

   Die Zusage hat ZWEI Haelften, und die zweite ist die wichtigere:
   1. Zuerst zu sehen ist `HOEHEPUNKTE` — wenige Abschnitte statt 150 Versionen.
   2. NICHTS geht verloren: `NEUIGKEITEN` bleibt vollstaendig (daraus entsteht
      CHANGELOG.md, und ueber fuenfzig Tests pruefen darin ihren Eintrag), die
      volle Liste ist einen Tipp entfernt.
   Hinweis: in Test-LABELS keine typografischen Anfuehrungszeichen (Haus-Falle). */
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
function grabListe(name){
  const i = src.indexOf("const " + name + " = [");
  if(i < 0) throw new Error("Liste nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf("[", i); k < src.length; k++){
    if(src[k] === "[") tiefe++;
    else if(src[k] === "]"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabListe("HOEHEPUNKTE"), grabListe("NEUIGKEITEN"),
  "module.exports = { HOEHEPUNKTE, NEUIGKEITEN };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die Zusammenfassung ---------- */
pruefe("es gibt Hoehepunkte", Array.isArray(A.HOEHEPUNKTE) && A.HOEHEPUNKTE.length > 0);
/* „Zusammenfassung" heisst: deutlich weniger als die volle Liste. Die Zahl ist
   bewusst grosszuegig gefasst — sie soll den Zweck sichern, nicht das Layout. */
pruefe("sie ist kurz (hoechstens zwoelf Abschnitte)", A.HOEHEPUNKTE.length <= 12);
pruefe("und viel kuerzer als die volle Liste", A.HOEHEPUNKTE.length < A.NEUIGKEITEN.length / 5);
pruefe("jeder Abschnitt hat einen Titel und Punkte",
  A.HOEHEPUNKTE.every(h => typeof h.stand === "string" && h.stand.length > 0 &&
                           Array.isArray(h.punkte) && h.punkte.length > 0));
pruefe("kein Abschnitt ist leergelaufen",
  A.HOEHEPUNKTE.every(h => h.punkte.every(p => typeof p === "string" && p.length > 20)));
/* Der neueste Abschnitt muss die aktuelle Version einschliessen — sonst faellt
   die Zusammenfassung mit jeder Bau-Runde weiter hinter die App zurueck. */
const version = /const VERSION = "([\d.]+)";/.exec(src)[1];
const minor = version.split(".")[1];
pruefe("der oberste Abschnitt reicht bis zur aktuellen Version",
  A.HOEHEPUNKTE[0].stand.includes("0." + minor));
/* Sie deckt die ganze Geschichte ab, nicht nur das letzte Jahr. */
pruefe("der aelteste Abschnitt nennt die Grundlagen",
  A.HOEHEPUNKTE[A.HOEHEPUNKTE.length - 1].stand.toLowerCase().includes("grundlagen"));

/* ---------- 2) Nichts ist verloren gegangen ---------- */
pruefe("die volle Liste steht weiterhin da", A.NEUIGKEITEN.length > 100);
/* Stichproben ueber die ganze Spanne — genau diese Eintraege pruefen die
   Tests der jeweiligen Version ebenfalls. */
["0.163", "0.190", "0.205", "0.218", "0.223", "0.224.0"].forEach(v =>
  pruefe("Version " + v + " steht noch in der vollen Liste",
    A.NEUIGKEITEN.some(n => n.stand === v)));
pruefe("die neueste Version hat ihren eigenen Eintrag",
  A.NEUIGKEITEN[0].stand === version);

/* ---------- 3) Die Verdrahtung ---------- */
const oeffnen = grabFn("neuigkeitenOeffnen");
pruefe("zuerst gezeichnet werden die Hoehepunkte", oeffnen.includes("HOEHEPUNKTE.map("));
pruefe("die volle Liste nicht sofort", !oeffnen.includes("NEUIGKEITEN.map("));
pruefe("es gibt einen Weg zur vollen Liste", oeffnen.includes("neuigkeitenAlleZeigen()"));
const alle = grabFn("neuigkeitenAlleZeigen");
pruefe("der Weg zeichnet sie", alle.includes("NEUIGKEITEN.map("));
pruefe("und nur einmal", alle.includes("if(!ziel || ziel.innerHTML) return"));
pruefe("danach ist der Knopf weg", alle.includes("knopf.hidden = true"));
/* Beide Darstellungen kommen durch denselben Bauer — sonst driften sie. */
pruefe("es gibt EINEN gemeinsamen Bauer", src.includes("function neuigkeitenAbschnitt("));
pruefe("beide nutzen ihn",
  oeffnen.includes("neuigkeitenAbschnitt(") && alle.includes("neuigkeitenAbschnitt("));
pruefe("Nutzertext wird escaped (v119-Regel)",
  grabFn("neuigkeitenAbschnitt").includes("text(stand)"));

/* ---------- 4) Version ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("APP_VERSION passt zu VERSION (MINOR * 1000 + PATCH)", (() => {
  const [, mi, pa] = version.split(".");
  return Number(/const APP_VERSION = (\d+);/.exec(src)[1]) === Number(mi) * 1000 + Number(pa);
})());
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.225.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
