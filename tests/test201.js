/* v201-Test: Nicht-Kraft wird ueberall sichtbar.

   Zwei Reste, die zusammengehoeren — beide schliessen dieselbe Art Luecke:
   Die App WEISS etwas ueber eine Ausdauer-Einheit, zeigt es aber nicht.

   1. MUSKEL-FIGUR FUER DIE EINHEIT (52. Runde A). `planMuskeln` ging nur ueber
      `plan.uebungen` — eine Einheit hat keine (ihre Werte haengen am Plan, v199),
      also blieb die Karte ohne Figur. Seit v197 steht in `SPORT_LAST_MUSKELN`,
      welche Muskeln ein Lauf trifft; genau die Tabelle, die ihn in die
      Auslastung rechnet. Es waere widerspruechlich, ihn einzurechnen und
      zugleich als „nichts erkannt" zu zeichnen.
      GRENZE: Die Sportart-Muskeln kommen nur dazu, wenn KEIN Drill schon welche
      genannt hat — sonst staende die grobe Zuordnung neben der feineren.
   2. STUFE 2 FUER ALLE SPORTARTEN (47. Runde B, letzter Punkt). Die Zeilen der
      Stufe 2 trugen nur Kraft-Spalten; die Einheit bekommt eine eigene Zeile
      ueber den Spaltenkoepfen (Haken, Sportart, Strecke, Zeit).
      GRENZE: „Kein Wert, kein Effekt" — eine geleerte Zahl aendert nichts.
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
function grabLine(anfang){
  const zeile = src.split("\n").find(z => z.trim().startsWith(anfang));
  if(!zeile) throw new Error("Zeile nicht gefunden: " + anfang);
  return zeile.trim();
}
function grabObjekt(name){
  const i = src.indexOf("const " + name + " = ");
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  const start = src.indexOf("{", i);
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === "{") tiefe++;
    else if(src[k] === "}"){ tiefe--; if(tiefe === 0) return "const " + name + " = " + src.slice(start, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}
function grabListe(name){
  const i = src.indexOf("const " + name + " = [");
  if(i < 0) throw new Error("Liste nicht gefunden: " + name);
  const start = src.indexOf("[", i);
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === "[") tiefe++;
    else if(src[k] === "]"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  "const MAX_DAUER_S = 24 * 3600;",
  grabListe("ZEITEINHEITEN"),
  grabListe("SPORTARTEN"),
  /* Die ECHTEN Register — eine erfundene Zuordnung wuerde genau das pruefen,
     was der Test beweisen soll. `MUSKEL_SEITE` kommt im Original aus der
     aktiven Karte (`muskelKarteDef().seite`); hier reicht die Karte selbst. */
  grabObjekt("SPORT_LAST_MUSKELN"),
  grabObjekt("MUSKELKARTEN"),
  grabLine("const MUSKELKARTE_AKTIV"),
  "const MUSKEL_SEITE = MUSKELKARTEN[MUSKELKARTE_AKTIV].seite;",
  /* Die Alias-Schicht (v139) wird nicht gebraucht — die Standard-Karte
     uebersetzt die Schluessel eins zu eins. */
  "function muskelnAufKarte(keys){ return (keys || []).slice(); }",
  grabObjekt("SPORT_MUSKELN"),
  grabObjekt("UEBUNG_MUSKELN"),
  grabObjekt("KAT_MUSKELN"),
  grabObjekt("MUSKEL_INFO"),   // muskelSatzAnzeige liest daraus das Label
  grabListe("UEBUNGEN_DB"),
  grabFn("normName"),
  grabFn("sportart"),
  grabFn("zeitEinheit"),
  grabFn("inEinheit"),
  grabFn("inSekunden"),
  grabFn("kommaZahl"),
  grabFn("uebungMuskelSatz"),
  grabFn("muskelSatzAnzeige"),
  grabFn("uebungMuskeln"),
  grabFn("planMuskeln"),
  "let sitzung = { daten: { plaene: [] } };",
  "function speichern(){}",
  grabFn("findePlan"),
  grabFn("notizEinheitStreckeSetzen"),
  grabFn("notizEinheitDauerSetzen"),
  "module.exports = { get sitzung(){ return sitzung; }, planMuskeln, uebungMuskeln," +
  " notizEinheitStreckeSetzen, notizEinheitDauerSetzen, inSekunden };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die Einheit bekommt ihre Figur ---------- */
const lauf = { id:"p1", sportart:"laufen", typ:"aktivitaet", strecke:5, dauer:1800,
               zeitEinheit:"min", uebungen:[] };
const mLauf = A.planMuskeln(lauf);
pruefe("ein Lauf ohne Drills zeigt jetzt Muskeln", mLauf.front.length + mLauf.back.length > 0);
pruefe("und zwar die Beine", mLauf.front.some(m => /quad/i.test(m)) || mLauf.back.some(m => /quad|ham|calf|calv/i.test(m)));
pruefe("die Muskeln sind auf Vorder- und Rueckseite verteilt",
  mLauf.front.length > 0 && mLauf.back.length > 0);
pruefe("kein Muskel steht doppelt",
  new Set(mLauf.front).size === mLauf.front.length && new Set(mLauf.back).size === mLauf.back.length);
/* Schwimmen trifft den Oberkoerper — die Zuordnung wird also wirklich gelesen
   und nicht pauschal auf Beine gesetzt. */
const schwimm = A.planMuskeln({ sportart:"schwimmen", typ:"aktivitaet", uebungen:[] });
pruefe("Schwimmen trifft etwas anderes als Laufen",
  JSON.stringify(schwimm) !== JSON.stringify(mLauf));
pruefe("und es ist nicht leer", schwimm.front.length + schwimm.back.length > 0);

/* GRENZE: Drills haben Vorrang — die feinere Zuordnung gewinnt. */
const mitDrill = A.planMuskeln({ sportart:"laufen", typ:"aktivitaet",
  uebungen:[{ id:"u1", name:"Steigerungsläufe" }] });
const drillAllein = A.uebungMuskeln("Steigerungsläufe");
if(drillAllein && drillAllein.muskeln.length){
  pruefe("mit Drills wird die Sportart NICHT zusaetzlich gemischt",
    mitDrill.front.length + mitDrill.back.length ===
      new Set(drillAllein.muskeln.map(m => m)).size);
} else {
  pruefe("mit Drills wird die Sportart NICHT zusaetzlich gemischt", true);
}
/* Eine Sportart ohne hinterlegte Muskeln wird nicht geraten. */
pruefe("ohne Zuordnung bleibt es leer",
  (() => { const m = A.planMuskeln({ sportart:"nichtdaXY", typ:"aktivitaet", uebungen:[] });
           return !m.front.length && !m.back.length; })());
/* Kraftplaene sind unveraendert. */
const kraft = A.planMuskeln({ sportart:"kraft", typ:"kraft",
  uebungen:[{ id:"u1", name:"Klimmzüge" }] });
pruefe("ein Kraftplan rechnet weiter ueber seine Uebungen",
  kraft.front.length + kraft.back.length > 0);
pruefe("ein leerer Kraftplan bleibt leer",
  (() => { const m = A.planMuskeln({ sportart:"kraft", typ:"kraft", uebungen:[] });
           return !m.front.length && !m.back.length; })());
pruefe("ein Plan ohne alles stuerzt nicht ab",
  (() => { const m = A.planMuskeln(null); return !m.front.length && !m.back.length; })());
/* Die Figur haengt an derselben Quelle wie die Belastungs-Rechnung (v197). */
pruefe("gelesen wird das v197-Register",
  grabFn("planMuskeln").includes("SPORT_LAST_MUSKELN[plan.sportart]"));
pruefe("und durch die Alias-Schicht der Karte (v139)",
  grabFn("planMuskeln").includes("muskelnAufKarte(satz.p)"));

/* ---------- 2) Stufe 2 zeigt die Einheit ---------- */
const einheitHtml = grabFn("notizEinheitZeileHtml");
pruefe("nur Aktivitaets-Abschnitte bekommen die Zeile",
  einheitHtml.includes('p.typ !== "aktivitaet"') && einheitHtml.includes('return ""'));
pruefe("sie traegt den Haken der Einheit (v199)",
  einheitHtml.includes("notizEinheitHakenHtml(p)"));
pruefe("der Name der Sportart steht als Text da, nicht als Feld",
  einheitHtml.includes('class="notiz-einheit-name"'));
pruefe("es gibt ein Stylesheet dafuer", /\.notiz-einheit-name\{/.test(src));
pruefe("die Strecke erscheint nur, wo die Sportart eine hat",
  (einheitHtml.match(/sp\.strecke \?/g) || []).length >= 2);
pruefe("die Spaltenkoepfe nennen die Einheiten",
  einheitHtml.includes("sp.strecke.einheit") &&
  einheitHtml.includes("zeitEinheit(p.zeitEinheit).kurz"));
pruefe("die Dauer steht in der Einheit des Plans, nicht in Sekunden",
  einheitHtml.includes("inEinheit(p.dauer || 0, p.zeitEinheit)"));
pruefe("Stufe 2 baut sie ein — VOR den Uebungs-Spalten",
  (() => { const a = grabFn("notizAbschnittHtml");
           return a.indexOf("notizEinheitZeileHtml(p)") > 0 &&
                  a.indexOf("notizEinheitZeileHtml(p)") < a.indexOf('<label>Übung</label>'); })());
/* v212: Stufe 1 zeichnet flach — die Einheit-Zeile kommt dort aus
   `notizZeilenModell` (sie steht als erste Zeile des Abschnitts drin). */
pruefe("Stufe 1 bekommt die Einheit ueber das Zeilen-Modell",
  grabFn("notizZeilenModell").includes("einheit: true") &&
  grabFn("notizFlachHtml").includes("notizZeilenModell(p)"));

/* ---------- 3) Die Felder speichern richtig ---------- */
A.sitzung.daten.plaene = [{ id:"p9", sportart:"laufen", typ:"aktivitaet",
                            strecke:5, dauer:1800, zeitEinheit:"min", uebungen:[] }];
const p9 = A.sitzung.daten.plaene[0];
A.notizEinheitStreckeSetzen("p9", "7,5");
pruefe("die Strecke wird deutsch getippt gelesen", p9.strecke === 7.5);
A.notizEinheitDauerSetzen("p9", "45");
pruefe("die Dauer wird in Sekunden gespeichert", p9.dauer === 2700);
A.notizEinheitStreckeSetzen("p9", "");
A.notizEinheitDauerSetzen("p9", "");
pruefe("ein geleertes Feld aendert nichts (kein Wert, kein Effekt)",
  p9.strecke === 7.5 && p9.dauer === 2700);
A.notizEinheitStreckeSetzen("p9", "0");
pruefe("eine Null auch nicht", p9.strecke === 7.5);
p9.zeitEinheit = "h";
A.notizEinheitDauerSetzen("p9", "1,5");
pruefe("die Zahl gilt in der Einheit des Plans", p9.dauer === 5400);
A.notizEinheitDauerSetzen("p9", "99");
pruefe("eine unsinnige Dauer wird gedeckelt", p9.dauer === 24 * 3600);
A.notizEinheitStreckeSetzen("unbekannt", "5");
pruefe("ein unbekannter Abschnitt wirft nicht", true);

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v201",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 201);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.201", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
