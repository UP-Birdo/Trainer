/* v120-Test: Haupt-Tabs entschlacken (Heute + Statistik). Kern-Logik ist
   `statHatDaten` (welche Statistik in „Darstellung" überhaupt anwählbar ist);
   dazu strukturelle Checks für die Text-/Layout-Reduktionen. */
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

const code = [ grabFn("statHatDaten"), "module.exports = { statHatDaten };" ].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const statHatDaten = modul.exports.statHatDaten;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
function setze(protokoll){ global.sitzung = { daten: { protokoll } }; }

/* 1) Ohne Daten: nur Körpergewicht (manuell) ist wählbar. */
setze([]);
pruefe("leer: Körpergewicht immer wählbar", statHatDaten("koerpergewicht") === true);
pruefe("leer: Trainings nicht", statHatDaten("trainings") === false);
pruefe("leer: Ausdauer nicht", statHatDaten("ausdauer") === false);
pruefe("leer: Volumen nicht", statHatDaten("volumen") === false);

/* 2) Eine Aktivität: Trainings + Ausdauer, aber nicht die Satz-Statistiken. */
setze([{ typ:"aktivitaet" }]);
pruefe("Aktivität: Trainings", statHatDaten("trainings") === true);
pruefe("Aktivität: Ausdauer", statHatDaten("ausdauer") === true);
pruefe("Aktivität: Volumen NICHT (keine Sätze)", statHatDaten("volumen") === false);

/* 3) Ein Kraft-Training mit Sätzen: Volumen/Fortschritt/Bestwerte + Trainings. */
setze([{ typ:"kraft", saetze:[{ uebungId:"x", wdh:10 }] }]);
pruefe("Kraft: Volumen", statHatDaten("volumen") === true);
pruefe("Kraft: Fortschritt", statHatDaten("fortschritt") === true);
pruefe("Kraft: Bestwerte", statHatDaten("bestwerte") === true);
pruefe("Kraft: Ausdauer NICHT", statHatDaten("ausdauer") === false);

/* 4) Struktur: die Text-/Layout-Reduktionen sind drin. */
pruefe("Darstellung filtert nach statHatDaten", src.includes("filter(([id]) => statHatDaten(id) || an.has(id))"));
pruefe("Trainings-Serie-Label entfernt", !src.includes('class="kennzahl-label">Trainings-Serie'));
pruefe("Kein-Training-Hinweis aus der Ansicht", !src.includes("Noch kein Training in den letzten"));
pruefe("Körpergewicht-Kachel volle Breite", src.includes("#stat-koerpergewicht{grid-column:1 / -1}"));
pruefe("Kachel-Überschrift klein (11px)", src.includes(".stat-karte h2{font-size:11px"));
pruefe("Heute: kein Eigenen-Plan-Knopf mehr", !src.includes(">Eigenen Plan erstellen</button>"));
pruefe("Heute: Zu-den-Plaenen-Knopf vorhanden", src.includes(">Zu den Plänen</button>"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
