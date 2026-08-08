/* 0.237.0-Test: Beschwerde-Historie je Uebung/Sportart (62. Runde B).

   Die Zusagen:
   1. AUSZAEHLEN: Zu jeder Beschwerde zaehlt, was in den 48 h davor diesen
      Muskel belastet hat — je Uebung und je Sportart, ein Beschwerde-Tag ist
      EIN Ereignis, je Ereignis zaehlt jede Uebung hoechstens einmal.
   2. SIGNALE: Schmerz ab 1, Kater erst ab 2 — leichter Kater stiftet nichts.
   3. MINDESTZAHL + DECKEL: Muster ab 3 Beobachtungen (−5 %), ab 5 deutlich
      (−10 %, Deckel) — nie darunter, nie ueber 1 (nur senken).
   4. AUSKLINGEN: Beobachtungen aelter als 180 Tage zaehlen nicht.
   5. TRANSPARENZ: Die Detail-Karte nennt das Muster in Worten.
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
  grabBlock("MUSKELKARTEN", "{", "}"),
  "const MUSKELKARTE_AKTIV = 'standard';",
  grabFn("muskelKarteDef"),
  "const MUSKEL_ORDER = muskelKarteDef().order;",
  "const MUSKEL_SEITE = muskelKarteDef().seite;",
  grabBlock("MUSKEL_INFO", "{", "}"), grabBlock("KAT_MUSKELN", "{", "}"),
  grabBlock("UEBUNGEN_DB", "[", "]"), grabBlock("UEBUNG_MUSKELN", "{", "}"),
  grabBlock("SPORT_MUSKELN", "{", "}"),
  grabFn("muskelAufKarte"), grabFn("muskelnAufKarte"), grabFn("uebungMuskelSatz"),
  grabFn("muskelSatzAnzeige"), grabFn("normName"), grabFn("uebungMuskeln"),
  grabZahl("AKTIVITAET_MINUTEN_JE_SATZ"), grabZahl("AKTIVITAET_MAX_SAETZE"),
  grabBlock("SPORT_LAST_MUSKELN", "{", "}"),
  grabFn("istSollEintrag"), grabFn("aktivitaetSaetze"), grabFn("alsEinheitZaehlbar"),
  grabFn("tagDifferenz"),
  grabZahl("MUSTER_VORLAUF_TAGE"), grabZahl("MUSTER_FENSTER_TAGE"),
  grabZahl("MUSTER_MIN"), grabZahl("MUSTER_STARK"),
  grabFn("beschwerdeVorlaeufer"), grabFn("beschwerdeMusterFuer"),
  grabFn("vertraeglichkeitsFaktor"), grabFn("malWort"),
  "module.exports = { beschwerdeVorlaeufer, beschwerdeMusterFuer," +
  " vertraeglichkeitsFaktor, malWort };"
].join("\n"))(modul, modul.exports);
const B = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const HEUTE = "2026-08-08";
const kraft = (datum, name, n) => ({ datum, typ:"kraft",
  saetze: Array.from({ length: n || 1 }, () => ({ name })) });
const schmerz = (datum, muskel) => ({ datum, muskel, art:"schmerz", wert:1 });
const kater = (datum, muskel, wert) => ({ datum, muskel, art:"kater", wert });

/* ---------- 1) Auszaehlen: Training vor der Beschwerde ---------- */
{
  const prot = [kraft("2026-08-01", "Kniebeugen"), kraft("2026-08-04", "Kniebeugen"),
                kraft("2026-08-07", "Kniebeugen")];
  const besch = [schmerz("2026-08-02", "quadriceps"), schmerz("2026-08-05", "quadriceps"),
                 schmerz("2026-08-08", "quadriceps")];
  const v = B.beschwerdeVorlaeufer(prot, besch, HEUTE);
  pruefe("drei Beschwerden nach Kniebeugen ergeben das Muster",
    v.quadriceps && v.quadriceps.uebungen["Kniebeugen"] === 3);
  const muster = B.beschwerdeMusterFuer(v, "quadriceps");
  pruefe("das Muster erreicht die Mindestzahl", muster.length === 1 && muster[0].anzahl === 3);
  pruefe("und senkt die Kapazitaet um 5 %", B.vertraeglichkeitsFaktor(v, "quadriceps") === 0.95);
  pruefe("ein fremder Muskel bleibt unberuehrt", B.vertraeglichkeitsFaktor(v, "pectoral") === 1);
}
/* Je Ereignis zaehlt eine Uebung EINMAL — drei Saetze sind eine Beobachtung. */
{
  const v = B.beschwerdeVorlaeufer([kraft("2026-08-07", "Kniebeugen", 3)],
    [schmerz("2026-08-08", "quadriceps")], HEUTE);
  pruefe("drei Saetze am Vortag sind EINE Beobachtung",
    v.quadriceps.uebungen["Kniebeugen"] === 1);
}
/* Auch doppelte Meldungen am selben Tag sind EIN Ereignis. */
{
  const v = B.beschwerdeVorlaeufer([kraft("2026-08-07", "Kniebeugen")],
    [schmerz("2026-08-08", "quadriceps"), kater("2026-08-08", "quadriceps", 2)], HEUTE);
  pruefe("Schmerz + Kater am selben Tag sind EIN Ereignis",
    v.quadriceps.uebungen["Kniebeugen"] === 1);
}

/* ---------- 2) Signale und Fenster ---------- */
{
  const prot = [kraft("2026-08-07", "Kniebeugen")];
  pruefe("leichter Kater (1) stiftet kein Ereignis",
    !B.beschwerdeVorlaeufer(prot, [kater("2026-08-08", "quadriceps", 1)], HEUTE).quadriceps);
  pruefe("starker Kater (2) schon",
    B.beschwerdeVorlaeufer(prot, [kater("2026-08-08", "quadriceps", 2)], HEUTE).quadriceps.uebungen["Kniebeugen"] === 1);
  pruefe("ein Training DREI Tage davor zaehlt nicht (Fenster 48 h)",
    !B.beschwerdeVorlaeufer([kraft("2026-08-05", "Kniebeugen")],
      [schmerz("2026-08-08", "quadriceps")], HEUTE).quadriceps);
  pruefe("ein Training NACH der Beschwerde zaehlt nicht",
    !B.beschwerdeVorlaeufer([kraft("2026-08-09", "Kniebeugen")],
      [schmerz("2026-08-08", "quadriceps")], HEUTE).quadriceps);
  pruefe("eine Beschwerde aelter als 180 Tage zaehlt nicht",
    !B.beschwerdeVorlaeufer([kraft("2026-01-01", "Kniebeugen")],
      [schmerz("2026-01-02", "quadriceps")], HEUTE).quadriceps);
}

/* ---------- 3) Sportarten + Deckel ---------- */
{
  const laufTag = d => ({ datum:d, typ:"aktivitaet", sportart:"laufen", dauerMin:30, saetze:[] });
  const tage = ["2026-07-01", "2026-07-08", "2026-07-15", "2026-07-22", "2026-07-29"];
  const prot = tage.map(laufTag);
  const besch = tage.map(d => schmerz(d.slice(0, 8) + String(Number(d.slice(8)) + 1).padStart(2, "0"), "quadriceps"));
  const v = B.beschwerdeVorlaeufer(prot, besch, HEUTE);
  pruefe("fuenf Beschwerden nach dem Laufen ergeben das Sportart-Muster",
    v.quadriceps && v.quadriceps.sportarten.laufen === 5);
  pruefe("ab fuenf greift der Deckel: hoechstens 10 %",
    B.vertraeglichkeitsFaktor(v, "quadriceps") === 0.9);
  const muster = B.beschwerdeMusterFuer(v, "quadriceps");
  pruefe("das Muster kennt seine Herkunft", muster[0].sportart === true);
}
pruefe("nie ueber 1, nie unter 0,9",
  B.vertraeglichkeitsFaktor({}, "quadriceps") === 1 && B.vertraeglichkeitsFaktor(null, "x") === 1);
pruefe("malWort spricht Saetze", B.malWort(3) === "dreimal" && B.malWort(13) === "13-mal");

/* ---------- 4) Verdrahtung ---------- */
pruefe("die Kapazitaet rechnet die Vertraeglichkeit mit",
  grabFn("muskelKapazitaet").includes("(vertraeglichkeit || 1)"));
pruefe("die Auslastung zaehlt die Vorlaeufer EINMAL fuer alle Muskeln",
  grabFn("muskelAuslastung").includes("beschwerdeVorlaeufer(protokoll, beschwerden, heute)") &&
  grabFn("muskelAuslastung").includes("vertraeglichkeitsFaktor(vor, m)"));
pruefe("die Detail-Karte nennt das Muster",
  grabFn("muskelAuswahlZeichnen").includes("beschwerdeMusterText("));
pruefe("der Wohlbefinden-Hinweis erklaert das Merken",
  src.includes("merkt sich die App das Muster"));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.237.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 237000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.237.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
