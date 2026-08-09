/* 0.232.0-Test: Kurz-Check je Muskel, automatische Kalibrierung, feine Wertung.
   (66. Runde, Nutzer-Entscheidungen.)

   Die Zusagen:
   1. DER KURZ-CHECK. Nach dem Training fragt eine Karte je trainiertem Muskel
      (hoechstens sechs, haeufigste zuerst, mit Figur), wie er sich anfuehlt —
      die Antworten schreiben in die Beschwerden von 0.228, kein zweiter Weg.
   2. AUTOMATISCH STATT FRAGEN. Die Profil-Umstufung passiert selbst, wird aber
      offen angesagt (automatisch heisst nicht heimlich).
   3. DIE FEINE WERTUNG. Noten-Drift stufenlos (±0,05), Fitness-Zahl 0-100 als
      Anzeige, die groben Stufen sind nur noch die Oberflaeche.
   4. DER LADE-BILDSCHIRM beim Auto-Update.
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

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("echteSaetze"),
  "const UM = { Kniebeugen:{ muskeln:['quadriceps','glutes'] }, Rudern:{ muskeln:['latissimus'] } };",
  "function uebungMuskeln(name){ return UM[name] || null; }",
  grabFn("notenSchnitt"), grabFn("notenDrift"), grabFn("fitnessZahl"), grabFn("stufeAusFaktor"),
  grabFn("trainierteMuskelnAusEintrag"),
  "module.exports = { notenSchnitt, notenDrift, fitnessZahl, stufeAusFaktor, trainierteMuskelnAusEintrag };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die feine Wertung ---------- */
const trainings = (n, note) => Array.from({ length: n }, (x, i) => ({
  datum:"2026-08-0" + (1 + i), saetze:[{ note }] }));
pruefe("unter drei bewerteten Trainings keine Drift", A.notenDrift(trainings(2, 1)) === 0);
pruefe("passende Noten sind neutral", A.notenDrift(trainings(5, 3)) === 0);
pruefe("leichte Trainings driften nach oben", A.notenDrift(trainings(5, 2)) === 0.025);
pruefe("schwere nach unten", A.notenDrift(trainings(5, 4)) === -0.025);
pruefe("gedeckelt bei plus/minus 0,05",
  A.notenDrift(trainings(5, 1)) === 0.05 && A.notenDrift(trainings(5, 5)) === -0.05);
/* Die Drift ist STUFENLOS — zwischen den Werten liegt etwas. */
pruefe("die Drift kennt Zwischenstufen", (() => {
  const gemischt = trainings(3, 2).concat(trainings(2, 3));   // Schnitt 2,4
  const d = A.notenDrift(gemischt);
  return d > 0 && d < 0.025;
})());
pruefe("die Fitness-Zahl bildet 0,6 bis 1,1 auf 0 bis 100 ab",
  A.fitnessZahl(0.6) === 0 && A.fitnessZahl(0.85) === 50 && A.fitnessZahl(1.1) === 100);
pruefe("und wird geklemmt", A.fitnessZahl(0.4) === 0 && A.fitnessZahl(2) === 100);
pruefe("die groben Stufen sind eine Ableitung",
  A.stufeAusFaktor(0.7) === "anfaenger" && A.stufeAusFaktor(0.85) === "wieder" &&
  A.stufeAusFaktor(1.0) === "fortgeschritten");

/* ---------- 2) Der Kurz-Check ---------- */
const eintrag = { saetze: [
  { name:"Kniebeugen", wdh:10 }, { name:"Kniebeugen", wdh:10 }, { name:"Kniebeugen", wdh:10 },
  { name:"Rudern", wdh:10 }
]};
const muskeln = A.trainierteMuskelnAusEintrag(eintrag);
pruefe("die trainierten Muskeln kommen aus den Saetzen",
  muskeln.includes("quadriceps") && muskeln.includes("latissimus"));
pruefe("haeufigste zuerst", muskeln[0] === "quadriceps" || muskeln[0] === "glutes");
pruefe("Soll-Saetze zaehlen nicht", A.trainierteMuskelnAusEintrag({
  saetze:[{ name:"Kniebeugen", soll:true }] }).length === 0);
pruefe("unbekannte Uebungen stoeren nicht", A.trainierteMuskelnAusEintrag({
  saetze:[{ name:"Unbekannt" }] }).length === 0);
pruefe("hoechstens sechs Muskeln", (() => {
  const gross = { saetze: [] };
  for(let i = 0; i < 30; i++) gross.saetze.push({ name:"Kniebeugen" }, { name:"Rudern" });
  return A.trainierteMuskelnAusEintrag(gross).length <= 6;
})());

/* ---------- 3) Verdrahtung: Muskel-Check ----------
   0.242: Der Kurz-Check-Kartenblock ist zum WIZARD geworden (view-muskelcheck)
   — dieselben Zusagen, neuer Ort. */
const karte = grabFn("muskelCheckSchritt");
pruefe("die Karte fragt mit der Muskel-Figur", karte.includes("miniFigurHtml("));
pruefe("fuenf Antworten je Muskel (aus dem Register)",
  /const MCHECK_ANTWORTEN = \[/.test(src) &&
  src.includes('{ text:"Alles gut" }') && src.includes('"Schmerzt stark"'));
pruefe("nur auf erlaubten Stufen (Leitplanke 8)",
  grabFn("muskelCheckMuskeln").includes('viewErlaubt("view-tagescheck")'));
const antwort = grabFn("muskelCheckAntwort");
pruefe("die Antwort schreibt in die Beschwerden", antwort.includes("beschwerdeSetzen(d.beschwerden, heute, m, a.art, a.wert)"));
pruefe("Alles gut loescht beide Arten des Tages",
  antwort.includes('"kater", 0') && antwort.includes('"schmerz", 0'));
pruefe("die Antwort rechnet sofort durch", antwort.includes("fortschrittNeuZeichnen()"));
pruefe("beide Trainings-Enden tragen den Muskel-Check",
  grabFn("bewertungOeffnen").includes("muskelCheckOeffnen(") &&
  grabFn("trainingAbschliessen").includes("muskelCheckOeffnen("));

/* ---------- 4) Verdrahtung: feine Wertung und Auto-Kalibrierung ---------- */
pruefe("die Drift steckt im Erfahrungs-Faktor",
  grabFn("erfahrungsFaktor").includes("notenDrift(protokoll)"));
/* 0.234: Rechenwerte gehoeren nicht auf den Schirm — der Stand steht in WORTEN
   da (fitnessWort), die Zahl selbst bleibt eine interne Groesse. */
pruefe("die Grundlagen-Zeile zeigt den Stand in Worten",
  grabFn("rechnungsGrundlage").includes("fitnessWort(") &&
  grabFn("grundlageText").includes('"Stand: " + g.stand'));
pruefe("die Kalibrierung fragt nicht mehr", !src.includes("function kalibrierungAnbieten("));
pruefe("sie wendet an und sagt es an", (() => {
  const a = grabFn("kalibrierungAnwenden");
  return a.includes("einrichtung.erfahrung = v.neu") && a.includes("meldung(") && !a.includes("frage(");
})());

/* ---------- 5) Der Lade-Bildschirm (0.233: Balken, Prozent, von → zu) ---------- */
const update = grabFn("updateAnwenden");
const deckel = grabFn("updateDeckel");
pruefe("beim Update erscheint der Deckel VOR dem Neuladen",
  update.indexOf("updateDeckel(VERSION, ziel)") < update.indexOf("location.reload()"));
pruefe("er traegt Balken und Prozent",
  deckel.includes('id="update-balken"') && deckel.includes('id="update-prozent"'));
pruefe("und die Zeile von nach zu", deckel.includes('" → " + text(zu)'));
pruefe("er beruhigt wegen der Daten", deckel.includes("deine Daten bleiben unberührt"));
/* Die neue Fassung nimmt ihn nach dem Neuladen sofort wieder auf. */
pruefe("die neue Fassung setzt den Deckel fort",
  src.includes("function updateDeckelFortsetzen()") && src.includes('sessionStorage.getItem("trainer.updateVon")'));
pruefe("mit einem Sicherheitsnetz gegen Kleben", /setTimeout\(fertig, 4000\)/.test(src));
pruefe("das Ziel wird beim Pruefen gemerkt",
  grabFn("updatePruefen").includes('sessionStorage.setItem("trainer.updateZiel"'));

/* ---------- 6) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("APP_VERSION passt zu VERSION", (() => {
  const [, mi, pa] = /const VERSION = "([\d.]+)";/.exec(src)[1].split(".");
  return Number(/const APP_VERSION = (\d+);/.exec(src)[1]) === Number(mi) * 1000 + Number(pa);
})());
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.232.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
