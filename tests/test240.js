/* 0.240.0-Test: abklingende Last + persoenliche Erholung (Nutzer-Direktive).

   Die Zusagen:
   1. KEINE HARTE KANTE: `lastGewicht` ist voll in den juengsten (8−E) Tagen,
      klingt dann linear ueber 2·E Tage aus — Gesamtflaeche konstant 8 fuer
      jedes E (die Kapazitaets-Eichung des alten 8-Tage-Fensters bleibt).
   2. VARIABEL: langsamere Erholung → laengeres Gedaechtnis (Training vor
      9 Tagen zaehlt noch, wenn E gross ist; bei kleinem E nicht mehr).
   3. PERSOENLICH: `erholungPersoenlich` verschiebt die Basis aus eigenen
      Daten — traege Episoden (+1 ab 3, +2 ab 6; EIN Trainings-Anker = eine
      Episode), fruehe vertragene Wiederholungen (−1 ab 6), Fenster 180 Tage,
      nie unter 1 Tag.
   4. VERDRAHTUNG: muskelAuslastung rechnet die Last abklingend, `erholt`
      nutzt die persoenliche Erholung, die Detail-Karte nennt die Abweichung.
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
function grabZahl(name){
  const t = new RegExp("^const " + name + " = [^;\\n]*;", "m").exec(src);
  if(!t) throw new Error("Konstante nicht gefunden: " + name);
  return t[0];
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabZahl("ERHOLUNG_TAGE"),
  grabZahl("LAST_MAX_TAGE"), grabZahl("ERHOLUNG_LERN_FENSTER"),
  grabZahl("ERHOLUNG_LERN_MIN"), grabZahl("ERHOLUNG_FRUEH_MIN"),
  grabFn("tagDifferenz"),
  grabFn("lastGewicht"), grabFn("erholungPersoenlich"), grabFn("erholungText"),
  "module.exports = { lastGewicht, erholungPersoenlich, erholungText };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) lastGewicht: Form und Flaeche ---------- */
pruefe("juengste Tage wiegen voll", T.lastGewicht(0, 2) === 1 && T.lastGewicht(5, 2) === 1);
pruefe("danach klingt es aus", T.lastGewicht(6, 2) < 1 && T.lastGewicht(6, 2) > T.lastGewicht(8, 2));
pruefe("negative Tage wiegen nichts", T.lastGewicht(-1, 2) === 0);
{
  // Flaeche = 8 fuer jedes E — die Eichung des alten Fensters bleibt.
  [1, 2, 3, 4, 6].forEach(e => {
    let summe = 0;
    for(let d = 0; d <= 30; d++) summe += T.lastGewicht(d, e);
    pruefe("Flaeche 8 bei Erholung " + e, Math.abs(summe - 8) < 0.02);
  });
}
pruefe("langsame Erholung erinnert Tag 9, schnelle nicht",
  T.lastGewicht(9, 4) > 0 && T.lastGewicht(9, 1) === 0);
pruefe("weiter als 13 Tage reicht nichts", T.lastGewicht(14, 6) === 0);

/* ---------- 2) erholungPersoenlich ---------- */
const schmerz = (datum) => ({ datum, muskel:"quadriceps", art:"schmerz", wert:1 });
const HEUTE = "2026-08-09";
/* Drei Episoden: Training, Beschwerde erst am Tag der Basis-Erholung (d = 3). */
{
  const tage = ["2026-07-01", "2026-07-10", "2026-07-20"];
  const besch = ["2026-07-04", "2026-07-13", "2026-07-23"].map(schmerz);
  pruefe("drei traege Episoden geben einen Tag mehr",
    T.erholungPersoenlich(tage, besch, "quadriceps", HEUTE, 3) === 4);
  pruefe("unter der Mindestzahl bleibt die Basis",
    T.erholungPersoenlich(tage.slice(0, 2), besch.slice(0, 2), "quadriceps", HEUTE, 3) === 3);
  pruefe("fremder Muskel lernt daraus nichts",
    T.erholungPersoenlich(tage, besch, "pectoral", HEUTE, 3) === 3);
}
/* Mehrere Meldungen NACH DEMSELBEN Training sind EINE Episode. */
pruefe("ein Trainings-Anker zaehlt einmal",
  T.erholungPersoenlich(["2026-07-01"],
    [schmerz("2026-07-04"), schmerz("2026-07-05"), schmerz("2026-07-06")],
    "quadriceps", HEUTE, 3) === 3);
/* Sechs Episoden -> +2 (Deckel). */
{
  const tage = [], besch = [];
  for(let m = 0; m < 6; m++){
    const t = "2026-0" + (m < 3 ? 6 : 7) + "-" + String(1 + (m % 3) * 10).padStart(2, "0");
    tage.push(t);
    besch.push(schmerz(t.slice(0, 8) + String(Number(t.slice(8)) + 3).padStart(2, "0")));
  }
  pruefe("sechs traege Episoden geben zwei Tage mehr (Deckel)",
    T.erholungPersoenlich(tage.sort(), besch, "quadriceps", HEUTE, 3) === 5);
}
/* Fruehe vertragene Wiederholungen -> ein Tag weniger, nie unter 1. */
{
  const tage = [];
  for(let k = 0; k < 8; k++)
    tage.push("2026-07-" + String(2 + k * 2).padStart(2, "0"));   // alle 2 Tage bei Basis 3
  pruefe("vertragene fruehe Wiederholungen machen schneller",
    T.erholungPersoenlich(tage, [], "quadriceps", HEUTE, 3) === 2);
  pruefe("nie unter einen Tag",
    T.erholungPersoenlich(tage, [], "quadriceps", HEUTE, 1) === 1);
  pruefe("mit Beschwerden danach zaehlt die fruehe Wiederholung nicht",
    T.erholungPersoenlich(tage, tage.map(t => schmerz(t)), "quadriceps", HEUTE, 3) === 3);
}
/* Fenster: uralte Episoden lernen nicht mehr mit. */
pruefe("Beobachtungen aelter als 180 Tage zaehlen nicht",
  T.erholungPersoenlich(["2025-06-01", "2025-07-01", "2025-08-01"],
    [schmerz("2025-06-04"), schmerz("2025-07-04"), schmerz("2025-08-04")],
    "quadriceps", HEUTE, 3) === 3);
pruefe("ohne Trainings-Tage bleibt die Basis",
  T.erholungPersoenlich([], [schmerz("2026-08-01")], "quadriceps", HEUTE, 3) === 3);

/* ---------- 3) erholungText ---------- */
pruefe("laenger wird gesagt", T.erholungText(4, 3).includes("länger") && T.erholungText(4, 3).includes("4 statt 3"));
pruefe("schneller wird gesagt", T.erholungText(2, 3).includes("2 statt 3"));
pruefe("ohne Abweichung schweigt der Satz", T.erholungText(3, 3) === "");

/* ---------- 4) Verdrahtung ---------- */
{
  const a = grabFn("muskelAuslastung");
  pruefe("die Auslastung rechnet die Last abklingend",
    a.includes("muskelLastAbklingend(protokoll, heute, erholungFuer)"));
  pruefe("die Erholung wird je Muskel persoenlich gerechnet",
    a.includes("erholungPersoenlich(trainingsTage[m] || [], beschwerden, m, heute"));
  pruefe("erholt nutzt die persoenliche Erholung", a.includes("erholungFuer(m)"));
}
pruefe("die Abkling-Kurve haengt an der Erholung des Muskels",
  grabFn("muskelLastAbklingend").includes("lastGewicht(d, erholungFuer(m))"));
pruefe("die Detail-Karte nennt die gelernte Erholung",
  grabFn("muskelAuswahlZeichnen").includes("erholungText("));
pruefe("die Detail-Liste deckt die volle Reichweite",
  grabFn("muskelTrainingDetail").includes("d > LAST_MAX_TAGE"));
pruefe("Sekundaermuskeln zaehlen in der abklingenden Last weiter halb",
  grabFn("muskelLastAbklingend").includes("SEKUNDAER_ANTEIL"));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.240.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 240000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.240.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
