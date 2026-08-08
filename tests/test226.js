/* 0.226.0-Test: Die Progression des Unendlichkeitsmodus + eine Faerbung statt zwei.
   (62. Runde, A und C-Teil-1.)

   Die Zusagen:
   1. NUR DER UMFANG. Gezaehlt und uebernommen wird die Zahl der SAETZE; Wdh und
      Gewicht bleiben unangetastet — angehoben werden sie nur auf ausdrueckliches
      Ja des Nutzers (`festeWerte` bleibt damit gewahrt).
   2. ZWEI GETRENNTE ZAHLEN. Plan-Satzzahl = zuletzt geschafft (darf sinken),
      Bestwert = Maximum ueber alle Trainings DIESES Modus, aus dem Protokoll
      gerechnet statt gespeichert (wie die Flamme, v214).
   3. EINE FAERBUNG. Die Statistik-Figur zeigt die Auslastung — dieselbe
      Mal-Funktion wie die volle Karte; die Haeufigkeits-Heatmap bleibt dort.
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
  grabFn("normName"), grabFn("begrenzen"), grabFn("echteSaetze"),
  grabFn("unendlichBest"), grabFn("unendlichSaetzeUebernehmen"),
  "module.exports = { unendlichBest, unendlichSaetzeUebernehmen };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const satz = (id, name, extra) => Object.assign({ uebungId:id, name:name, wdh:10 }, extra || {});

/* ---------- 1) Der Bestwert ---------- */
const protokoll = [
  { datum:"2026-08-01", modus:"unendlich", saetze:[satz("u1","Kniebeugen"), satz("u1","Kniebeugen"), satz("u2","Rudern")] },
  { datum:"2026-08-03", modus:"unendlich", saetze:[satz("u1","Kniebeugen"), satz("u1","Kniebeugen"),
                                                   satz("u1","Kniebeugen"), satz("u2","Rudern")] },
  { datum:"2026-08-05", modus:"unendlich", saetze:[satz("u1","Kniebeugen")] }
];
pruefe("der Bestwert ist das Maximum EINES Trainings", A.unendlichBest(protokoll, "u1", "Kniebeugen") === 3);
pruefe("nicht die Summe ueber alle", A.unendlichBest(protokoll, "u2", "Rudern") === 1);
pruefe("eine unbekannte Uebung hat keinen Bestwert", A.unendlichBest(protokoll, "u9", "Klimmzüge") === 0);
pruefe("ohne Protokoll faellt nichts um", A.unendlichBest(null, "u1", "Kniebeugen") === 0);
/* Ein klassisches Training ist kein Runden-Ergebnis — dort steht die Satz-Zahl
   im Plan, sie ist keine Leistung. */
const gemischt = protokoll.concat([
  { datum:"2026-08-06", saetze:[satz("u1","Kniebeugen"), satz("u1","Kniebeugen"),
                                satz("u1","Kniebeugen"), satz("u1","Kniebeugen"), satz("u1","Kniebeugen")] }
]);
pruefe("Trainings anderer Modi zaehlen nicht mit", A.unendlichBest(gemischt, "u1", "Kniebeugen") === 3);
/* Soll-Saetze sind keine Messung (v158). */
const mitSoll = [{ datum:"2026-08-07", modus:"unendlich",
  saetze:[satz("u1","Kniebeugen", { soll:true }), satz("u1","Kniebeugen", { soll:true }),
          satz("u1","Kniebeugen", { soll:true }), satz("u1","Kniebeugen", { soll:true })] }];
pruefe("abgehakte Soll-Saetze erzeugen keinen Bestwert", A.unendlichBest(mitSoll, "u1", "Kniebeugen") === 0);
/* Der Name traegt, wenn die id fehlt (Altdaten, kopierte Uebungen). */
const ohneId = [{ datum:"2026-08-02", modus:"unendlich",
  saetze:[satz(null,"Kniebeugen"), satz(null,"kniebeugen ")] }];
pruefe("ohne id zaehlt der Name (normalisiert)", A.unendlichBest(ohneId, "xx", "Kniebeugen") === 2);

/* ---------- 2) Die Satz-Zahl im Plan ---------- */
const plan = { id:"p1", uebungen:[
  { id:"u1", name:"Kniebeugen", saetze:3, wdh:10, modus:"wdh" },
  { id:"u2", name:"Rudern",     saetze:3, wdh:12, modus:"wdh" }
]};
A.unendlichSaetzeUebernehmen(plan, [satz("u1","Kniebeugen"), satz("u1","Kniebeugen"),
                                    satz("u1","Kniebeugen"), satz("u1","Kniebeugen"), satz("u2","Rudern")]);
pruefe("die geschafften Runden werden zur Satz-Zahl", plan.uebungen[0].saetze === 4);
pruefe("je Uebung einzeln", plan.uebungen[1].saetze === 1);
/* Sie darf SINKEN — sie beantwortet „wie viele Saetze hat diese Uebung", nicht
   „was war dein Rekord". */
A.unendlichSaetzeUebernehmen(plan, [satz("u1","Kniebeugen"), satz("u2","Rudern")]);
pruefe("ein kuerzeres Training senkt sie wieder", plan.uebungen[0].saetze === 1);
/* Wovon sie die Finger laesst. */
pruefe("Wiederholungen bleiben unberuehrt", plan.uebungen[0].wdh === 10 && plan.uebungen[1].wdh === 12);
const unberuehrt = { id:"p2", uebungen:[{ id:"u3", name:"Plank", saetze:3 }] };
A.unendlichSaetzeUebernehmen(unberuehrt, []);
pruefe("ohne geschaffte Saetze aendert sich nichts", unberuehrt.uebungen[0].saetze === 3);
A.unendlichSaetzeUebernehmen(unberuehrt, [satz("u3","Plank", { soll:true })]);
pruefe("Soll-Saetze zaehlen auch hier nicht", unberuehrt.uebungen[0].saetze === 3);
pruefe("ohne Plan faellt nichts um", A.unendlichSaetzeUebernehmen(null, []) === null);

/* ---------- 3) Verdrahtung: Abschluss ---------- */
const abschluss = grabFn("trainingAbschliessen");
pruefe("der Eintrag merkt sich seinen Modus", abschluss.includes('eintrag.modus = "unendlich"'));
pruefe("die Bestwerte werden VOR dem Eintragen geholt",
  abschluss.indexOf("unendlichBest(") < abschluss.indexOf("protokoll.push"));
pruefe("die Satz-Zahl wandert in den ECHTEN Plan",
  abschluss.includes("unendlichSaetzeUebernehmen(sitzung.daten.plaene.find(p => p.id === plan.id)"));
const zeigen = grabFn("abschlussZeigen");
pruefe("die Abschluss-Seite nennt den Bestwert", zeigen.includes("Bestwert"));
pruefe("und meldet, wenn er faellt", zeigen.includes("neuer Bestwert"));
/* Die Rueckfrage: nur mit Anlass, nur auf Ja, nur die Wiederholungen. */
pruefe("nach einem neuen Bestwert wird gefragt", zeigen.includes("wdhAnhebenFragen(plan)"));
pruefe("ohne neuen Bestwert nicht", /if\(gespeichert && neuerBest\)/.test(zeigen));
const fragen = grabFn("wdhAnhebenFragen");
pruefe("gefragt wird wirklich", fragen.includes("frage("));
pruefe("bei Nein passiert nichts", fragen.includes("if(!ja) return"));
pruefe("angehoben wird um genau eine Wiederholung", fragen.includes("u.wdh + 1"));
pruefe("und nie ueber das eigene Maximum", fragen.includes("u.wdhMax"));
pruefe("das Gewicht bleibt aussen vor", !fragen.includes("u.gewicht"));
/* Vor dem Start steht das Ziel. */
const vorschau = grabFn("vorschauZeichnen");
pruefe("die Vorschau zeigt Ziel und Bestwert", vorschau.includes("unendlichBest(") && vorschau.includes("Bestwert"));
pruefe("das Ziel ist eine Runde mehr", vorschau.includes("(best + 1)"));
pruefe("ohne Bestwert wird nichts erfunden", vorschau.includes('"Runde " + schritt.satz'));

/* ---------- 4) Eine Faerbung statt zwei ---------- */
const koerper = grabFn("koerperVorschauZeichnen");
pruefe("die Statistik-Figur zeigt die Auslastung", koerper.includes("miniLastFigur("));
pruefe("nicht mehr die Haeufigkeit", !koerper.includes("miniHeatFigur("));
pruefe("die Muskeln kommen aus derselben Last-Rechnung", koerper.includes("muskelLast("));
pruefe("die Farben aus dem Belastungs-Modell", koerper.includes("auslastungsQuoten()"));
const figur = grabFn("miniLastFigur");
pruefe("gemalt wird mit derselben Funktion wie die volle Karte", figur.includes("muskelnAufCanvas("));
/* Das letzte Argument ist `quoten` — daran haengt die Farbe (lastFarbe). */
pruefe("die Quoten werden durchgereicht", /muskelnAufCanvas\(.*,\s*quoten\)/.test(figur));
/* Die Heatmap ist umgezogen, nicht geloescht. */
pruefe("die Heatmap gibt es weiterhin",
  src.includes("function miniHeatFigur(") && src.includes("function muskelHeatmapZeichnen("));
pruefe("und sie wird weiterhin gerufen",
  (src.match(/muskelHeatmapZeichnen\(/g) || []).length >= 2);

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("APP_VERSION passt zu VERSION", (() => {
  const [, mi, pa] = /const VERSION = "([\d.]+)";/.exec(src)[1].split(".");
  return Number(/const APP_VERSION = (\d+);/.exec(src)[1]) === Number(mi) * 1000 + Number(pa);
})());
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.226.0", punkte:['));
pruefe("die Zusammenfassung reicht bis zur aktuellen Version",
  /stand:"0\.220 – 0\.22[6-9]/.test(src));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
