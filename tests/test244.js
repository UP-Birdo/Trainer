/* 0.244.0-Test: Vier feste Zahlen passen sich an (Konstanten-Inventur).

   Die Zusagen:
   1. AUSDAUER-DECKEL: aktivitaetsDeckel = Median der eigenen Einheitsdauern
      (180 Tage, ab drei Einheiten), nie unter 6, Deckel 18; Vorschau nie.
      aktivitaetSaetze nimmt ihn als zweiten Parameter, Standard bleibt 6.
   2. AUSKLINGEN JE MUSKEL: beschwerdeFensterFuer = 2 + Basis-Erholung
      (Waden 3, Standard 4 wie bisher, Beine 5) — in Faktor, Boden und Text.
   3. MUSTER-VORLAUF JE MUSKEL: langsame Muskeln schauen bis zur eigenen
      Erholungszeit zurueck (DOMS bis 72 h), schnelle bleiben bei 48 h.
   4. STICHPROBE STRECKT SICH: vier ruhige Wochen -> 28 Tage statt 14.
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
  grabZahl("AKTIVITAET_MINUTEN_JE_SATZ"), grabZahl("AKTIVITAET_MAX_SAETZE"),
  grabZahl("ERHOLUNG_LERN_FENSTER"), grabZahl("ERHOLUNG_TAGE"),
  grabBlock("MUSKEL_ERHOLUNG", "{", "}"),
  grabFn("tagDifferenz"),
  grabFn("aktivitaetSaetze"), grabFn("aktivitaetsDeckel"),
  grabFn("beschwerdeFensterFuer"),
  "module.exports = { aktivitaetSaetze, aktivitaetsDeckel, beschwerdeFensterFuer };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const HEUTE = "2026-08-09";
const lauf = (datum, min) => ({ datum, typ:"aktivitaet", sportart:"laufen", dauerMin:min, saetze:[] });

/* ---------- 1) Der Ausdauer-Deckel ---------- */
pruefe("ohne Historie bleibt der Standard (6)",
  T.aktivitaetsDeckel([], HEUTE) === 6 && T.aktivitaetsDeckel(null, HEUTE) === 6);
pruefe("unter drei Einheiten bleibt der Standard",
  T.aktivitaetsDeckel([lauf("2026-08-01", 90), lauf("2026-08-03", 90)], HEUTE) === 6);
{
  const gewohnt = [lauf("2026-08-01", 90), lauf("2026-08-03", 90), lauf("2026-08-05", 90)];
  pruefe("wer regelmaessig 90 min laeuft, bekommt Deckel 9",
    T.aktivitaetsDeckel(gewohnt, HEUTE) === 9);
  pruefe("und die lange Einheit zaehlt dann voll",
    T.aktivitaetSaetze(90, T.aktivitaetsDeckel(gewohnt, HEUTE)) === 9);
  pruefe("ohne Deckel-Angabe bleibt der alte Standard",
    T.aktivitaetSaetze(90) === 6 && T.aktivitaetSaetze(120) === 6);
}
pruefe("kurze Laeufe senken den Deckel NIE unter den Standard",
  T.aktivitaetsDeckel([lauf("2026-08-01", 20), lauf("2026-08-03", 20), lauf("2026-08-05", 20)], HEUTE) === 6);
pruefe("der Deckel des Deckels: 3 h (18)",
  T.aktivitaetsDeckel([lauf("2026-08-01", 300), lauf("2026-08-03", 300), lauf("2026-08-05", 300)], HEUTE) === 18);
pruefe("Vorschau-Eintraege stiften keinen Deckel",
  T.aktivitaetsDeckel([lauf("2026-08-01", 90), lauf("2026-08-03", 90),
    Object.assign(lauf("2026-08-05", 90), { vorschau:true })], HEUTE) === 6);
pruefe("uralte Einheiten zaehlen nicht",
  T.aktivitaetsDeckel([lauf("2025-08-01", 90), lauf("2025-08-03", 90), lauf("2025-08-05", 90)], HEUTE) === 6);

/* ---------- 2) Das Ausklingen je Muskel ---------- */
pruefe("Waden klingen schneller aus als der Standard",
  T.beschwerdeFensterFuer("calves") === 3);
pruefe("der Standard bleibt bei 4 Tagen",
  T.beschwerdeFensterFuer("deltoid") === 4 && T.beschwerdeFensterFuer("unbekannt") === 4);
pruefe("Beine und Ruecken tragen laenger",
  T.beschwerdeFensterFuer("quadriceps") === 5 && T.beschwerdeFensterFuer("lowerback") === 5);
pruefe("Faktor, Boden und Text nutzen das Muskel-Fenster",
  grabFn("beschwerdeFaktor").includes("beschwerdeFensterFuer(muskel)") &&
  grabFn("beschwerdeQuoteFloor").includes("beschwerdeFensterFuer(muskel)") &&
  grabFn("beschwerdeText").includes("beschwerdeFensterFuer(muskel)"));

/* ---------- 3) Der Muster-Vorlauf je Muskel ---------- */
pruefe("der Vorlauf folgt der Erholung des Muskels",
  grabFn("beschwerdeVorlaeufer").includes("Math.max(MUSTER_VORLAUF_TAGE, MUSKEL_ERHOLUNG[er.muskel] || ERHOLUNG_TAGE)"));

/* ---------- 4) Die Stichprobe streckt sich ---------- */
{
  const wahl = grabFn("muskelCheckMuskeln");
  pruefe("vier ruhige Wochen verdoppeln das Intervall",
    wahl.includes("MCHECK_STICHPROBE_TAGE * 2") &&
    wahl.includes('beschwerdeStand(beschwerden, m, "schmerz", heute, 28)'));
}

/* ---------- 5) Verdrahtung + Version ---------- */
// 0.249: gerechnet wird mit den effektiven Minuten (Strecke rettet die Dauer).
pruefe("beide Last-Rechnungen nutzen den persoenlichen Deckel",
  grabFn("muskelLast").includes("aktivitaetSaetze(aktivitaetsMinuten(e, pace), ausdauerDeckel)") &&
  grabFn("muskelLastAbklingend").includes("aktivitaetSaetze(aktivitaetsMinuten(e, pace), ausdauerDeckel)"));
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.244.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 244000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.244.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
