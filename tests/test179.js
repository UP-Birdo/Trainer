/* v179-Test: Muskel-Figur auf den Karten des Uebungs-Pickers.

   Der letzte offene Punkt aus „Uebungs-Bauen entruempeln" (Nutzer-Wunsch:
   Uebungen als Karteikarten MIT Muskel-Bild statt roher Dropdowns). Seit v91
   fehlte genau die Figur — mit der Begruendung „Perf", und die war berechtigt:
   `muskelnAufCanvas` legt je Figur einen vollen RGBA-Puffer an.

   Geprueft wird:
   1. Die Karte traegt die Figur — aus DERSELBEN Quelle wie ueberall
      (`miniFigurHtml`), nicht als zweite Bauweise.
   2. Uebungen ohne hinterlegte Muskeln bekommen KEINEN leeren Kasten.
   3. Gezeichnet wird verzoegert, und es gibt immer nur EINEN Beobachter.
   4. Ohne IntersectionObserver wird sofort alles gezeichnet (lieber langsam
      als leer).
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

/* v216: `miniFigurHtml` gibt der Box das Seitenverhaeltnis ihres Bildes mit —
   dafuer braucht es die Maße aus der aktiven Karte. Hier reicht ein leerer
   Satz: Diese Datei prueft das verzoegerte Zeichnen, nicht die Maße (das tut
   `test216`), und `figurVerhaeltnis` liefert ohne Eintrag sauber "". */
const modul = { exports: {} };
new Function("module", "exports", [
  "const MUSKEL_VIEWS = {};",
  grabFn("figurVerhaeltnis"),
  grabFn("miniFigurHtml"),
  "module.exports = { miniFigurHtml };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const karte = grabFn("pickerKarteHtml");
const zeichnen = grabFn("pickerKartenZeichnen");
const lazy = grabFn("miniFigurenLazy");

/* ---------- 1) Die Karte traegt die Figur, aus der einen Quelle ---------- */
pruefe("die Picker-Karte baut eine Figur ein", /miniFigurHtml\(info\)/.test(karte));
pruefe("sie nutzt dieselbe Quelle wie alle anderen Stellen",
  /function miniFigurHtml\(/.test(src));
pruefe("die Karte baut die Figur NICHT selbst",
  !/mini-figur/.test(karte) && !/data-mf-ansicht/.test(karte));
pruefe("die Figur steht zwischen Text und Plus (wie in der Vorschau)",
  karte.indexOf('class="text"') < karte.indexOf("miniFigurHtml(info)") &&
  karte.indexOf("miniFigurHtml(info)") < karte.indexOf('class="pfeil"'));
pruefe("die Muskel-Info wird weiterhin fuer die Unterzeile genutzt",
  /const info = uebungMuskeln\(name\)/.test(karte) && /info\.label/.test(karte));

/* ---------- 2) Kein leerer Kasten ohne Muskeln ---------- */
pruefe("ohne Info kommt gar nichts", A.miniFigurHtml(null) === "");
pruefe("mit leerer Muskel-Liste auch nicht",
  A.miniFigurHtml({ ansicht:"front", muskeln:[] }) === "");
pruefe("mit Muskeln kommt ein Figur-Element",
  /^<div class="mini-figur"/.test(A.miniFigurHtml({ ansicht:"front", muskeln:["pectoral"] })));
pruefe("die Ansicht steht als Datenfeld dabei",
  /data-mf-ansicht="front"/.test(A.miniFigurHtml({ ansicht:"front", muskeln:["pectoral"] })));

/* ---------- 3) Verzoegert gezeichnet ---------- */
pruefe("die Liste zeichnet verzoegert nach", /miniFigurenLazy\("#picker-karten"\)/.test(zeichnen));
pruefe("und zwar NACH dem Setzen des HTML",
  zeichnen.indexOf("ziel.innerHTML") < zeichnen.indexOf("miniFigurenLazy"));
pruefe("der Beobachter zeichnet beim Sichtbarwerden",
  /IntersectionObserver/.test(lazy) && /isIntersecting/.test(lazy));
pruefe("jede Figur wird genau EINMAL gezeichnet", /unobserve\(e\.target\)/.test(lazy));
pruefe("mit Vorlauf, damit sie beim Scrollen schon fertig ist",
  /rootMargin: "200px"/.test(lazy));
pruefe("der Beobachter haengt am scrollenden Bereich",
  /root: document\.getElementById\("inhalt"\)/.test(lazy));
pruefe("die Quoten werden EINMAL je Lauf geholt, nicht je Figur",
  (lazy.match(/auslastungsQuoten\(\)/g) || []).length === 1);
pruefe("gezeichnet wird ueber dieselbe Funktion wie sonst",
  /miniMuskelFigur\(el, el\.dataset\.mfAnsicht/.test(lazy));

/* ---------- 4) Immer nur EIN Beobachter ---------- */
pruefe("es gibt einen Merker dafuer", /let miniFigurBeobachter = null;/.test(src));
pruefe("der vorige wird beim Neuzeichnen abgeloest",
  /if\(miniFigurBeobachter\)\{ miniFigurBeobachter\.disconnect\(\); miniFigurBeobachter = null; \}/.test(lazy));
pruefe("ohne Figuren wird gar keiner angelegt",
  /if\(!figuren\.length\) return;/.test(lazy) &&
  lazy.indexOf("if(!figuren.length) return;") < lazy.indexOf("new IntersectionObserver"));

/* ---------- 5) Rueckfall ohne IntersectionObserver ---------- */
pruefe("ohne Beobachter wird sofort alles gezeichnet",
  /typeof IntersectionObserver !== "function"\)\{ miniFigurenZeichnen\(selektor\); return; \}/.test(lazy));
pruefe("die alte Sofort-Funktion bleibt unveraendert bestehen",
  /function miniFigurenZeichnen\(selektor\)\{/.test(src));
/* Die anderen Listen behalten das Sofort-Zeichnen: Sie sind kurz (Vorschau,
   Sportart-Drills, Plan-Karten) und sollen nicht auf einen Beobachter warten. */
["#vorschau-liste", "#sportart-inhalt"].forEach(sel =>
  pruefe("die Liste " + sel + " zeichnet weiterhin sofort",
    src.indexOf('miniFigurenZeichnen("' + sel + '")') > 0));

/* ---------- 6) Das Aussehen ---------- */
pruefe("die Figur hat auf der Karte eine eigene Breite",
  /\.picker-karte \.mini-figur\{width:30px/.test(src));
pruefe("sie schrumpft nicht weg", /\.picker-karte \.mini-figur\{[^}]*flex:0 0 auto/.test(src));

/* ---------- 7) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v179",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 179);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.179", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
