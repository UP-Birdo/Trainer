/* 0.249.0-Test: Inventur der Belastungs-Rechnung — drei geschlossene Luecken.

   Die Zusagen:
   1. ZEIT-SAETZE WIEGEN NACH IHRER DAUER (`zeitFaktor` ueber den generischen
      `umfangFaktor`): bis ZEIT_SATZ_BAND (90 s) exakt 1 — Eichung und
      Altbestand unberuehrt —, darueber anteilig, Zuschlag fuers Durchziehen,
      Deckel gegen Tippfehler. `satzUmfangFaktor` waehlt am Satz: Zeit-Saetze
      nach `dauer` (Soll-Saetze nach `zeit`), alle anderen nach `wdh`.
   2. DIE STRECKE RETTET DIE DAUER (`aktivitaetsMinuten`): Ist die eingetragene
      Dauer unglaubwuerdig klein (unter 40 % der nach eigener Pace erwarteten
      Zeit), wird sie aus Strecke / eigenem Schnitt geschaetzt. Ohne Schnitt
      oder Strecke bleibt die eingetragene Dauer — geraten wird nicht. Aus
      einer Schaetzung entsteht KEIN Tempo-Urteil (paceFaktor neutral).
   3. DIE ENTLASTUNGS-BEOBACHTUNG ZAEHLT DEN UMFANG (`wochenLast` summiert
      `satzUmfangFaktor` statt roher Anzahl) — 1 x 100 Wdh ist keine leichte
      Woche mehr. Normale Saetze zaehlen weiter als 1 (Regression test176).
   4. DIE VORSCHAU BAUT ZEIT-SAETZE WIE DAS ECHTE TRAINING (`planAlsEintrag`
      traegt modus + dauer) — sonst zeigte "Nachher" fuer lange Halte zu wenig.
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
  const t = new RegExp("^const " + name + "\\s*=[^;\\n]*;", "m").exec(src);
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
  grabZahl("WDH_SATZ_BAND"), grabZahl("ZEIT_SATZ_BAND"),
  grabZahl("UMFANG_LANG_BONUS"), grabZahl("UMFANG_FAKTOR_MAX"),
  grabZahl("PACE_MINDEST_EINHEITEN"), grabZahl("ERHOLUNG_LERN_FENSTER"),
  grabBlock("NOTE_GEWICHT", "{", "}"), grabBlock("PAUSE_STUFEN", "[", "]"),
  grabFn("umfangFaktor"), grabFn("wdhFaktor"), grabFn("zeitFaktor"),
  grabFn("satzUmfangFaktor"), grabFn("pauseFaktor"), grabFn("satzGewichtung"),
  grabFn("tagDifferenz"), grabFn("isoWoche"),
  grabFn("paceSchnittJeSportart"), grabFn("aktivitaetsMinuten"), grabFn("paceFaktor"),
  grabFn("wochenLast"),
  grabFn("planAlsEintrag"),
  "module.exports = { zeitFaktor, satzUmfangFaktor, satzGewichtung, aktivitaetsMinuten," +
  " paceSchnittJeSportart, paceFaktor, wochenLast, planAlsEintrag, ZEIT_SATZ_BAND };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Zeit-Saetze wiegen nach ihrer Dauer ---------- */
pruefe("bis zum Band aendert sich nichts",
  T.zeitFaktor(30) === 1 && T.zeitFaktor(60) === 1 && T.zeitFaktor(90) === 1);
pruefe("kein Wert, kein Effekt",
  T.zeitFaktor(undefined) === 1 && T.zeitFaktor(0) === 1 && T.zeitFaktor(-5) === 1);
pruefe("darueber zaehlt jede Sekunde anteilig",
  T.zeitFaktor(135) === 1.5 && T.zeitFaktor(180) === 2);
pruefe("der sehr lange Halt bekommt den Zuschlag",
  T.zeitFaktor(360) === Math.round(360 / 90 * 1.10 * 100) / 100);
pruefe("der Deckel greift", T.zeitFaktor(99999) === 8);
pruefe("der Faktor waechst nie rueckwaerts",
  [30, 90, 91, 135, 180, 200, 600].every((n, i, a) =>
    i === 0 || T.zeitFaktor(n) >= T.zeitFaktor(a[i - 1])));

/* Der Waehler am Satz: Zeit nach dauer/zeit, alles andere nach wdh. */
pruefe("ein Zeit-Satz wiegt nach seiner Dauer",
  T.satzUmfangFaktor({ modus:"zeit", dauer:180 }) === 2);
pruefe("ein Soll-Zeit-Satz wiegt nach seinem Soll (zeit)",
  T.satzUmfangFaktor({ modus:"zeit", zeit:180 }) === 2);
pruefe("ein Wdh-Satz wiegt nach seinen Wiederholungen",
  T.satzUmfangFaktor({ wdh:40 }) === 2);
pruefe("die Dauer eines Wdh-Satzes zaehlt NICHT (kein Doppel)",
  T.satzUmfangFaktor({ wdh:10, dauer:600 }) === 1);
pruefe("ohne Satz neutral", T.satzUmfangFaktor(null) === 1);
{
  // Der Nutzer-Fall, uebersetzt auf Zeit: ein 10-min-Halten gegen 6 x 90 s.
  const zehnMin = T.satzGewichtung({ modus:"zeit", dauer:600, note:3 }, 0);
  const sechs   = 6 * T.satzGewichtung({ modus:"zeit", dauer:90, note:3 }, 0);
  pruefe("ein 10-Minuten-Halten wiegt mehr als sechs 90er",
    zehnMin > sechs / 6 * 6 - 0.01 && zehnMin > 6);
  pruefe("ein normaler Plank bleibt exakt ein Satz",
    T.satzGewichtung({ modus:"zeit", dauer:45, note:3 }, 0) === 1);
}

/* ---------- 2) Die Strecke rettet die Dauer ---------- */
const HEUTE = "2026-08-10";
const lauf = (datum, min, km) => ({ datum, typ:"aktivitaet", sportart:"laufen",
  dauerMin:min, strecke:km, saetze:[] });
{
  // Drei Laeufe mit 6 km/h (0,1 km/min) als eigener Schnitt.
  const basis = [lauf("2026-08-01", 30, 3), lauf("2026-08-03", 30, 3), lauf("2026-08-05", 30, 3)];
  const schnitt = T.paceSchnittJeSportart(basis, HEUTE);

  pruefe("eine plausible Dauer bleibt unangetastet",
    T.aktivitaetsMinuten(lauf(HEUTE, 30, 3), schnitt) === 30);
  pruefe("auch eine ehrlich schnelle Einheit bleibt ihre eigene",
    T.aktivitaetsMinuten(lauf(HEUTE, 20, 3), schnitt) === 20);
  pruefe("eine fehlende Dauer wird aus der Strecke geschaetzt (5 km -> 50 min)",
    T.aktivitaetsMinuten(lauf(HEUTE, 1, 5), schnitt) === 50);
  pruefe("ohne Schnitt wird NICHT geraten",
    T.aktivitaetsMinuten(lauf(HEUTE, 1, 5), {}) === 1);
  pruefe("ohne Strecke bleibt die Dauer",
    T.aktivitaetsMinuten(lauf(HEUTE, 45, 0), schnitt) === 45);
  pruefe("kaputte Eintraege werfen nicht",
    T.aktivitaetsMinuten(null, schnitt) === 0 && T.aktivitaetsMinuten({}, null) === 0);
  pruefe("aus einer Schaetzung entsteht kein Tempo-Urteil",
    T.paceFaktor(lauf(HEUTE, 1, 5), schnitt) === 1);
  pruefe("eine echte schnelle Einheit wird weiter belohnt",
    T.paceFaktor(lauf(HEUTE, 30, 4), schnitt) === 1.1);
}

/* ---------- 3) Die Entlastungs-Beobachtung zaehlt den Umfang ---------- */
{
  const woche = datum => T.wochenLast([{ datum, saetze:[{ wdh:100 }] }]);
  const w1 = woche("2026-08-03");
  pruefe("1 x 100 Wdh ist keine leichte Woche mehr",
    Object.values(w1)[0] === 5.5);
  const normal = T.wochenLast([{ datum:"2026-08-03",
    saetze:[{ wdh:10 }, { wdh:12 }, { wdh:8 }] }]);
  pruefe("normale Saetze zaehlen weiter als je 1 (Regression)",
    Object.values(normal)[0] === 3);
  const soll = T.wochenLast([{ datum:"2026-08-03",
    saetze:[{ wdh:10, soll:true }, { modus:"zeit", zeit:45, soll:true }] }]);
  pruefe("Soll-Saetze zaehlen weiter mit (Erledigt ist keine Pause)",
    Object.values(soll)[0] === 2);
  pruefe("kaputte Saetze werfen nicht",
    Object.values(T.wochenLast([{ datum:"2026-08-03", saetze:[null, { wdh:10 }] }]))[0] === 1);
}

/* ---------- 4) Die Vorschau baut Zeit-Saetze wie das echte Training ---------- */
{
  const plan = { typ:"kraft", uebungen:[
    { name:"Plank", modus:"zeit", dauer:120, saetze:2 },
    { name:"Kniebeugen", modus:"wdh", wdh:10, gewicht:60, saetze:3 }
  ]};
  const e = T.planAlsEintrag(plan, HEUTE);
  const zeit = e.saetze.filter(s => s.modus === "zeit");
  pruefe("Zeit-Saetze tragen Modus und geplante Dauer",
    zeit.length === 2 && zeit.every(s => s.dauer === 120 && s.wdh === 0));
  pruefe("und wiegen in der Vorschau wie im Training",
    T.satzUmfangFaktor(zeit[0]) === T.satzUmfangFaktor({ modus:"zeit", dauer:120 }));
  pruefe("Wdh-Saetze bleiben unveraendert (Regression)",
    e.saetze.filter(s => !s.modus).length === 3 &&
    e.saetze.filter(s => !s.modus).every(s => s.wdh === 10 && s.gewicht === 60 && s.note === 3));
  pruefe("der Eintrag bleibt als Vorschau markiert", e.vorschau === true);
}

/* ---------- 5) Verdrahtung ---------- */
pruefe("beide Last-Rechnungen rechnen mit den effektiven Minuten",
  grabFn("muskelLast").includes("aktivitaetSaetze(aktivitaetsMinuten(e, pace), ausdauerDeckel)") &&
  grabFn("muskelLastAbklingend").includes("aktivitaetSaetze(aktivitaetsMinuten(e, pace), ausdauerDeckel)"));
pruefe("satzGewichtung nimmt den Umfang ueber den Waehler",
  grabFn("satzGewichtung").includes("satzUmfangFaktor(satz)"));
pruefe("wochenLast summiert den Umfang",
  grabFn("wochenLast").includes("satzUmfangFaktor(satz)"));

/* ---------- 6) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.249.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 249000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.249.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
