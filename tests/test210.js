/* v210-Test: Die Zeitachse der Kurven ist eine ZEITACHSE (54. Runde, dritter Befund).

   Bis v209 setzten Koerpergewicht, BMI und Uebungs-Fortschritt ihre Punkte
   ueber den INDEX. Zwei Messungen an aufeinanderfolgenden Tagen standen damit
   genauso weit auseinander wie zwei mit acht Wochen dazwischen — die Steigung
   log, und eine Pause war unsichtbar.

   Die drei Zusagen, die dieser Test haelt:
   1. ABSTAND = ZEIT. Der Platz eines Punktes kommt aus seinem Datum.
   2. EINE STELLE. Alle drei Kurven rechnen ueber dieselbe Funktion — sonst
      driften sie auseinander wie frueher `ex` und UEBUNG_MUSKELN (v195).
   3. EHRLICHER RUECKFALL. Ohne brauchbares Datum (oder wenn alles auf denselben
      Tag faellt) gibt es keine Zeitachse — dann sind gleiche Abstaende die
      ehrlichste Darstellung, kein Notnagel.
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
function grabBlock(name, open, close){
  const i = src.indexOf("const " + name + " = " + open);
  if(i < 0) throw new Error("Block nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf(open, i); k < src.length; k++){
    if(src[k] === open) tiefe++;
    else if(src[k] === close){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("begrenzen"),
  grabFn("text"),
  grabFn("tagDifferenz"),
  grabFn("kurvenAnteile"),
  grabFn("kurvenX"),
  grabFn("gewichtKurveHtml"),
  grabBlock("BMI_BEREICHE", "[", "]"),
  grabFn("bmiKurveHtml"),
  "module.exports = { kurvenAnteile, kurvenX, gewichtKurveHtml, bmiKurveHtml };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const nah = (a, b) => Math.abs(a - b) < 0.0001;

/* ---------- 1) kurvenAnteile ---------- */
const E = (d) => ({ datum: d });
pruefe("ohne Eintraege kommt nichts heraus", A.kurvenAnteile([]).length === 0);
pruefe("null wirft nicht", A.kurvenAnteile(null).length === 0);
pruefe("ein einzelner Punkt steht in der Mitte",
  JSON.stringify(A.kurvenAnteile([E("2026-01-01")])) === "[0.5]");
pruefe("zwei Punkte spannen die ganze Achse",
  JSON.stringify(A.kurvenAnteile([E("2026-01-01"), E("2026-03-01")])) === "[0,1]");

/* Der Kern: Ein Punkt kurz nach dem ersten gehoert NACH LINKS, nicht in die
   Mitte. Genau das war der Fehler — im Index-Modus stand er bei 0,5. */
{
  const a = A.kurvenAnteile([E("2026-01-01"), E("2026-01-03"), E("2026-03-02")]);
  pruefe("der Abstand kommt aus dem Datum, nicht aus der Reihenfolge",
    nah(a[0], 0) && nah(a[2], 1) && nah(a[1], 2 / 60));
  pruefe("und liegt damit klar links der Mitte", a[1] < 0.1);
}
/* Gleichmaessige Daten ergeben gleichmaessige Anteile — die Kurve sieht dann
   aus wie frueher. Kein Bruch fuer den Normalfall. */
{
  const a = A.kurvenAnteile([E("2026-01-01"), E("2026-01-08"), E("2026-01-15")]);
  pruefe("gleiche Abstaende bleiben gleiche Abstaende",
    nah(a[0], 0) && nah(a[1], 0.5) && nah(a[2], 1));
}
/* Die Pause aus dem Persona-Durchgang: acht Wochen zwischen zwei Trainings. */
{
  const a = A.kurvenAnteile([E("2026-05-01"), E("2026-05-02"), E("2026-06-27")]);
  pruefe("acht Wochen Pause sind acht Wochen breit", nah(a[1], 1 / 57));
}
/* Zusage 3: der ehrliche Rueckfall. */
pruefe("ohne brauchbares Datum gleiche Abstaende",
  JSON.stringify(A.kurvenAnteile([E("a"), E("b"), E("c")])) === "[0,0.5,1]");
pruefe("ein einziges kaputtes Datum genuegt fuer den Rueckfall",
  JSON.stringify(A.kurvenAnteile([E("2026-01-01"), E(""), E("2026-03-01")])) === "[0,0.5,1]");
pruefe("fehlende Eintraege werfen nicht",
  JSON.stringify(A.kurvenAnteile([E("2026-01-01"), null, E("2026-03-01")])) === "[0,0.5,1]");
pruefe("alles am selben Tag ergibt gleiche Abstaende",
  JSON.stringify(A.kurvenAnteile([E("2026-01-01"), E("2026-01-01")])) === "[0,1]");
pruefe("ein Datum in falscher Form faellt zurueck",
  JSON.stringify(A.kurvenAnteile([E("1.1.2026"), E("2.1.2026")])) === "[0,1]");
/* Unsortierte Eingabe darf die Achse nicht sprengen: Anteile bleiben in 0..1. */
{
  const a = A.kurvenAnteile([E("2026-03-01"), E("2026-01-01"), E("2026-02-01")]);
  pruefe("auch unsortiert bleibt alles zwischen 0 und 1",
    a.every(v => v >= 0 && v <= 1) && nah(Math.min.apply(null, a), 0) && nah(Math.max.apply(null, a), 1));
}

/* ---------- 2) kurvenX ---------- */
{
  const x = A.kurvenX([E("2026-01-01"), E("2026-01-31")], 560, 34);
  pruefe("der erste Punkt sitzt am linken Rand", nah(x(0), 34));
  pruefe("der letzte am rechten", nah(x(1), 560 - 34));
}
{
  const x = A.kurvenX([E("2026-01-01")], 560, 34);
  pruefe("ein einzelner Punkt sitzt mittig", nah(x(0), 280));
}

/* ---------- 3) Die Kurven benutzen sie wirklich ---------- */
/* Zusage 1 am fertigen Bild: Dieselben drei Gewichte, einmal gleichmaessig und
   einmal mit einer Luecke — die mittleren Punkte muessen woanders sitzen. */
function cxWerte(svg){
  return (svg.match(/<circle cx="([\d.]+)"/g) || []).map(s => parseFloat(/cx="([\d.]+)"/.exec(s)[1]));
}
{
  const gleich = A.gewichtKurveHtml([
    { datum:"2026-01-01", kg:80 }, { datum:"2026-01-15", kg:79 }, { datum:"2026-01-29", kg:78 }]);
  const luecke = A.gewichtKurveHtml([
    { datum:"2026-01-01", kg:80 }, { datum:"2026-01-03", kg:79 }, { datum:"2026-01-29", kg:78 }]);
  const a = cxWerte(gleich), b = cxWerte(luecke);
  pruefe("die Gewichtskurve zeichnet drei Punkte", a.length === 3 && b.length === 3);
  pruefe("erster und letzter Punkt sitzen in beiden Faellen gleich",
    nah(a[0], b[0]) && nah(a[2], b[2]));
  pruefe("der mittlere wandert mit dem Datum", b[1] < a[1] - 100);
}
{
  const gleich = A.bmiKurveHtml([
    { datum:"2026-01-01", bmi:24 }, { datum:"2026-01-15", bmi:24.5 }, { datum:"2026-01-29", bmi:25 }]);
  const luecke = A.bmiKurveHtml([
    { datum:"2026-01-01", bmi:24 }, { datum:"2026-01-03", bmi:24.5 }, { datum:"2026-01-29", bmi:25 }]);
  pruefe("die BMI-Kurve rechnet genauso", cxWerte(luecke)[1] < cxWerte(gleich)[1] - 100);
}
/* Zusage 2: EINE Stelle. Keine der drei Kurven rechnet die x-Achse selbst. */
["gewichtKurveHtml", "bmiKurveHtml", "fortschrittZeichnen"].forEach(fn => {
  const q = grabFn(fn);
  pruefe(fn + " holt seine x-Achse aus kurvenX", /const x = kurvenX\(/.test(q));
  pruefe(fn + " rechnet sie nicht mehr selbst aus dem Index",
    !/x = i =>.*rand \+ i \*/.test(q));
});
/* Die BALKEN bleiben unberuehrt — sie haben ihre Achse schon lueckenlos. */
["volumenZeichnen", "ausdauerZeichnen"].forEach(fn => {
  pruefe(fn + " bleibt ein Balken-Diagramm ohne kurvenX", !/kurvenX|kurvenAnteile/.test(grabFn(fn)));
});

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v210",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 210);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.210", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
