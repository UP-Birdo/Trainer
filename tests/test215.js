/* v215-Test: Eingetragenes landet im Uebungs-Tab; leere Statistiken zeigen ein
   Plus; die Grafik steht ueber den Eintraegen. (57. Runde, drei Punkte.)

   Die drei Zusagen:
   1. WAS ICH EINTRAGE, KANN ICH WIEDERHOLEN. Aus einem freien Protokoll-Eintrag
      (ohne Plan) entsteht eine einzelne Uebung im Sinne von v192 — damit ist sie
      startbar UND als Ziel waehlbar, denn die Ziel-Auswahl liest die Plaene.
      Kein Doppel: Was schon in der Liste steht, kommt nicht zweimal.
   2. LEER HEISST TITEL + PLUS. Keine Erklaersaetze mehr, und keine Kachel, die
      sich versteckt. Der Fall „ein Eintrag, Kurve braucht zwei" bleibt, wie er
      war (v200) — dort GIBT es Daten.
   3. DIE GRAFIK STEHT UEBER DEN EINTRAEGEN. In der Detail-Ansicht und im
      Trainings-Verlauf.
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
  "function text(s){ return String(s === undefined || s === null ? '' : s); }",
  grabFn("uebungSchonInListe"),
  grabFn("uebungAusEintrag"),
  grabFn("statLeerHtml"),
  "module.exports = { uebungSchonInListe, uebungAusEintrag, statLeerHtml };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Aus dem Eintrag wird eine Uebung ---------- */
const kraftEintrag = { id:"e1", datum:"2026-08-07", plan:"Klimmzüge", planId:null,
  sportart:"kraft", typ:"kraft", sonder:true, dauerMin:6,
  saetze:[{ name:"Klimmzüge", modus:"wdh", satz:1, wdh:8, gewicht:0 },
          { name:"Klimmzüge", modus:"wdh", satz:2, wdh:8, gewicht:0 },
          { name:"Klimmzüge", modus:"wdh", satz:3, wdh:8, gewicht:0 }] };

const neu = A.uebungAusEintrag(kraftEintrag, [], "p1");
pruefe("aus dem Kraft-Eintrag entsteht ein Listen-Eintrag", !!neu);
pruefe("er heisst wie die Uebung", neu.name === "Klimmzüge");
pruefe("er ist eine UEBUNG, kein Plan (kein fester Tag, genau eine Uebung)",
  neu.tage.length === 0 && neu.einzelTermine.length === 0 && neu.uebungen.length === 1);
pruefe("die Sportart wandert mit", neu.sportart === "kraft" && neu.typ === "kraft");
pruefe("die gemessenen Saetze sind die Startwerte",
  neu.uebungen[0].saetze === 3 && neu.uebungen[0].wdh === 8);
pruefe("der Wiederholungsbereich liegt um den Startwert",
  neu.uebungen[0].wdhMin === 6 && neu.uebungen[0].wdhMax === 10);
/* Der Datenvertrag: ein halb gefuellter Plan laesst die Liste abstuerzen (v80). */
["id","name","sportart","typ","tage","wochenTakt","wochenAnker","einzelTermine",
 "reihenfolge","aufwaermen","dehnen","uebungen"].forEach(feld =>
  pruefe("Feld " + feld + " ist gesetzt", neu[feld] !== undefined));
pruefe("die Herkunft steht dran", neu.quelle === "eingetragen");

/* Ohne Saetze (nur festgehalten, dass trainiert wurde) bleiben die Vorgaben. */
const ohneSaetze = A.uebungAusEintrag({ plan:"Rudern am Gerät", sportart:"kraft", typ:"kraft", saetze:[] }, [], "p2");
pruefe("ohne Saetze stehen die bekannten Vorgaben da",
  ohneSaetze.uebungen[0].saetze === 3 && ohneSaetze.uebungen[0].wdh === 10 &&
  ohneSaetze.uebungen[0].wdhMin === 8 && ohneSaetze.uebungen[0].wdhMax === 12);

/* Aktivitaet: die Einheit SELBST ist die Uebung (v193) — ohne Uebungsliste. */
const lauf = A.uebungAusEintrag({ plan:"Laufen", planId:null, sportart:"laufen", typ:"aktivitaet",
  dauerMin:32, strecke:5.2, zeitEinheit:"min", saetze:[] }, [], "p3");
pruefe("aus der freien Einheit entsteht eine Einheit", !!lauf && lauf.typ === "aktivitaet");
pruefe("sie hat keine Uebungen, aber Dauer und Strecke",
  lauf.uebungen.length === 0 && lauf.dauer === 1920 && lauf.strecke === 5.2);
pruefe("und die Felder der Aktivitaets-Plaene",
  lauf.zeitEinheit === "min" && lauf.massZiel === null && !!lauf.steigerung);

/* ---------- 2) Was nicht angelegt werden darf ---------- */
pruefe("ein Eintrag AUS einem Plan legt nichts an",
  A.uebungAusEintrag({ plan:"Ganzkörper", planId:"vorhanden", sportart:"kraft", typ:"kraft" }, [], "p4") === null);
pruefe("ohne Namen entsteht nichts",
  A.uebungAusEintrag({ plan:"", planId:null, sportart:"kraft" }, [], "p5") === null &&
  A.uebungAusEintrag(null, [], "p6") === null);
const listeMitKlimmzuegen = [{ name:"Klimmzüge", sportart:"kraft", uebungen:[] }];
pruefe("dieselbe Uebung kommt nicht zweimal",
  A.uebungAusEintrag(kraftEintrag, listeMitKlimmzuegen, "p7") === null);
pruefe("Gross- und Kleinschreibung und Leerzeichen sind egal",
  A.uebungSchonInListe([{ name:" klimmzüge ", sportart:"kraft" }], "Klimmzüge", "kraft"));
/* Gleicher Name, andere Sportart: zwei verschiedene Dinge — „Laufen" als
   Aktivitaet und „Laufen" als Kraftuebung duerfen nebeneinander stehen. */
pruefe("gleicher Name bei anderer Sportart ist ein eigener Eintrag",
  !A.uebungSchonInListe([{ name:"Laufen", sportart:"kraft" }], "Laufen", "laufen"));

/* ---------- 3) Der Eintrag wird mit seiner Uebung verknuepft ---------- */
const ablegen = grabFn("uebungAusEintragAblegen");
pruefe("die neue Uebung wird in die Liste gelegt", ablegen.includes("plaene.push(neu)"));
pruefe("und der Eintrag zeigt danach auf sie", ablegen.includes("eintrag.planId = neu.id"));
const kraftNachtragen = grabFn("kraftNachtragen");
pruefe("der Kraft-Nachtrag nutzt den Weg", kraftNachtragen.includes("uebungAusEintragAblegen("));
pruefe("und sagt, wo die Uebung jetzt steht", /steht jetzt unter/.test(kraftNachtragen));
const aktivitaet = grabFn("aktivitaetAblegen");
pruefe("die freie Einheit ebenso", aktivitaet.includes("uebungAusEintragAblegen("));

/* ---------- 4) Leere Statistiken: Titel und Plus ---------- */
/* v217 (Nutzer-Ansage): Der grosse Knopf im Leerzustand war das ZWEITE Plus der
   Kachel und hat sie aufgeblaeht. Geblieben ist die leere Flaeche in
   Diagramm-Hoehe; eingetragen wird ueber das eine Plus oben rechts im Kopf. */
const leer = A.statLeerHtml("heuteTrainingEintragen()", "Training eintragen");
pruefe("der Leerzustand ist eine leere Flaeche", leer.includes("stat-leer"));
pruefe("er traegt eine Beschriftung fuer Vorleseprogramme", leer.includes('aria-label="Training eintragen"'));
pruefe("und keinen zweiten Knopf mehr", !leer.includes("<button"));
pruefe("die Flaeche hat eine feste Hoehe (leere Kachel so gross wie volle)",
  /\.stat-leer\{height:\d+px/.test(src));
/* Dafuer hat JEDE Statistik-Kachel ihr Plus im Kopf — genau eines. */
["stat-koerpergewicht","stat-koerpermasse","stat-tageswert","bmi-karte","stat-volumen",
 "ausdauer-karte","messwerte-karte","fortschritt-karte","bestwerte-karte","stat-trainings"].forEach(id => {
  /* Die Kachel endet, wo die naechste anfaengt — mit einem festen Fenster
     rutschte man in die Nachbarkachel und zaehlte deren Plus mit. */
  const start = src.indexOf('id="' + id + '"');
  const naechste = src.indexOf('class="karte stat-karte', start);
  const block = src.slice(start, naechste > start ? naechste : start + 900);
  pruefe("Kachel " + id + " hat genau ein Plus im Kopf",
    (block.match(/class="rund klein"/g) || []).length === 1);
});

const leerNutzer = [
  ["volumenZeichnen", "Training eintragen"],
  ["ausdauerZeichnen", "Einheit eintragen"],
  ["messwerteZeichnen", "Einheit mit Messwert eintragen"],
  ["fortschrittZeichnen", "Training mit Sätzen eintragen"],
  ["bestwerteZeichnen", "Training mit Sätzen eintragen"],
  ["protokollZeichnen", "Training eintragen"],
  ["koerpermassZeichnen", "Maß eintragen"],
  ["tageswertZeichnen", "Tageswert eintragen"]
];
leerNutzer.forEach(([fn, beschriftung]) => {
  const code = grabFn(fn);
  pruefe(fn + " zeigt den Leerzustand", code.includes("statLeerHtml("));
  pruefe(fn + " fuehrt zur passenden Stelle", code.includes(beschriftung));
});
/* Die vier Kacheln, die sich frueher versteckt haben, bleiben stehen. */
["ausdauerZeichnen","messwerteZeichnen","fortschrittZeichnen","bestwerteZeichnen"].forEach(fn =>
  pruefe(fn + " versteckt die Karte nicht mehr wegen fehlender Daten",
    !/karte\.hidden = true;\s*return;/.test(grabFn(fn))));
/* Aber der Ein-Eintrag-Fall aus v200 bleibt unangetastet. */
pruefe("bei EINEM Eintrag steht weiter der Satz aus v200",
  grabFn("ausdauerZeichnen").includes("Ab zwei Einheiten erscheint hier der Verlauf."));

/* ---------- 5) Die Grafik ueber den Eintraegen ---------- */
pruefe("die Detail-Ansicht hat einen Platz fuer die Grafik", src.includes('id="statdetail-grafik"'));
pruefe("und der Verlauf auch", src.includes('id="verlauf-grafik"'));
const detail = grabFn("statDetailZeichnen");
pruefe("die Detail-Ansicht fuellt ihn aus der Kachel", detail.includes("d.grafik") && detail.includes("innerHTML"));
const verlauf = grabFn("verlaufListeZeichnen");
pruefe("der Verlauf rechnet seine Balken selbst", verlauf.includes("trainingsDiagrammHtml("));
/* Jede der fuenf abgeleiteten Statistiken nennt ihre Grafik-Quelle. */
["volumen-diagramm","ausdauer-diagramm","messwerte-diagramm","fortschritt-diagramm","bestwerte-liste"]
  .forEach(id => pruefe("Grafik-Quelle " + id + " steht im Register",
    new RegExp('grafik: "' + id + '"').test(src)));
/* Reihenfolge im Markup: erst Grafik, dann Liste. */
pruefe("im Markup steht die Grafik VOR der Liste",
  src.indexOf('id="statdetail-grafik"') < src.indexOf('id="statdetail-liste"') &&
  src.indexOf('id="verlauf-grafik"') < src.indexOf('id="verlauf-liste"'));

/* ---------- 6) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v215",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 215);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.215", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
