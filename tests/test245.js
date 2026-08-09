/* 0.245.0-Test: Zurueck im Muskel-Check, nichts doppelt fragen, zwei Tabs.

   Die Zusagen:
   1. ZURUECK: der Wizard hat einen Zurueck-Knopf (Haus-Position im Kopf,
      data-zurueck). Versteckt ist er NUR im ersten Schritt nach einem
      Training — dahinter liegt kein Bildschirm mehr. Beim manuellen Start
      fuehrt er von Schritt 1 zurueck auf die Muskelkarte.
   2. KORREKTUR KORRIGIERT WIRKLICH: jede Antwort schreibt BEIDE Arten (die
      gewaehlte mit Wert, die andere mit 0). Vorher blieb nach "Zurueck" die
      alte Art des Tages stehen, weil beschwerdeSetzen nur je Datum/Muskel/ART
      ersetzt. Andere Tage bleiben unangetastet.
   3. NICHT DOPPELT FRAGEN: der manuelle Start ueberspringt Muskeln, die HEUTE
      schon beantwortet wurden, und sagt es ehrlich, wenn dadurch nichts
      uebrig bleibt. Der Einzel-Muskel-Weg (explizite Liste) und der Wizard
      nach dem Training bleiben ungefiltert.
   4. ZWEI TABS: der Muskel-Check ist kein Modus mehr, sondern eine Aktion
      unter der Figur.
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

const HEUTE = "2026-08-10", GESTERN = "2026-08-09";

/* Die ECHTEN Funktionen, alles Drumherum gestubbt — so wird die Korrektur
   nach "Zurueck" wirklich gefahren statt nur im Quelltext gelesen. */
const modul = { exports: {} };
new Function("module", "exports", [
  'const HEUTE = "' + HEUTE + '";',
  grabBlock("MCHECK_ANTWORTEN", "[", "]"),
  grabFn("beschwerdeSetzen"),
  "let mcheck = null, sitzung = null, gezeichnet = 0, karteGeoeffnet = 0;",
  "function heuteAlsText(){ return HEUTE; }",
  "function speichern(){}",
  "function fortschrittNeuZeichnen(){}",
  "function muskelCheckSchritt(){ gezeichnet++; }",
  "function muskelnOeffnen(){ karteGeoeffnet++; }",
  grabFn("muskelCheckAntwort"),
  grabFn("muskelCheckZurueck"),
  "function aufbauen(zustand, daten){ mcheck = zustand; sitzung = { daten }; gezeichnet = 0; karteGeoeffnet = 0; }",
  "function lesen(){ return { mcheck, daten: sitzung && sitzung.daten, gezeichnet, karteGeoeffnet }; }",
  "module.exports = { MCHECK_ANTWORTEN, muskelCheckAntwort, muskelCheckZurueck, aufbauen, lesen };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const stand = (b, muskel, art, datum) =>
  b.filter(e => e.muskel === muskel && e.art === art && e.datum === datum).map(e => e.wert);
const neuerLauf = (muskeln, eintrag) => ({ plan:null, eintrag: eintrag || null, antworten:{}, index:0,
                                           fertig(){}, muskeln });

/* ---------- 1) Antworten schreiben immer BEIDE Arten ---------- */
{
  // Ein Fremd-Eintrag von gestern darf niemals angefasst werden.
  const daten = { beschwerden:[{ datum:GESTERN, muskel:"quadriceps", art:"schmerz", wert:2 }],
                  muskelChecks:{} };
  T.aufbauen(neuerLauf(["quadriceps"]), daten);
  T.muskelCheckAntwort(4);   // Schmerzt stark
  let b = T.lesen().daten.beschwerden;
  pruefe("Schmerzt stark landet als Schmerz-Wert 2", stand(b, "quadriceps", "schmerz", HEUTE)[0] === 2);
  pruefe("und legt keinen Kater-Eintrag an", stand(b, "quadriceps", "kater", HEUTE).length === 0);
  pruefe("der Schritt zaehlt weiter", T.lesen().mcheck.index === 1);
  pruefe("die Stichprobe ist vermerkt", T.lesen().daten.muskelChecks.quadriceps === HEUTE);

  // Zurueck und anders antworten — der Kern der Regression.
  T.muskelCheckZurueck();
  pruefe("Zurueck geht einen Schritt zurueck", T.lesen().mcheck.index === 0);
  // einmal nach der Antwort, einmal nach dem Zurueck
  pruefe("und zeichnet den Schritt neu", T.lesen().gezeichnet === 2);
  T.muskelCheckAntwort(1);   // Zieht leicht
  b = T.lesen().daten.beschwerden;
  pruefe("die Korrektur setzt den Kater", stand(b, "quadriceps", "kater", HEUTE)[0] === 1);
  pruefe("und raeumt den alten Schmerz des Tages weg",
    stand(b, "quadriceps", "schmerz", HEUTE).length === 0);
  pruefe("gestern bleibt unangetastet", stand(b, "quadriceps", "schmerz", GESTERN)[0] === 2);
  pruefe("die gemerkte Antwort ist die neue",
    T.lesen().mcheck.antworten.quadriceps.art === "kater" &&
    T.lesen().mcheck.antworten.quadriceps.wert === 1);
}
{
  const daten = { beschwerden:[], muskelChecks:{} };
  T.aufbauen(neuerLauf(["calves"]), daten);
  T.muskelCheckAntwort(2);   // Zieht stark / Muskelkater
  T.lesen().mcheck.index = 0;
  T.muskelCheckAntwort(0);   // Alles gut
  const b = T.lesen().daten.beschwerden;
  pruefe("Alles gut loescht BEIDE Arten",
    stand(b, "calves", "kater", HEUTE).length === 0 &&
    stand(b, "calves", "schmerz", HEUTE).length === 0);
  pruefe("und merkt die Antwort als leer",
    T.lesen().mcheck.antworten.calves.art === null && T.lesen().mcheck.antworten.calves.wert === 0);
}

/* ---------- 2) Zurueck im ersten Schritt ---------- */
{
  T.aufbauen(neuerLauf(["biceps", "triceps"]), { beschwerden:[], muskelChecks:{} });
  T.muskelCheckZurueck();
  pruefe("im ersten Schritt fuehrt Zurueck auf die Muskelkarte", T.lesen().karteGeoeffnet === 1);
  pruefe("und der Wizard ist beendet", T.lesen().mcheck === null);
  T.muskelCheckZurueck();
  pruefe("ein zweiter Druck tut nichts", T.lesen().karteGeoeffnet === 1);
}

/* ---------- 3) Der Knopf im Markup + wann er versteckt ist ---------- */
pruefe("der Wizard hat einen Zurueck-Knopf an der Haus-Position",
  /id="mcheck-zurueck"[^>]*onclick="muskelCheckZurueck\(\)"[^>]*data-zurueck/.test(src));
{
  const schritt = grabFn("muskelCheckSchritt");
  pruefe("versteckt ist er nur im ersten Schritt NACH einem Training",
    schritt.includes('document.getElementById("mcheck-zurueck").hidden = mcheck.index === 0 && !!mcheck.eintrag'));
  pruefe("die schon gegebene Antwort ist markiert",
    schritt.includes("mcheck.antworten[m]") && schritt.includes("mcheck-gewaehlt"));
}
pruefe("und die Markierung hat ihr CSS", src.includes(".mcheck-gewaehlt{"));

/* ---------- 4) Nicht doppelt fragen ---------- */
{
  const start = grabFn("muskelCheckStarten");
  pruefe("der manuelle Start ueberspringt, was heute schon beantwortet ist",
    start.includes("checks[m] !== heute"));
  pruefe("bleibt dadurch nichts uebrig, sagt er genau das",
    start.includes("schonHeute") && start.includes("Heute schon durch"));
  pruefe("die alte Meldung ohne jede Last bleibt daneben stehen",
    start.includes("wurde kein Muskel belastet und nichts gemeldet"));
  pruefe("eine ausdrueckliche Liste wird NIE gefiltert (Einzel-Muskel-Weg)",
    start.includes("let liste = muskeln") && start.includes("if(!liste){"));
}
pruefe("der Wizard nach dem Training filtert weiter nach Stichprobe, nicht nach heute",
  !grabFn("muskelCheckMuskeln").includes("!== heute") &&
  grabFn("muskelCheckMuskeln").includes("tagDifferenz(checks[m], heute) >= intervall"));

/* ---------- 5) Zwei Tabs, der Check ist eine Aktion ---------- */
pruefe("der Muskel-Check sitzt nicht mehr in der Tab-Reihe",
  !src.includes('id="muskel-modus-check"'));
pruefe("es gibt ihn als eigenen Knopf",
  src.includes('id="muskel-check-knopf"') && src.includes("Muskel-Check starten"));
pruefe("und der steht hinter den Figuren, nicht davor",
  src.indexOf('id="muskel-check-knopf"') > src.indexOf('id="muskel-figuren"'));
pruefe("die beiden echten Ansichten sind geblieben",
  src.includes('id="muskel-modus-heat"') && src.includes('id="muskel-modus-info"'));

/* ---------- 6) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.245.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 245000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.245.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
