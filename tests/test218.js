/* v218-Test: Der Stift bearbeitet das GANZE Training. (59. Runde.)

   Die Zusagen:
   1. NACHBESSERN STATT NEU ANFANGEN. Datum, Dauer, Notiz, Sätze (Anzahl, Wdh,
      Gewicht, Zeit) und bei Aktivitäten Strecke und Messwert lassen sich ändern.
   2. EIN SATZ MEHR IST EIN SATZ MEHR. `neuerSatzAus` kopiert den letzten — wer
      „doch noch einen gemacht" hat, tippt keine Zahlen neu; `saetzeNummerieren`
      haelt die Reihenfolge sauber.
   3. ES WIRKT SOFORT UEBERALL. Gespeichert wird ins Original, danach zeichnet
      `fortschrittNeuZeichnen` alles Abgeleitete neu (v214-Regel).
   4. UND WAS ES NICHT TUT: die Plan-Progression anfassen (v70-Linie).
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
  grabFn("neuerSatzAus"),
  grabFn("saetzeNummerieren"),
  grabFn("eintragWerteUebernehmen"),
  "module.exports = { neuerSatzAus, saetzeNummerieren, eintragWerteUebernehmen };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Ein Satz mehr ---------- */
const saetze = [
  { uebungId:null, name:"Klimmzüge", modus:"wdh", satz:1, wdh:8, gewicht:0, note:3 },
  { uebungId:null, name:"Klimmzüge", modus:"wdh", satz:2, wdh:7, gewicht:0, note:4 }
];
const neu = A.neuerSatzAus(saetze, "Klimmzüge");
pruefe("der neue Satz uebernimmt die Uebung", neu.name === "Klimmzüge");
pruefe("und die Zahlen des letzten", neu.wdh === 7 && neu.gewicht === 0 && neu.modus === "wdh");
pruefe("er ist der naechste in der Reihe", neu.satz === 3);
/* Die Note gehoert dem alten Satz — sie wurde fuer IHN vergeben. */
pruefe("die Bewertung wird nicht mitkopiert", neu.note === null);
pruefe("der letzte Satz bleibt unberuehrt", saetze[1].wdh === 7 && saetze[1].note === 4);

const leer = A.neuerSatzAus([], "Kniebeugen");
pruefe("ohne Vorlage entsteht ein brauchbarer Satz",
  leer.name === "Kniebeugen" && leer.satz === 1 && leer.wdh === 10 && leer.modus === "wdh");
pruefe("ohne alles bricht nichts", A.neuerSatzAus(null, "").satz === 1);

/* ---------- 2) Nummerierung ---------- */
const durcheinander = [{ satz:5, wdh:8 }, { satz:2, wdh:7 }, { satz:9, wdh:6 }];
const nummeriert = A.saetzeNummerieren(durcheinander);
pruefe("die Saetze werden durchnummeriert",
  nummeriert.map(s => s.satz).join(",") === "1,2,3");
pruefe("die Reihenfolge bleibt, wie sie ist", nummeriert.map(s => s.wdh).join(",") === "8,7,6");
pruefe("das Original bleibt unberuehrt", durcheinander[0].satz === 5);
pruefe("leere Liste bleibt leer", A.saetzeNummerieren([]).length === 0 && A.saetzeNummerieren(null).length === 0);

/* ---------- 3) Werte uebernehmen ---------- */
const heute = "2026-08-14";
const eintrag = { id:"e1", datum:"2026-08-12", typ:"kraft", sportart:"kraft",
                  plan:"Klimmzüge", dauerMin:6, notiz:"", saetze: saetze.slice() };
const fehlerText = A.eintragWerteUebernehmen(eintrag,
  { datum:"2026-08-13", dauerMin:"14", notiz:"  ging gut  ", saetze: saetze.concat([neu]) }, heute);
pruefe("die Uebernahme meldet keinen Fehler", fehlerText === "");
pruefe("das Datum ist neu", eintrag.datum === "2026-08-13");
pruefe("die Dauer ist eine Zahl, keine Zeichenkette", eintrag.dauerMin === 14);
pruefe("die Notiz ist getrimmt", eintrag.notiz === "ging gut");
pruefe("der dritte Satz ist drin und richtig nummeriert",
  eintrag.saetze.length === 3 && eintrag.saetze[2].satz === 3);

/* Die Wachen. */
pruefe("ohne Datum passiert nichts",
  A.eintragWerteUebernehmen({}, { dauerMin:10 }, heute).length > 0);
pruefe("ein Datum in der Zukunft wird abgewiesen",
  A.eintragWerteUebernehmen({}, { datum:"2026-09-01", dauerMin:10 }, heute).indexOf("Zukunft") >= 0);
pruefe("eine unsinnige Dauer wird abgewiesen",
  A.eintragWerteUebernehmen({}, { datum:heute, dauerMin:"viel" }, heute).length > 0);
pruefe("eine Dauer von 0 ist erlaubt (abgehaktes Training)",
  A.eintragWerteUebernehmen({ typ:"kraft" }, { datum:heute, dauerMin:"0" }, heute) === "");

/* Aktivitaeten: Strecke und Messwert. */
const lauf = { id:"e2", datum:"2026-08-10", typ:"aktivitaet", sportart:"laufen",
               plan:"Laufen", dauerMin:30, strecke:5, messwert:null, saetze:[] };
/* Komma-Zahlen sind auf einem deutschen iPhone der Normalfall — beide Formen
   muessen ankommen, sonst stuende nach dem Bearbeiten 0 km da. */
A.eintragWerteUebernehmen(lauf, { datum:"2026-08-10", dauerMin:"34", strecke:"6,5", notiz:"" }, heute);
pruefe("die Strecke kommt mit Komma an", lauf.strecke === 6.5);
A.eintragWerteUebernehmen(lauf, { datum:"2026-08-10", dauerMin:"34", strecke:"7.25", notiz:"" }, heute);
pruefe("und mit Punkt", lauf.strecke === 7.25);
A.eintragWerteUebernehmen(lauf, { datum:"2026-08-10", dauerMin:"34", strecke:"", notiz:"" }, heute);
pruefe("leer heisst 0, nicht NaN", lauf.strecke === 0);
A.eintragWerteUebernehmen(lauf, { datum:"2026-08-10", dauerMin:"34", strecke:"6,5", messwert:"", notiz:"" }, heute);
pruefe("ein leerer Messwert wird entfernt, nicht auf 0 gesetzt", !("messwert" in lauf));
/* Ein KRAFT-Eintrag bekommt keine Aktivitaets-Felder untergeschoben. */
const kraft = { id:"e3", datum:heute, typ:"kraft", sportart:"kraft", dauerMin:5, saetze:[] };
A.eintragWerteUebernehmen(kraft, { datum:heute, dauerMin:"5", strecke:"9", messwert:"7a", notiz:"" }, heute);
pruefe("Kraft bleibt ohne Strecke und Messwert",
  kraft.strecke === undefined && kraft.messwert === undefined);

/* ---------- 4) Verdrahtung ---------- */
pruefe("die Ansicht gibt es", src.includes('id="view-eintrag"'));
pruefe("sie ist ab Stufe 4 erlaubt (wie der Verlauf)", /"view-eintrag": 4/.test(src));
const oeffnen = grabFn("eintragBearbeiten");
pruefe("der Stift oeffnet das Formular", oeffnen.includes('zeige("view-eintrag")'));
pruefe("gearbeitet wird auf einer KOPIE", oeffnen.includes("JSON.parse(JSON.stringify(e))"));
const speichern = grabFn("eintragFormSpeichern");
pruefe("gespeichert wird ins Original", speichern.includes("sitzung.daten.protokoll.find"));
pruefe("mit Pruefung", speichern.includes("eintragWerteUebernehmen("));
pruefe("danach ist das Protokoll wieder nach Datum sortiert", speichern.includes("protokoll.sort("));
pruefe("und alles Abgeleitete wird neu gerechnet", speichern.includes("fortschrittNeuZeichnen()"));
pruefe("die Liste im Verlauf ruft den Stift weiterhin auf",
  /eintragBearbeiten\(\\?'/.test(grabFn("protokollEintragHtml")));
/* Die alte Beschraenkung ist wirklich weg. */
pruefe("kein Menue mit nur Datum und Notiz mehr",
  !oeffnen.includes('text:"Notiz ändern"') && !oeffnen.includes('text:"Datum ändern"'));
/* Und die Grenze bleibt: der Plan wird nicht mit angefasst. */
pruefe("die Plan-Progression bleibt draussen",
  !speichern.includes("zieleAnwenden") && !speichern.includes("progressionAnwenden"));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v218",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 218);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.218", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
