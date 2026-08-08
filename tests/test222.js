/* v222-Test: Zwei Nachtraege zum Unendlichkeitsmodus. (60. Runde, Staffel C.)

   Beide korrigieren eine Entscheidung aus v221 — vom Nutzer besser beantwortet:
   1. DEHNEN GIBT ES DOCH, UND ZWAR NACH DER ZEIT. v221 hatte es gesperrt („haengt
      hinter einem Kern, der nie endet"). Es haengt aber nicht am Kern, sondern an
      der UHR: Gong -> Dehn-Programm -> Abschluss-Seite.
   2. KEINE SATZ-FELDER IM MODUS. Wo die Runde die Satz-Zahl bestimmt, ist ein
      Feld „Saetze" eine Grenze, die es nicht gibt.
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

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Dehnen nach Ablauf der Zeit ---------- */
const ende = grabFn("zeitAbgelaufen");
pruefe("nach dem Gong wird das Dehn-Programm gebaut",
  ende.includes("bonusSchritte(bonusAuswahl(DEHNEN"));
pruefe("nur wenn der Plan es traegt", ende.includes("lauf.plan.dehnen"));
pruefe("es ersetzt die Runden-Liste", /lauf\.schritte = dehn;\s*\n\s*lauf\.index = 0;/.test(ende));
pruefe("und wird angesagt", ende.includes("Jetzt noch dehnen"));
pruefe("ohne Dehnen geht es direkt zum Abschluss",
  ende.trim().endsWith("trainingAbschliessen();\n}") || ende.includes("  trainingAbschliessen();\n}"));
/* Die Uhr laeuft nicht mehr, also haengt auch keine Runde mehr an. */
pruefe("nach dem Gong laeuft der Modus nicht mehr",
  grabFn("unendlichLaeuft").includes("!lauf.zeitVorbei"));
/* Und das Ende des Dehn-Programms fuehrt auf die Abschluss-Seite. */
const betreten = grabFn("schrittBetreten");
pruefe("nach dem letzten Dehn-Schritt kommt der Abschluss",
  betreten.includes("else if(lauf.zeitVorbei){ trainingAbschliessen(); return; }"));
pruefe("und NICHT die Bewertung",
  betreten.indexOf("lauf.zeitVorbei){ trainingAbschliessen()") <
  betreten.indexOf("else { trainingBeenden(); return; }"));
/* Der Abschluss raeumt auf — er ist jetzt die einzige Stelle dafuer. */
const abschluss = grabFn("trainingAbschliessen");
["gesamtUhrStoppen()", "bildschirmFreigeben()", "trainingMerkerLoeschen()"].forEach(fn =>
  pruefe("der Abschluss ruft " + fn, abschluss.includes(fn)));
pruefe("er laeuft nicht ins Leere, wenn kein Lauf mehr da ist",
  abschluss.includes("if(!lauf) return"));

/* Der Schalter ist im Editor wieder frei. */
const zeichnen = grabFn("editorZeichnen");
pruefe("der Dehnen-Schalter ist nicht mehr gesperrt", zeichnen.includes("dehnKnopf.disabled = false"));
pruefe("und wird nicht mehr heimlich ausgeschaltet",
  !grabFn("editorSpeichern").includes("editorPlan.dehnen = false"));

/* ---------- 2) Keine Satz-Felder im Modus ---------- */
pruefe("das Feld Saetze haengt am Modus", zeichnen.includes('const saetzeFeld = unendlich ? ""'));
pruefe("beide Uebungsarten nutzen dasselbe Feld",
  (zeichnen.match(/basis = saetzeFeld/g) || []).length === 2);
pruefe("kein hartes Satz-Feld mehr in der Karte",
  !zeichnen.includes('zahlfeld(i,"saetze","Sätze",u.saetze,1) +'));
pruefe("auch die Kurzzeile laesst die Satz-Zahl weg",
  zeichnen.includes('const vorne = unendlich ? "" : u.saetze + " × "'));
/* Was BLEIBT: Wiederholungen, Gewicht und Pause gelten weiter. */
pruefe("Wiederholungen bleiben", zeichnen.includes('zahlfeld(i,"wdh","Wiederholungen"'));
pruefe("die Pause bleibt", zeichnen.includes('zahlfeld(i,"pause","Pause (s)"'));
/* Der Satz-Zaehler selbst zaehlt weiterhin die vollen Durchgaenge: `satz` ist
   die Rundennummer (v221) — das bleibt die Zusage, hier nur gegengeprueft. */
pruefe("ein Satz je Uebung und Runde",
  grabFn("unendlichRunde").includes("satz:runde"));

/* ---------- 3) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v222",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 222);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.222", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
