/* v158-Test: Sollwerte zaehlen nicht als Leistung.

   „Erledigt" schreibt die GEPLANTEN Zahlen ins Protokoll. Bis v157 erzeugten sie
   Bestwerte, Rekorde und Punkte auf der Fortschrittskurve — geplante Zahlen sind
   aber keine Messung („Heben erfindet nie Daten"). Sie tragen jetzt `soll:true`.
   Geprueft wird die Trennlinie in BEIDE Richtungen: was sie weiterhin zaehlen
   (Kalender, Serie, Volumen, Heatmap) und was nicht.
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
  grabFn("istSollEintrag"),
  grabFn("satzWert"),
  "module.exports = { echteSaetze, istSollEintrag, satzWert };"
].join("\n"))(modul, modul.exports);
const { echteSaetze, istSollEintrag, satzWert } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const echt = { uebungId:"u1", name:"LH-Bankdrücken", modus:"wdh", wdh:10, gewicht:40 };
const soll = { uebungId:"u1", name:"LH-Bankdrücken", modus:"wdh", wdh:12, gewicht:60, soll:true };

/* ---------- 1) echteSaetze trennt sauber ---------- */
pruefe("Soll-Saetze fallen raus",
  JSON.stringify(echteSaetze({ saetze:[echt, soll] })) === JSON.stringify([echt]));
pruefe("ohne Soll bleibt alles", echteSaetze({ saetze:[echt, echt] }).length === 2);
pruefe("nur Soll ergibt nichts", echteSaetze({ saetze:[soll, soll] }).length === 0);
pruefe("fehlende Saetze sind erlaubt",
  echteSaetze({}).length === 0 && echteSaetze(null).length === 0 && echteSaetze({ saetze:null }).length === 0);
pruefe("kaputte Eintraege werfen nicht", echteSaetze({ saetze:[null, echt] }).length === 1);
pruefe("rein: die Eingabe bleibt unveraendert", (() => {
  const e = { saetze:[echt, soll] }; echteSaetze(e); return e.saetze.length === 2;
})());
pruefe("soll:false gilt als echt", echteSaetze({ saetze:[{ wdh:5, soll:false }] }).length === 1);

/* ---------- 2) istSollEintrag erkennt den ganzen Eintrag ---------- */
pruefe("reiner Soll-Eintrag", istSollEintrag({ saetze:[soll, soll] }) === true);
pruefe("gemischt ist KEIN Soll-Eintrag", istSollEintrag({ saetze:[echt, soll] }) === false);
pruefe("echtes Training ist kein Soll-Eintrag", istSollEintrag({ saetze:[echt] }) === false);
pruefe("ohne Saetze kein Soll-Eintrag (Aktivitaet, Freitext)",
  istSollEintrag({ saetze:[] }) === false && istSollEintrag({}) === false && istSollEintrag(null) === false);

/* ---------- 3) Erledigt markiert seine Saetze ---------- */
const erledigt = grabFn("kraftErledigt");
pruefe("Erledigt schreibt soll:true", erledigt.includes("note:null, soll:true"));
pruefe("und sagt weiterhin vorher an, dass es Sollwerte sind", erledigt.includes("Sollwerte protokolliert"));

/* ---------- 4) Was NICHT mehr zaehlt ---------- */
const zaehltNicht = [
  ["Bestwerte", "bestwerteZeichnen"],
  ["Rekord-Vergleich", "bisherigerRekord"],
  ["Fortschrittskurve", "fortschrittZeichnen"],
  ["letztes Mal", "letztesMal"]
];
zaehltNicht.forEach(([was, fn]) =>
  pruefe(was + " ueberspringt Sollwerte", grabFn(fn).includes("echteSaetze(")));

/* ---------- 5) Was WEITERHIN zaehlt — das Training hat stattgefunden ---------- */
const zaehltWeiter = [
  ["Volumen", "volumenZeichnen"],
  ["Muskel-Heatmap", "trainierteMuskeln"],
  ["Muskel-Detail", "muskelTrainingDetail"]
];
zaehltWeiter.forEach(([was, fn]) =>
  pruefe(was + " zaehlt weiter mit", !grabFn(fn).includes("echteSaetze(")));
pruefe("die Serie zaehlt weiter jeden Trainingstag",
  !grabFn("trainingsSerie").includes("echteSaetze("));
pruefe("der Kalender faerbt weiter jeden Trainingstag",
  !grabFn("tagStatus").includes("echteSaetze("));

/* ---------- 6) Im Verlauf sichtbar ---------- */
pruefe("der Eintrag ist als Sollwerte gekennzeichnet", src.includes("istSollEintrag(e) ?") && src.includes("· Sollwerte"));

/* ---------- 7) Alte Eintraege bleiben gueltig (additiver Vertrag) ---------- */
pruefe("ein Satz ohne das Feld gilt als gemessen",
  echteSaetze({ saetze:[{ uebungId:"u1", wdh:8, gewicht:30 }] }).length === 1);
pruefe("und liefert weiter seinen Wert", satzWert({ modus:"wdh", wdh:8, gewicht:30 }) === 240);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
