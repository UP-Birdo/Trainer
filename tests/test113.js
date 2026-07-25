/* v113-Test: Progression aus echten Wiederholungen. Kern ist die reine Ableitung
   `effektiveNote(u, manuelleNote, saetze)` — die echten Wdh setzen eine Untergrenze
   auf die Note: Plan-Soll auf allen Sätzen erreicht -> RPE-Note bleibt; darunter
   mindestens 4 (halten); unter dem Wdh-Minimum 5 (Rückschritt). Zeit-Übungen und
   Übungen ohne protokollierte Sätze behalten ihre Note. Echte Funktion, nie kopiert. */
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

const code = [ grabFn("effektiveNote"), "module.exports = { effektiveNote };" ].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const effektiveNote = modul.exports.effektiveNote;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const wdhUeb = { modus:"wdh", id:"a", wdh:10, wdhMin:8 };
const zeitUeb = { modus:"zeit", id:"z", wdh:0, wdhMin:0 };
const satz = (id, w) => ({ uebungId:id, wdh:w });

/* 1) Zeit-/Halteübung: Note unverändert (reps-Regel gilt nicht). */
pruefe("Zeit-Übung behält Note", effektiveNote(zeitUeb, 1, [satz("z", 0)]) === 1);

/* 2) Keine eigenen Sätze -> Note unverändert. */
pruefe("Ohne eigene Sätze -> Note bleibt", effektiveNote(wdhUeb, 2, [satz("andere", 3)]) === 2);

/* 3) Soll auf allen Sätzen erreicht -> manuelle Note bleibt (auch „leicht"). */
pruefe("Soll erreicht, Note 1 bleibt", effektiveNote(wdhUeb, 1, [satz("a",10), satz("a",11), satz("a",10)]) === 1);
pruefe("Soll übertroffen, Note 3 bleibt", effektiveNote(wdhUeb, 3, [satz("a",12), satz("a",12)]) === 3);

/* 4) Ein Satz unter dem Soll (aber >= Minimum) -> mindestens Note 4. */
pruefe("Unter Soll, Note 1 -> 4", effektiveNote(wdhUeb, 1, [satz("a",10), satz("a",9), satz("a",10)]) === 4);
pruefe("Unter Soll, Note 3 -> 4", effektiveNote(wdhUeb, 3, [satz("a",9)]) === 4);
pruefe("Unter Soll, Note 5 bleibt 5", effektiveNote(wdhUeb, 5, [satz("a",9)]) === 5);
pruefe("Genau am Minimum (8<10) -> 4", effektiveNote(wdhUeb, 2, [satz("a",8)]) === 4);

/* 5) Unter dem Wdh-Minimum -> Note 5 (Rückschritt). */
pruefe("Unter Minimum, Note 1 -> 5", effektiveNote(wdhUeb, 1, [satz("a",7)]) === 5);
pruefe("Unter Minimum, Note 3 -> 5", effektiveNote(wdhUeb, 3, [satz("a",5), satz("a",10)]) === 5);

/* 6) Ohne definiertes Minimum (wdhMin 0): nur die Soll-Grenze greift -> 4. */
pruefe("Ohne Minimum, unter Soll -> 4", effektiveNote({ modus:"wdh", id:"a", wdh:10, wdhMin:0 }, 1, [satz("a",7)]) === 4);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
