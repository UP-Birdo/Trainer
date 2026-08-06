/* v213-Test: Volleyball als Sportart + die Trainings-Kachel als Tages-Diagramm.
   (56. Runde — GitHub-Wunsch #2 und zwei Punkte aus der Ideen-Box.)

   Die drei Zusagen:
   1. VOLLEYBALL IST EINE VOLLE SPORTART. Nicht nur ein Eintrag in SPORTARTEN,
      sondern auch Drills, Kurz-Tipps, Beschreibungen und Muskeln — sonst waere
      sie in Bibliothek, Assistent und Muskelkarte eine halbe Sportart.
      (Die Vollstaendigkeit ueber ALLE Sportarten pruefen test145 und test151;
      hier steht, was Volleyball selbst betrifft.)
   2. DIE KACHEL ZEIGT TAGE, KEINE EINTRAEGE. `trainingsProTag` liefert das
      lueckenlose Fenster, `trainingsDiagrammHtml` die Balken.
   3. LUECKENLOS HEISST LUECKENLOS. Ein Tag ohne Training ist eine 0 im
      Diagramm, kein fehlender Balken — sonst luegt der Abstand (v210-Linie).
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
function grabZahl(name){
  const t = new RegExp("^const " + name + " = [^;\\n]*;", "m").exec(src);
  if(!t) throw new Error("Konstante nicht gefunden: " + name);
  return t[0];
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabBlock("SPORTARTEN", "[", "]"),
  grabBlock("SPORT_UEBUNGEN", "{", "}"),
  grabBlock("SPORT_INFO", "{", "}"),
  grabBlock("SPORT_TEXT", "{", "}"),
  grabBlock("SPORT_MUSKELN", "{", "}"),
  grabBlock("SPORT_LAST_MUSKELN", "{", "}"),
  grabZahl("TRAININGS_FENSTER_TAGE"),
  grabFn("tageVerschieben"),
  grabFn("trainingsProTag"),
  grabFn("trainingsDiagrammHtml"),
  "module.exports = { SPORTARTEN, SPORT_UEBUNGEN, SPORT_INFO, SPORT_TEXT, SPORT_MUSKELN," +
  " SPORT_LAST_MUSKELN, TRAININGS_FENSTER_TAGE, trainingsProTag, trainingsDiagrammHtml };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Volleyball ist eine volle Sportart ---------- */
const vb = A.SPORTARTEN.find(s => s.id === "volleyball");
pruefe("Volleyball steht in SPORTARTEN", !!vb);
pruefe("es ist eine Aktivitaet mit Spiel-Fortschritt",
  vb.planTyp === "aktivitaet" && vb.fortschritt === "spiel");
/* Ein Ballspiel auf festem Feld hat weder Strecke noch Messgroesse — stuende
   eines davon da, fragte der Assistent nach Kilometern im Hallenfeld. */
pruefe("ohne Strecke und ohne Messgroesse", !vb.strecke && !vb.mass);
pruefe("es gibt eine eigene Farbe",
  /^#[0-9A-Fa-f]{6}$/.test(vb.farbe) &&
  A.SPORTARTEN.filter(s => s.farbe === vb.farbe).length === 1);

const drills = A.SPORT_UEBUNGEN.volleyball || [];
pruefe("Volleyball hat mindestens sechs Drills (ist: " + drills.length + ")", drills.length >= 6);
pruefe("darunter Technik UND Kondition",
  drills.some(d => d.art === "technik") && drills.some(d => d.art === "kondition"));
const ohneTipp = drills.filter(d => !A.SPORT_INFO[d.name]).map(d => d.name);
pruefe("jeder Drill hat einen Kurz-Tipp" + (ohneTipp.length ? " (" + ohneTipp.join(", ") + ")" : ""),
  ohneTipp.length === 0);
const ohneText = drills.filter(d => !A.SPORT_TEXT[d.name]).map(d => d.name);
pruefe("jeder Drill hat eine Beschreibung" + (ohneText.length ? " (" + ohneText.join(", ") + ")" : ""),
  ohneText.length === 0);
const ohneFehlerteil = drills.filter(d => !/Häufigster Fehler:/.test(A.SPORT_TEXT[d.name] || "")).map(d => d.name);
pruefe("jede Beschreibung nennt den haeufigsten Fehler" +
  (ohneFehlerteil.length ? " (" + ohneFehlerteil.join(", ") + ")" : ""), ohneFehlerteil.length === 0);
const ohneMuskeln = drills.filter(d => !A.SPORT_MUSKELN[d.name]).map(d => d.name);
pruefe("jeder Drill ist Muskeln zugeordnet" + (ohneMuskeln.length ? " (" + ohneMuskeln.join(", ") + ")" : ""),
  ohneMuskeln.length === 0);

/* Die Einheit selbst (ohne Drills) muss auch in die Muskelkarte gehen — das ist
   die v197-Rechnung, sonst waere ein Volleyball-Abend fuer die Auslastung Luft. */
const last = A.SPORT_LAST_MUSKELN.volleyball;
pruefe("die Einheit selbst traegt Muskeln (v197-Rechnung)",
  !!last && last.p.length > 0 && last.s.length > 0);
pruefe("Haupt- und Nebenmuskeln ueberschneiden sich nicht",
  last.p.every(m => last.s.indexOf(m) < 0));
pruefe("die Beine sind dabei (Sprungspiel)", last.p.indexOf("quadriceps") >= 0);

/* ---------- 2) Die Trainings-Kachel zeigt Tage ---------- */
pruefe("das Fenster sind 14 Tage", A.TRAININGS_FENSTER_TAGE === 14);

const heute = "2026-08-14";
const protokoll = [
  { datum:"2026-08-14" }, { datum:"2026-08-14" },   // zwei Einheiten an einem Tag
  { datum:"2026-08-12" },
  { datum:"2026-08-01" },                            // liegt VOR dem Fenster
  { datum:null }                                     // kaputter Eintrag
];
const punkte = A.trainingsProTag(protokoll, heute);
pruefe("das Fenster hat genau 14 Punkte", punkte.length === 14);
pruefe("der letzte Punkt ist heute", punkte[punkte.length - 1].datum === heute);
pruefe("der erste Punkt liegt 13 Tage zurueck", punkte[0].datum === "2026-08-01");
pruefe("mehrere Einheiten an einem Tag werden gezaehlt",
  punkte[punkte.length - 1].anzahl === 2);
pruefe("ein Trainingstag im Fenster zaehlt einfach",
  punkte.find(p => p.datum === "2026-08-12").anzahl === 1);
pruefe("Tage ohne Training sind 0, nicht weg",
  punkte.filter(p => p.anzahl === 0).length === 11);
pruefe("Eintraege ohne Datum stuerzen nicht ab",
  punkte.reduce((a, p) => a + p.anzahl, 0) === 4);
pruefe("das Label ist die Tageszahl", punkte[punkte.length - 1].label === "14");
pruefe("ohne Protokoll bleibt das Fenster leer, aber vollstaendig",
  A.trainingsProTag([], heute).length === 14 &&
  A.trainingsProTag(null, heute).every(p => p.anzahl === 0));

/* ---------- 3) Das Diagramm ---------- */
const svg = A.trainingsDiagrammHtml(punkte);
pruefe("es ist ein SVG mit Beschriftung fuer Vorleseprogramme",
  svg.startsWith("<svg") && svg.includes('role="img"') && svg.includes("aria-label="));
pruefe("je Tag ein Balken", (svg.match(/<rect /g) || []).length === 14);
/* Der heutige Balken ist hervorgehoben — dieselbe Farbrolle wie im Volumen. */
pruefe("heute ist die Signalfarbe", svg.includes('fill="var(--signal)"'));
pruefe("die uebrigen Tage sind ruhig", svg.includes('fill="var(--rest)"'));
pruefe("ein leerer Tag bekommt keine Zahl ueber den Balken",
  (svg.match(/font-size="10"/g) || []).length === 3);
pruefe("ein Balken ist nie ganz weg (Mindesthoehe)", !/height="0/.test(svg));

/* ---------- 4) Die Kachel und der Weg zu den Eintraegen ---------- */
const zeichnen = grabFn("protokollZeichnen");
pruefe("die Kachel zeichnet das Diagramm", zeichnen.includes("trainingsDiagrammHtml("));
pruefe("und listet die Eintraege nicht mehr auf", !zeichnen.includes("protokollEintragHtml"));
pruefe("die Gesamtzahl bleibt als Weg in den Verlauf", zeichnen.includes("Trainings insgesamt"));
pruefe("die Eintraege stehen im Verlauf, den die Kachel oeffnet",
  grabFn("verlaufListeZeichnen").includes("protokollEintragHtml") &&
  /id="stat-trainings"[^>]*onclick="verlaufOeffnen\(\)"/.test(src));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v213",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 213);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.213", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
