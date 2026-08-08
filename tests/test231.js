/* 0.231.0-Test: Kalibrierung — Kennenlernen, Scan nach Pause, Melze, Korridor.
   (65. Runde, Nutzer-Konzept.)

   Die Zusagen:
   1. DREI PHASEN. Kennenlernen (erste 10 Trainings), Scan (8 Trainings nach
      einer Pause von >= 12 Wochen), sonst kalibriert.
   2. DIE APP SCHAUT, STELLT ABER NICHT UM. Der Vorschlag kommt nur in einer
      Kalibrierungs-Phase, nur mit genug Noten, und geaendert wird auf Ja.
   3. PAUSEN SCHMELZEN DIE ERFAHRUNG. Nach 12 Wochen 0,005/Woche, Deckel 0,3,
      nie unter den Profil-Startwert — und die gezaehlten Wochen bleiben.
   4. DER KORRIDOR. Mindestmass (~40 % des Richtwerts) bis Verletzungsrisiko
      (130 %) — dieselbe Grenze wie die tiefrote Warnung.
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
function grabZeile(name){
  const m = new RegExp("const " + name + "\\s*=").exec(src);
  if(!m) throw new Error("Konstante nicht gefunden: " + name);
  return src.slice(m.index, src.indexOf("\n", m.index));
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("tagDifferenz"), grabFn("wocheSeitEpoche"),
  grabZeile("KENNENLERN_TRAININGS"), grabZeile("SCAN_TRAININGS"), grabZeile("SCAN_PAUSE_TAGE"),
  grabFn("aktiveTrainingsWochen"), grabFn("erfahrungAusVerlauf"),
  grabFn("tageSeitLetztemTraining"), grabFn("erfahrungsMelze"), grabFn("erfahrungsFaktor"),
  grabFn("kalibrierungsPhase"), grabFn("kalibrierungsVorschlag"), grabFn("volumenKorridor"),
  "module.exports = { tageSeitLetztemTraining, erfahrungsMelze, erfahrungsFaktor, " +
  "kalibrierungsPhase, kalibrierungsVorschlag, volumenKorridor };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const tag = (jahr, monat, t) => new Date(Date.UTC(jahr, monat - 1, t)).toISOString().slice(0, 10);

/* ---------- 1) Die Phasen ---------- */
const HEUTE = "2026-08-10";
const trainings = n => Array.from({ length: n }, (x, i) => ({ datum: tag(2026, 1, 1 + i * 3) }));
pruefe("ein leeres Konto lernt kennen (Training 0 von 10)", (() => {
  const p = A.kalibrierungsPhase([], HEUTE);
  return p.phase === "kennenlernen" && p.nummer === 0 && p.von === 10;
})());
pruefe("nach fuenf Trainings weiter kennenlernen", A.kalibrierungsPhase(trainings(5), HEUTE).phase === "kennenlernen");
pruefe("zwei Eintraege am selben Tag sind EIN Training", (() => {
  const doppelt = [{ datum:"2026-01-01" }, { datum:"2026-01-01" }];
  return A.kalibrierungsPhase(doppelt, HEUTE).nummer === 1;
})());
pruefe("ab zehn Trainings ist kalibriert", A.kalibrierungsPhase(trainings(12), HEUTE).phase === "kalibriert");
/* Die Pause: 12 Trainings, dann >= 12 Wochen Luecke, dann wieder anfangen. */
const mitPause = trainings(12).concat([{ datum:"2026-06-01" }, { datum:"2026-06-03" }]);
pruefe("nach einer langen Pause beginnt der Scan", (() => {
  const p = A.kalibrierungsPhase(mitPause, HEUTE);
  return p.phase === "scan" && p.nummer === 2 && p.von === 8;
})());
pruefe("acht Trainings nach der Pause ist er vorbei", (() => {
  const fertig = trainings(12).concat(Array.from({ length: 8 }, (x, i) => ({ datum: tag(2026, 6, 1 + i * 2) })));
  return A.kalibrierungsPhase(fertig, HEUTE).phase === "kalibriert";
})());
pruefe("eine kurze Pause loest keinen Scan aus", (() => {
  const kurz = trainings(12).concat([{ datum: tag(2026, 3, 1) }]);   // ~4 Wochen nach dem letzten
  return A.kalibrierungsPhase(kurz, HEUTE).phase === "kalibriert";
})());

/* ---------- 2) Der Vorschlag ---------- */
const mitNoten = (n, note) => Array.from({ length: n }, (x, i) => ({
  datum: tag(2026, 2, 1 + i * 2), saetze: [{ note }, { note }] }));
pruefe("durchweg zu leicht schlaegt eine Stufe hoch vor", (() => {
  const v = A.kalibrierungsVorschlag(mitNoten(5, 2), { erfahrung:"anfaenger" }, HEUTE);
  return v && v.richtung === "hoch" && v.neu === "wieder";
})());
pruefe("vom Wiedereinsteiger geht es zum Fortgeschrittenen", (() => {
  const v = A.kalibrierungsVorschlag(mitNoten(5, 1), { erfahrung:"wieder" }, HEUTE);
  return v && v.neu === "fortgeschritten";
})());
pruefe("ueber dem Fortgeschrittenen gibt es nichts", A.kalibrierungsVorschlag(mitNoten(5, 1), { erfahrung:"fortgeschritten" }, HEUTE) === null);
pruefe("durchweg sehr schwer schlaegt eine Stufe runter vor", (() => {
  const v = A.kalibrierungsVorschlag(mitNoten(5, 5), { erfahrung:"fortgeschritten" }, HEUTE);
  return v && v.richtung === "runter" && v.neu === "wieder";
})());
pruefe("passende Noten schlagen nichts vor", A.kalibrierungsVorschlag(mitNoten(5, 3), { erfahrung:"wieder" }, HEUTE) === null);
pruefe("unter drei bewerteten Trainings kein Vorschlag", A.kalibrierungsVorschlag(mitNoten(2, 1), { erfahrung:"anfaenger" }, HEUTE) === null);
pruefe("ausserhalb einer Kalibrierungs-Phase kein Vorschlag", (() => {
  const viele = mitNoten(12, 1);   // 12 bewertete Trainings -> kalibriert
  return A.kalibrierungsVorschlag(viele, { erfahrung:"anfaenger" }, HEUTE) === null;
})());

/* ---------- 3) Die Melze ---------- */
pruefe("zwoelf Wochen Pause schmelzen nichts", A.erfahrungsMelze(12) === 0 && A.erfahrungsMelze(4) === 0);
pruefe("danach 0,005 je Woche", A.erfahrungsMelze(22) === 0.05);
pruefe("gedeckelt bei 0,3", A.erfahrungsMelze(200) === 0.3);
pruefe("Tage seit dem letzten Training", A.tageSeitLetztemTraining([{ datum:"2026-08-01" }], HEUTE) === 9);
pruefe("ohne Protokoll null", A.tageSeitLetztemTraining([], HEUTE) === null);
/* Der Faktor: 60 aktive Wochen aufgebaut, dann ein Jahr Pause. */
const historie = [];
for(let w = 0; w < 60; w++){
  const basis = new Date(Date.UTC(2023, 0, 2 + w * 7));
  [0, 2].forEach(t => historie.push({ datum: new Date(basis.getTime() + t * 86400000).toISOString().slice(0, 10) }));
}
const ohnePause = A.erfahrungsFaktor({ erfahrung:"anfaenger" }, historie);
const mitLanger = A.erfahrungsFaktor({ erfahrung:"anfaenger" }, historie, "2026-08-10");   // letztes Training Anfang 2024
pruefe("ohne heute-Angabe keine Melze (alte Aufrufe)", ohnePause > 1.0);
pruefe("die lange Pause schmilzt den Faktor", mitLanger < ohnePause);
pruefe("aber nie unter den Startwert", mitLanger >= 0.6);
pruefe("und nie unter die deklarierte Stufe",
  A.erfahrungsFaktor({ erfahrung:"fortgeschritten" }, historie, "2026-08-10") >= 1.0);

/* ---------- 4) Der Korridor ---------- */
const kor = A.volumenKorridor(20);
pruefe("das Mindestmass sind ~40 Prozent", kor.mindest === 8);
pruefe("die Stopp-Grenze ist 130 Prozent", kor.stopp === 26);
pruefe("dieselbe Grenze wie die tiefrote Warnung", src.includes("quote >= 1.3"));
pruefe("kleine Kapazitaeten haben ein Mindestmass von 2", A.volumenKorridor(4).mindest === 2);
pruefe("ohne Kapazitaet kein Korridor", A.volumenKorridor(0) === null && A.volumenKorridor(null) === null);

/* ---------- 5) Verdrahtung ---------- */
pruefe("die Ergebnis-Seite traegt die Phasen-Karte",
  grabFn("bewertungAnwenden").includes("kalibrierungsKarteHtml()"));
pruefe("die Abschluss-Seite ebenso", grabFn("abschlussZeigen").includes("kalibrierungsKarteHtml()"));
pruefe("nach dem Training wird der Vorschlag angeboten",
  grabFn("bewertungAnwenden").includes("setTimeout(kalibrierungAnbieten, 900)"));
const anbieten = grabFn("kalibrierungAnbieten");
pruefe("hoechstens einmal am Tag", anbieten.includes("kalibrierungGefragt === heute"));
pruefe("geaendert wird nur auf Ja", anbieten.includes("if(!ja) return"));
pruefe("und dann wirklich das Profil", anbieten.includes("einrichtung.erfahrung = v.neu"));
pruefe("alles Abgeleitete zieht mit", anbieten.includes("fortschrittNeuZeichnen()"));
pruefe("die Detail-Karte zeigt den Korridor",
  grabFn("muskelAuswahlZeichnen").includes("korridorZeileHtml(a)"));
pruefe("der Korridor nennt das Verletzungsrisiko",
  grabFn("korridorZeileHtml").includes("Verletzungsrisiko"));
pruefe("die Melze haengt an der Kapazitaets-Rechnung",
  grabFn("kapazitaetsFaktor").includes("erfahrungsFaktor(einrichtung, protokoll, heute)"));
pruefe("und an der Erholung je Muskel",
  grabFn("muskelAuslastung").includes("erfahrungsFaktor(einrichtung, protokoll, heute)"));

/* ---------- 6) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("APP_VERSION passt zu VERSION", (() => {
  const [, mi, pa] = /const VERSION = "([\d.]+)";/.exec(src)[1].split(".");
  return Number(/const APP_VERSION = (\d+);/.exec(src)[1]) === Number(mi) * 1000 + Number(pa);
})());
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.231.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
