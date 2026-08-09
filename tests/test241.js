/* 0.241.0-Test: Kein erfasster Wert fuehrt ins Leere (Daten-Inventur).

   Die vier Verdrahtungen:
   1. TEMPO WIEGT: paceSchnittJeSportart (Strecke je Minute, ab 3 Einheiten,
      180-Tage-Fenster, Vorschau-Eintraege nie) + paceFaktor (±10 % Deckel,
      ohne Strecke/Schnitt neutral) — in muskelLast UND muskelLastAbklingend.
   2. TAGES-CHECK-KATER wirkt je Muskel (Beschwerden-Liste), senkt das
      Befinden nicht mehr doppelt (test168 prueft die Check-Seite).
   3. LEISTUNGSSIGNAL: Note 5 kurz nach dem letzten Training zaehlt als
      traege Episode im Erholungs-Lernen — ohne Beschwerde-Meldung.
   4. STAERKE WIEGT: starke Meldungen zaehlen doppelt auf Muster-Schwellen
      und Erholungs-Anker; der Muster-Text nennt weiter die ECHTE Anzahl.
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
  grabZahl("ERHOLUNG_LERN_FENSTER"), grabZahl("ERHOLUNG_LERN_MIN"),
  grabZahl("ERHOLUNG_FRUEH_MIN"), grabZahl("PACE_MINDEST_EINHEITEN"),
  // 0.244: der Vorlauf folgt dem Muskel — hier neutral (test244 prueft ihn).
  "const MUSKEL_ERHOLUNG = {};", "const ERHOLUNG_TAGE = 2;",
  grabZahl("MUSTER_VORLAUF_TAGE"), grabZahl("MUSTER_FENSTER_TAGE"),
  grabZahl("MUSTER_MIN"), grabZahl("MUSTER_STARK"),
  grabZahl("AKTIVITAET_MINUTEN_JE_SATZ"), grabZahl("AKTIVITAET_MAX_SAETZE"),
  grabBlock("SPORT_LAST_MUSKELN", "{", "}"),
  grabFn("tagDifferenz"), grabFn("istSollEintrag"),
  grabFn("aktivitaetSaetze"), grabFn("alsEinheitZaehlbar"),
  "function muskelnAufKarte(k){ return (k || []).slice(); }",
  "function uebungMuskeln(name){ return name === 'Kniebeugen' ? { muskeln:['quadriceps'], sekundaer:['lowerback'] } : null; }",
  grabFn("paceSchnittJeSportart"), grabFn("paceFaktor"),
  grabFn("erholungPersoenlich"),
  grabFn("beschwerdeVorlaeufer"), grabFn("beschwerdeMusterFuer"),
  grabFn("vertraeglichkeitsFaktor"),
  "module.exports = { paceSchnittJeSportart, paceFaktor, erholungPersoenlich," +
  " beschwerdeVorlaeufer, beschwerdeMusterFuer, vertraeglichkeitsFaktor };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const HEUTE = "2026-08-09";
const lauf = (datum, min, km) => ({ datum, typ:"aktivitaet", sportart:"laufen",
  dauerMin:min, strecke:km, saetze:[] });

/* ---------- 1) Tempo wiegt ---------- */
{
  // Drei gleiche Laeufe (6 km/h) als Basis, dazu die zu pruefende Einheit.
  const basis = [lauf("2026-08-01", 30, 3), lauf("2026-08-03", 30, 3), lauf("2026-08-05", 30, 3)];
  const schnitt = T.paceSchnittJeSportart(basis, HEUTE);
  pruefe("ab drei Einheiten gibt es einen Schnitt", schnitt.laufen > 0);
  pruefe("unter drei Einheiten nicht",
    !T.paceSchnittJeSportart(basis.slice(0, 2), HEUTE).laufen);
  pruefe("deutlich schneller wiegt mehr",
    T.paceFaktor(lauf(HEUTE, 30, 4), schnitt) === 1.1);
  pruefe("deutlich lockerer wiegt weniger",
    T.paceFaktor(lauf(HEUTE, 30, 2), schnitt) === 0.9);
  pruefe("im ueblichen Bereich neutral",
    T.paceFaktor(lauf(HEUTE, 30, 3), schnitt) === 1);
  pruefe("ohne Strecke neutral", T.paceFaktor(lauf(HEUTE, 30, 0), schnitt) === 1);
  pruefe("ohne Schnitt neutral", T.paceFaktor(lauf(HEUTE, 30, 4), {}) === 1);
  pruefe("Vorschau-Eintraege stiften keinen Schnitt",
    !T.paceSchnittJeSportart(basis.map(e => Object.assign({}, e, { vorschau:true })), HEUTE).laufen);
}
pruefe("muskelLast wiegt das Tempo mit",
  grabFn("muskelLast").includes("paceFaktor(e, pace)") &&
  grabFn("muskelLastAbklingend").includes("paceFaktor(e, pace)"));
pruefe("die Grundlagen-Zeile nennt das Tempo",
  grabFn("rechnungsGrundlage").includes('hat.push("Tempo")'));

/* ---------- 2) Leistungssignal im Erholungs-Lernen ---------- */
{
  /* Drei fruehe Wiederholungen (Abstand 2 bei Basis 3), jeweils mit Note 5 —
     drei traege Anker OHNE eine einzige Beschwerde-Meldung. */
  const tage = ["2026-07-01", "2026-07-03", "2026-07-10", "2026-07-12", "2026-07-20", "2026-07-22"];
  const note = { "2026-07-03":5, "2026-07-12":5, "2026-07-22":5 };
  pruefe("Note 5 kurz nach dem letzten Training verlaengert die Erholung",
    T.erholungPersoenlich({ tage, note }, [], "quadriceps", HEUTE, 3) === 4);
  pruefe("mit Note 3 statt 5 bleibt die Basis (und wird nicht schneller — zu wenige Belege)",
    T.erholungPersoenlich({ tage, note: { "2026-07-03":3, "2026-07-12":3, "2026-07-22":3 } },
      [], "quadriceps", HEUTE, 3) === 3);
}

/* ---------- 3) Staerke wiegt doppelt ---------- */
{
  const kraft = (datum) => ({ datum, typ:"kraft", saetze:[{ name:"Kniebeugen" }] });
  const stark = (datum) => ({ datum, muskel:"quadriceps", art:"schmerz", wert:2 });
  const prot = [kraft("2026-08-01"), kraft("2026-08-05")];
  const besch = [stark("2026-08-02"), stark("2026-08-06")];
  const v = T.beschwerdeVorlaeufer(prot, besch, HEUTE);
  pruefe("zwei STARKE Ereignisse zaehlen wie vier",
    v.quadriceps.uebungen["Kniebeugen"].n === 2 && v.quadriceps.uebungen["Kniebeugen"].g === 4);
  const muster = T.beschwerdeMusterFuer(v, "quadriceps");
  pruefe("das Muster greift damit schon bei zwei Ereignissen",
    muster.length === 1 && muster[0].anzahl === 2);
  pruefe("der Text-Wert bleibt die ECHTE Anzahl", muster[0].anzahl === 2 && muster[0].gewicht === 4);
  pruefe("und die Senkung nutzt das Gewicht", T.vertraeglichkeitsFaktor(v, "quadriceps") === 0.95);
  /* Sekundaermuskel: Kniebeugen erklaeren auch den unteren Ruecken (0.239). */
  const vRuecken = T.beschwerdeVorlaeufer(prot,
    besch.map(b => Object.assign({}, b, { muskel:"lowerback" })), HEUTE);
  pruefe("Sekundaermuskeln bilden weiter Muster",
    vRuecken.lowerback && vRuecken.lowerback.uebungen["Kniebeugen"].n === 2);
  /* Erholungs-Lernen: zwei starke Anker wiegen wie vier — noch unter der
     Schwelle 3? Nein: 2 Anker × Gewicht 2 = 4 >= 3 → +1 Tag. */
  pruefe("starke Meldungen beschleunigen auch das Erholungs-Lernen",
    T.erholungPersoenlich({ tage: ["2026-08-01", "2026-08-05"], note: {} },
      [{ datum:"2026-08-04", muskel:"quadriceps", art:"schmerz", wert:2 },
       { datum:"2026-08-08", muskel:"quadriceps", art:"schmerz", wert:2 }],
      "quadriceps", HEUTE, 3) === 4);
}

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.241.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 241000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.241.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
