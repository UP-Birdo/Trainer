/* v197-Test: Ausdauer zaehlt in der Muskelkarte mit (Nutzer-Ansage, 48. Runde)
   plus die letzten drei Luecken der Drill-Zuordnung (47. Runde, Punkt D).

   Die Zusagen — und die Grenzen, die dabei WICHTIGER sind als die Zahl:
   1. Eine Aktivitaets-Einheit ohne gemessene Saetze zaehlt ueber ihre DAUER
      auf die Muskeln ihrer Sportart (`SPORT_LAST_MUSKELN`).
   2. 10 Minuten = 1 Satz-Aequivalent, gedeckelt bei 6 je Einheit. Die Zahl ist
      nicht belegt — deshalb dieselbe Zurueckhaltung wie bei Schlaf und Pausen.
   3. KEINE Doppelzaehlung: Wer Drills protokolliert hat, dessen Belastung steht
      schon in der Rechnung; dann zaehlt die Dauer nicht mehr.
   4. Soll-Eintraege („Erledigt", der Haken aus v174) zaehlen nicht — v158-Linie.
   5. Die Saetze-Grundlage wird nicht verwaessert: Ein Kraft-Training bleibt
      Zeichen fuer Zeichen so bewertet wie vorher.
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
function grabObjekt(name){
  const i = src.indexOf("const " + name + " = ");
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  const start = src.indexOf("{", i);
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === "{") tiefe++;
    else if(src[k] === "}"){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}
function grabZahl(name){
  const t = new RegExp("const " + name + " = (\\d+);").exec(src);
  if(!t) throw new Error("Zahl nicht gefunden: " + name);
  return Number(t[1]);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("tagDifferenz"),
  grabFn("echteSaetze"),
  grabFn("istSollEintrag"),
  grabFn("satzWert"),
  "function muskelnAufKarte(k){ return (k || []).slice(); }",
  "function uebungMuskeln(name){ return UEBUNG_TEST[name] || null; }",
  "const UEBUNG_TEST = { 'Kniebeugen': { muskeln:['quadriceps'], sekundaer:['glutes'] } };",
  "function maxGewichtJeUebung(){ return {}; }",
  "function satzGewichtung(s){ return 1; }",
  "const SEKUNDAER_ANTEIL = " + (/const SEKUNDAER_ANTEIL = ([\d.]+)/.exec(src) || [0, "0.5"])[1] + ";",
  "const MUSKEL_HEAT_TAGE = " + grabZahl("MUSKEL_HEAT_TAGE") + ";",
  "const AKTIVITAET_MINUTEN_JE_SATZ = " + grabZahl("AKTIVITAET_MINUTEN_JE_SATZ") + ";",
  "const AKTIVITAET_MAX_SAETZE = " + grabZahl("AKTIVITAET_MAX_SAETZE") + ";",
  "const SPORT_LAST_MUSKELN = " + grabObjekt("SPORT_LAST_MUSKELN") + ";",
  grabFn("aktivitaetSaetze"),
  grabFn("alsEinheitZaehlbar"),
  grabFn("einheitenGezaehlt"),
  grabFn("muskelLast"),
  grabFn("satzloseEinheiten"),
  "module.exports = { aktivitaetSaetze, alsEinheitZaehlbar, einheitenGezaehlt, muskelLast," +
  " satzloseEinheiten, SPORT_LAST_MUSKELN, AKTIVITAET_MINUTEN_JE_SATZ, AKTIVITAET_MAX_SAETZE," +
  " SEKUNDAER_ANTEIL, MUSKEL_HEAT_TAGE };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const HEUTE = "2026-07-31";
const lauf = (min, extra) => Object.assign({ datum:HEUTE, typ:"aktivitaet", sportart:"laufen",
  dauerMin:min, saetze:[] }, extra || {});

/* ---------- 1) Das Register ---------- */
const sportIds = Object.keys(A.SPORT_LAST_MUSKELN);
pruefe("jede Nicht-Kraft-Sportart hat einen Eintrag", sportIds.length >= 11);
pruefe("Krafttraining steht NICHT drin (es rechnet mit Saetzen)",
  !A.SPORT_LAST_MUSKELN.kraft);
pruefe("jeder Eintrag hat primaere und sekundaere Muskeln",
  sportIds.every(id => A.SPORT_LAST_MUSKELN[id].p.length > 0 && A.SPORT_LAST_MUSKELN[id].s.length > 0));
pruefe("kein Muskel ist primaer UND sekundaer",
  sportIds.every(id => A.SPORT_LAST_MUSKELN[id].p.every(m => A.SPORT_LAST_MUSKELN[id].s.indexOf(m) < 0)));
pruefe("Laufen geht in die Beine (der Nutzer-Wunsch woertlich)",
  A.SPORT_LAST_MUSKELN.laufen.p.indexOf("quadriceps") >= 0);
pruefe("Schwimmen dagegen in den Oberkoerper",
  A.SPORT_LAST_MUSKELN.schwimmen.p.indexOf("latissimus") >= 0 &&
  A.SPORT_LAST_MUSKELN.schwimmen.p.indexOf("quadriceps") < 0);

/* ---------- 2) Die Umrechnung — und ihr Deckel ---------- */
pruefe("10 Minuten sind ein Satz", A.aktivitaetSaetze(10) === 1);
pruefe("30 Minuten sind drei", A.aktivitaetSaetze(30) === 3);
pruefe("der Deckel greift bei einer Stunde",
  A.aktivitaetSaetze(60) === A.AKTIVITAET_MAX_SAETZE);
pruefe("und laenger aendert nichts mehr",
  A.aktivitaetSaetze(240) === A.AKTIVITAET_MAX_SAETZE && A.aktivitaetSaetze(600) === A.AKTIVITAET_MAX_SAETZE);
pruefe("kurze Einheiten zaehlen anteilig", A.aktivitaetSaetze(5) === 0.5);
pruefe("ohne Dauer kein Wert",
  A.aktivitaetSaetze(0) === 0 && A.aktivitaetSaetze(null) === 0 &&
  A.aktivitaetSaetze(undefined) === 0 && A.aktivitaetSaetze("quatsch") === 0);
pruefe("negative Werte fallen nicht durch", A.aktivitaetSaetze(-30) === 0);
pruefe("der Deckel liegt unter einem typischen Kraft-Trainingsvolumen",
  A.AKTIVITAET_MAX_SAETZE <= 8);

/* ---------- 3) Wer zaehlt als Einheit? ---------- */
pruefe("ein gelaufener Lauf zaehlt", A.alsEinheitZaehlbar(lauf(30)) === true);
pruefe("ein Kraft-Training nicht",
  A.alsEinheitZaehlbar({ datum:HEUTE, typ:"kraft", dauerMin:60, saetze:[] }) === false);
pruefe("ein abgehakter Lauf nicht (v158-Linie)",
  A.alsEinheitZaehlbar(lauf(30, { saetze:[{ soll:true, name:"x" }] })) === false);
pruefe("ein Lauf MIT gemessenen Drills nicht (keine Doppelzaehlung)",
  A.alsEinheitZaehlbar(lauf(30, { saetze:[{ name:"Bergsprints", wdh:5 }] })) === false);
pruefe("ein Lauf ohne Dauer nicht", A.alsEinheitZaehlbar(lauf(0)) === false);
pruefe("eine Sportart ohne Register-Eintrag nicht",
  A.alsEinheitZaehlbar(lauf(30, { sportart:"gibtesnicht" })) === false);
pruefe("nichts uebergeben faellt nicht um",
  A.alsEinheitZaehlbar(null) === false && A.alsEinheitZaehlbar({}) === false);

/* ---------- 4) Die Wirkung in der Last-Rechnung ---------- */
const last30 = A.muskelLast([lauf(30)], HEUTE, A.MUSKEL_HEAT_TAGE);
pruefe("der Lauf landet in den Beinen", last30.quadriceps && last30.quadriceps.saetze === 3);
pruefe("mitarbeitende Muskeln bekommen den halben Anteil",
  Math.abs(last30.hamstrings.saetze - 3 * A.SEKUNDAER_ANTEIL) < 0.05);
pruefe("und Muskeln, die nichts damit zu tun haben, bleiben leer", !last30.pectoral);
pruefe("die Erholungs-Zaehlung greift auch hier", last30.quadriceps.tageSeit === 0);
const last60 = A.muskelLast([lauf(120)], HEUTE, A.MUSKEL_HEAT_TAGE);
pruefe("auch in der Rechnung gilt der Deckel",
  last60.quadriceps.saetze === A.AKTIVITAET_MAX_SAETZE);
pruefe("ausserhalb des Fensters zaehlt nichts",
  Object.keys(A.muskelLast([Object.assign(lauf(30), { datum:"2026-06-01" })], HEUTE, 7)).length === 0);
pruefe("ein Lauf in der Zukunft zaehlt nicht",
  Object.keys(A.muskelLast([Object.assign(lauf(30), { datum:"2026-08-05" })], HEUTE, 7)).length === 0);

/* Die Saetze-Grundlage bleibt unangetastet — Kraft rechnet wie vorher. */
const kraft = { datum:HEUTE, typ:"kraft", saetze:[{ name:"Kniebeugen", wdh:10, gewicht:60 }] };
const nurKraft = A.muskelLast([kraft], HEUTE, A.MUSKEL_HEAT_TAGE);
pruefe("ein Kraft-Satz zaehlt unveraendert", nurKraft.quadriceps.saetze === 1);
const beides = A.muskelLast([kraft, lauf(30)], HEUTE, A.MUSKEL_HEAT_TAGE);
pruefe("Kraft und Ausdauer addieren sich sauber", beides.quadriceps.saetze === 4);
pruefe("die Herkunft vermischt sich nicht",
  beides.glutes.saetze === nurKraft.glutes.saetze + (last30.glutes ? last30.glutes.saetze : 0));

/* ---------- 5) Die v184-Zeile zieht mit ---------- */
const satzlos = A.satzloseEinheiten([lauf(30)], HEUTE, 7);
pruefe("ein gezaehlter Lauf steht nicht mehr in der Nicht-gezaehlt-Zeile", satzlos.anzahl === 0);
const abgehakt = A.satzloseEinheiten([lauf(30, { saetze:[{ soll:true }] })], HEUTE, 7);
pruefe("ein abgehakter Lauf schon", abgehakt.anzahl === 1);
pruefe("und nennt seine Sportart", abgehakt.sportarten.join() === "laufen");
pruefe("die Grundlagen-Zeile kennt die Ausdauer",
  A.einheitenGezaehlt([lauf(30)], HEUTE) === true);
pruefe("ohne gezaehlte Einheit sagt sie nichts",
  A.einheitenGezaehlt([kraft], HEUTE) === false &&
  A.einheitenGezaehlt([], HEUTE) === false && A.einheitenGezaehlt(null, HEUTE) === false);
pruefe("sie steht nur in der Hat-Liste, nie in der Fehlt-Liste (wie die Pausen)",
  /if\(einheitenGezaehlt\(protokoll, heute\)\) hat\.push\("Ausdauer"\)/.test(grabFn("rechnungsGrundlage")));

/* ---------- 6) Die geschlossenen Drill-Luecken ---------- */
const muskelBlock = grabObjekt("SPORT_MUSKELN");
pruefe("Aufschlag-Training ist jetzt zugeordnet", muskelBlock.includes('"Aufschlag-Training":'));
pruefe("Aufschlag und dritter Ball auch", muskelBlock.includes('"Aufschlag und dritter Ball":'));
pruefe("Passgenauigkeit auch", muskelBlock.includes('"Passgenauigkeit (an die Wand)":'));
pruefe("die Atem-Drills bleiben bewusst offen",
  !muskelBlock.includes('"Atem-Rhythmus (3er-Zug)":') && !muskelBlock.includes('"Atemübung (Pranayama)":'));

/* ---------- 7) Version ---------- */
pruefe("APP_VERSION steht genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("und ist mindestens 197",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 197);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
