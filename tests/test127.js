/* v127-Test: Rekord-Moment direkt nach dem Satz.
   Kern sind drei reine Funktionen: `satzWert` (dieselbe Rechnung wie Bestwerte),
   `rekordText` (Kurzform der Meldung) und `istNeuerRekord` (Vergleich gegen die
   Historie UND die frueheren Saetze desselben Trainings).
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
  grabFn("satzWert"), grabFn("rekordText"), grabFn("istNeuerRekord"),
  "module.exports = { satzWert, rekordText, istNeuerRekord };"
].join("\n"))(modul, modul.exports);
const { satzWert, rekordText, istNeuerRekord } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const kraft = (wdh, gewicht) => ({ uebungId:"u1", modus:"wdh", wdh, gewicht });
const zeit  = (dauer) => ({ uebungId:"u2", modus:"zeit", dauer });

/* 1) satzWert — dieselbe Rechnung wie Rekord/Bestwerte. */
pruefe("Gewicht x Wdh", satzWert(kraft(10, 40)) === 400);
pruefe("ohne Gewicht zaehlen die Wdh", satzWert(kraft(12, 0)) === 12);
pruefe("Zeit zaehlt Sekunden", satzWert(zeit(45)) === 45);
pruefe("leerer Satz ist 0", satzWert(null) === 0);
pruefe("fehlende Felder sind 0", satzWert({ modus:"wdh" }) === 0);

/* 2) rekordText — die Kurzform in der Meldung. */
pruefe("mit Gewicht", rekordText(kraft(12, 40)) === "12 × 40 kg");
pruefe("ohne Gewicht", rekordText(kraft(15, 0)) === "15 Wdh");
pruefe("Zeit gerundet", rekordText(zeit(45.4)) === "45 s");

/* 3) istNeuerRekord — Historie UND laufendes Training. */
pruefe("besser als die Historie", istNeuerRekord(kraft(10, 40), [], 350) === true);
pruefe("gleich gut ist kein Rekord", istNeuerRekord(kraft(10, 40), [], 400) === false);
pruefe("schlechter ist kein Rekord", istNeuerRekord(kraft(8, 40), [], 400) === false);
pruefe("ohne Historie kein Rekord (erster Satz ueberhaupt)",
  istNeuerRekord(kraft(10, 40), [], 0) === false);
pruefe("Wert 0 ist nie ein Rekord", istNeuerRekord(kraft(0, 0), [], 100) === false);
/* Der zweite gleich gute Satz desselben Trainings darf NICHT erneut melden. */
const ersterSatz = kraft(10, 40);
pruefe("zweiter gleicher Satz meldet nicht",
  istNeuerRekord(kraft(10, 40), [ersterSatz], 350) === false);
pruefe("dritter, noch besserer Satz meldet wieder",
  istNeuerRekord(kraft(11, 40), [ersterSatz, kraft(10, 40)], 350) === true);
/* Saetze anderer Uebungen oder anderen Modus zaehlen nicht mit. */
pruefe("fremde Uebung stoert nicht",
  istNeuerRekord(kraft(10, 40), [{ uebungId:"x", modus:"wdh", wdh:99, gewicht:99 }], 350) === true);
pruefe("anderer Modus stoert nicht",
  istNeuerRekord(kraft(10, 40), [{ uebungId:"u1", modus:"zeit", dauer:9999 }], 350) === true);
pruefe("kaputter Eintrag in der Liste wirft nicht",
  istNeuerRekord(kraft(10, 40), [null, undefined], 350) === true);
pruefe("Zeit-Uebung eigener Vergleich", istNeuerRekord(zeit(50), [zeit(45)], 40) === true);

/* 4) Verdrahtung: Vergleich VOR dem Anhaengen, Meldung als Toast. */
const prot = grabFn("satzProtokollieren");
pruefe("Kopie vor dem Anhaengen", /const vorher = lauf\.saetze\.slice\(\);\s*\n\s*lauf\.saetze\.push/.test(prot));
pruefe("meldet per Toast", prot.includes('zeigenToast("Neuer Rekord: " + rekordText(eintrag), "erfolg")'));
pruefe("vergleicht gegen die Historie", prot.includes("bisherigerRekord(u.id, u.modus)"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
