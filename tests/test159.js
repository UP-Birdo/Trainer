/* v159-Test: Gewicht im Training anpassbar + der Plan zieht nach.

   Zwei zusammengehoerende Teile:
   1) `sollVerfehlt` kennt jetzt ZWEI Arten, das Soll zu verfehlen — zu wenige
      Wiederholungen ODER zu wenig Gewicht (das war bis v158 gar nicht moeglich).
   2) `progressionAnwenden` uebernimmt beim ZWEITEN Mal in Folge das wirklich
      Geschaffte; einmal reicht nicht (ein schlechter Tag schreibt den Plan nicht um).
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
  grabFn("begrenzen"),
  grabFn("stufeSenken"),   // v207: der Deload senkt ueber diese Funktion
  grabFn("sollVerfehlt"),
  grabFn("effektiveNote"),
  grabFn("progressionAnwenden"),
  grabFn("gewichtSchrittFuer"),
  grabFn("hatGewicht"),
  "module.exports = { sollVerfehlt, effektiveNote, progressionAnwenden, gewichtSchrittFuer, hatGewicht };"
].join("\n"))(modul, modul.exports);
const { sollVerfehlt, effektiveNote, progressionAnwenden, gewichtSchrittFuer, hatGewicht } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const uebung = (ex) => Object.assign({
  id:"u1", modus:"wdh", wdh:10, wdhMin:6, wdhMax:14,
  gewicht:40, gewichtSchritt:2.5, pause:90, notenHistorie:[]
}, ex || {});
const satz = (wdh, gewicht, ex) => Object.assign({ uebungId:"u1", wdh, gewicht }, ex || {});

/* ---------- 1) sollVerfehlt: zwei Arten, das Soll zu verfehlen ---------- */
pruefe("Soll gehalten -> null", sollVerfehlt(uebung(), [satz(10,40), satz(10,40)]) === null);
pruefe("mehr geschafft -> null", sollVerfehlt(uebung(), [satz(12,45)]) === null);
pruefe("zu wenige Wdh wird erkannt",
  JSON.stringify(sollVerfehlt(uebung(), [satz(10,40), satz(8,40)])) === JSON.stringify({ minWdh:8, minGewicht:40 }));
pruefe("zu wenig GEWICHT wird erkannt (neu in v159)",
  JSON.stringify(sollVerfehlt(uebung(), [satz(10,30)])) === JSON.stringify({ minWdh:10, minGewicht:30 }));
pruefe("volle Wdh mit halbem Gewicht ist KEIN Erfolg", sollVerfehlt(uebung(), [satz(10,20)]) !== null);
pruefe("Koerpergewichts-Uebung: Gewicht zaehlt nicht mit",
  sollVerfehlt(uebung({ gewicht:0, gewichtSchritt:0 }), [satz(10,0)]) === null);
pruefe("Dropsaetze bleiben aussen vor (v137)",
  sollVerfehlt(uebung(), [satz(10,40), satz(5,20,{ drop:true })]) === null);
pruefe("Zeit-Uebungen haben hier nichts zu suchen",
  sollVerfehlt(uebung({ modus:"zeit" }), [satz(3,0)]) === null);
pruefe("ohne Saetze -> null", sollVerfehlt(uebung(), []) === null && sollVerfehlt(uebung(), null) === null);
pruefe("fremde Uebung zaehlt nicht", sollVerfehlt(uebung(), [{ uebungId:"u2", wdh:2, gewicht:5 }]) === null);

/* ---------- 2) effektiveNote nimmt das Gewicht mit ---------- */
pruefe("zu wenig Gewicht bremst die Note auf 4",
  effektiveNote(uebung(), 1, [satz(10,30)]) === 4);
pruefe("zu wenige Wdh bremst weiter", effektiveNote(uebung(), 1, [satz(8,40)]) === 4);
pruefe("unter dem Minimum bleibt 5", effektiveNote(uebung(), 1, [satz(4,40)]) === 5);
pruefe("Soll gehalten laesst die Note in Ruhe", effektiveNote(uebung(), 1, [satz(10,40)]) === 1);
pruefe("eine schlechtere manuelle Note gewinnt", effektiveNote(uebung(), 5, [satz(10,40)]) === 5);

/* ---------- 3) Der Plan zieht erst beim ZWEITEN Mal nach ---------- */
const einmal = progressionAnwenden(uebung(), 4, { minWdh:8, minGewicht:40 });
pruefe("einmal unter Soll aendert die Wdh NICHT", einmal.wdh === 10);
pruefe("einmal unter Soll zaehlt aber mit", einmal.verfehltFolge === 1);
pruefe("und wird nicht als nachgezogen gemeldet", einmal.nachgezogen === false);

const zweimal = progressionAnwenden(uebung({ verfehltFolge:1 }), 4, { minWdh:8, minGewicht:40 });
pruefe("beim zweiten Mal uebernimmt der Plan die Wdh", zweimal.wdh === 8);
pruefe("der Zaehler startet neu", zweimal.verfehltFolge === 0);
pruefe("es wird gemeldet", zweimal.nachgezogen === true);
pruefe("die Pause waechst mit", zweimal.pause === 105);

const gewichtNach = progressionAnwenden(uebung({ verfehltFolge:1 }), 4, { minWdh:10, minGewicht:30 });
pruefe("auch das Gewicht zieht nach", gewichtNach.gewicht === 30);
pruefe("mehr Gewicht als geplant wird NICHT uebernommen",
  progressionAnwenden(uebung({ verfehltFolge:1 }), 4, { minWdh:10, minGewicht:50 }).gewicht === 40);
pruefe("der Plan rutscht nicht unter sein eigenes Minimum",
  progressionAnwenden(uebung({ verfehltFolge:1 }), 4, { minWdh:2, minGewicht:40 }).wdh === 6);

/* Soll gehalten -> der Zaehler faellt zurueck auf 0. */
const gehalten = progressionAnwenden(uebung({ verfehltFolge:1 }), 2, null);
pruefe("Soll gehalten setzt den Zaehler zurueck", gehalten.verfehltFolge === 0);
pruefe("und die normale Steigerung laeuft", gehalten.wdh === 11);

/* Der Deload behaelt den Vortritt. */
const deload = progressionAnwenden(uebung({ notenHistorie:[5,5], verfehltFolge:1 }), 5, { minWdh:8, minGewicht:40 });
pruefe("dreimal Note 5 schlaegt das Nachziehen", deload.deload === true && deload.nachgezogen === false);

/* Ohne Verfehlt-Angabe verhaelt sich alles wie vorher (Regression). */
pruefe("ohne Verfehlt-Angabe bleibt die alte Progression",
  progressionAnwenden(uebung(), 1).wdh === 12);

/* ---------- 4) Gewicht im Training ---------- */
pruefe("Schrittweite kommt aus der Uebung", gewichtSchrittFuer(uebung()) === 2.5);
pruefe("eigene Schrittweite gewinnt", gewichtSchrittFuer(uebung({ gewichtSchritt:5 })) === 5);
pruefe("ohne Angabe 2,5 kg", gewichtSchrittFuer(uebung({ gewichtSchritt:0 })) === 2.5 && gewichtSchrittFuer(null) === 2.5);
pruefe("Hantel-Uebung bekommt die Reihe", hatGewicht(uebung()) === true);
pruefe("Koerpergewicht bleibt aufgeraeumt", hatGewicht(uebung({ gewicht:0, gewichtSchritt:0 })) === false);
pruefe("eine Uebung mit Schrittweite aber ohne Gewicht bekommt sie auch",
  hatGewicht(uebung({ gewicht:0, gewichtSchritt:2.5 })) === true);
pruefe("Zeit-Uebungen nie", hatGewicht(uebung({ modus:"zeit" })) === false);

/* ---------- 5) Verdrahtung ---------- */
pruefe("das Protokoll nimmt das Ist-Gewicht",
  grabFn("satzProtokollieren").includes("lauf.istGewicht != null ? lauf.istGewicht : u.gewicht"));
pruefe("der Satz setzt das Ist-Gewicht", grabFn("schrittBetreten").includes("lauf.istGewicht = r ? r.gewicht : u.gewicht"));
pruefe("andere Schritte blenden die Reihe aus", grabFn("schrittBetreten").includes("gewReihe.hidden = true"));
pruefe("die Bewertung reicht das Verfehlte durch",
  grabFn("bewertungAnwenden").includes("progressionAnwenden(alt, note, sollVerfehlt(alt, gemachteSaetze))"));
pruefe("das Ergebnis meldet das Nachziehen", src.includes("z.neu.nachgezogen"));
pruefe("es gibt die Gewichts-Reihe im Training", src.includes('id="gewicht-reihe"'));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
