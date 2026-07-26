/* v135-Test: Aufwaermsaetze (Ramp-up).
   Kern ist die reine `aufwaermSaetze(uebung, anzahl)` — Staffelung, Rundung auf
   die Schrittweite, gegenlaeufige Wiederholungen und die Faelle, in denen es
   KEINE Rampe gibt (Zeit-Uebung, Koerpergewicht, 0 Saetze). Dazu die
   Verdrahtung: Rampe im Ablauf, nicht protokolliert, kein Rekord.
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
function grabZeile(name){
  const i = src.indexOf("const " + name + " = ");
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  return src.slice(i, src.indexOf("\n", i));
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabZeile("RAMPEN"), grabFn("aufwaermSaetze"),
  "module.exports = { aufwaermSaetze, RAMPEN };"
].join("\n"))(modul, modul.exports);
const { aufwaermSaetze, RAMPEN } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const kurz = liste => liste.map(a => a.gewicht + "x" + a.wdh).join(" ");

/* 1) Staffelung: 1 / 2 / 3 Saetze. */
const u = { modus:"wdh", gewicht:100, wdh:10, gewichtSchritt:2.5 };
pruefe("1 Satz: 60 Prozent", kurz(aufwaermSaetze(u, 1)) === "60x8");
// 75 % ergibt rechnerisch genau 6,5 Wdh -> 7. Ohne Epsilon liefert der Float
// 6,4999… und damit 6 (die Falle, die der Code seit v135 abfaengt).
pruefe("2 Saetze: 50 und 75 Prozent", kurz(aufwaermSaetze(u, 2)) === "50x9 75x7");
pruefe("3 Saetze: 40, 60, 80 Prozent", kurz(aufwaermSaetze(u, 3)) === "40x10 60x8 80x6");
pruefe("Gewicht steigt monoton",
  aufwaermSaetze(u, 3).every((a, i, l) => i === 0 || a.gewicht > l[i-1].gewicht));
pruefe("Wiederholungen fallen dabei",
  aufwaermSaetze(u, 3).every((a, i, l) => i === 0 || a.wdh <= l[i-1].wdh));
pruefe("nie schwerer als der Arbeitssatz",
  aufwaermSaetze(u, 3).every(a => a.gewicht < u.gewicht));

/* 2) Keine Rampe, wo sie keinen Sinn hat. */
pruefe("0 Saetze -> leer", aufwaermSaetze(u, 0).length === 0);
pruefe("ohne Angabe -> leer", aufwaermSaetze(u).length === 0);
pruefe("mehr als 3 gibt es nicht -> leer", aufwaermSaetze(u, 4).length === 0);
pruefe("Zeit-Uebung -> leer",
  aufwaermSaetze({ modus:"zeit", gewicht:100, wdh:10 }, 3).length === 0);
pruefe("Koerpergewicht -> leer",
  aufwaermSaetze({ modus:"wdh", gewicht:0, wdh:12 }, 3).length === 0);
pruefe("keine Uebung -> leer", aufwaermSaetze(null, 3).length === 0);

/* 3) Rundung auf die Schrittweite — Zwischenwerte kann man nicht auflegen. */
const fein = { modus:"wdh", gewicht:47.5, wdh:8, gewichtSchritt:2.5 };
pruefe("rundet auf 2,5er-Schritte",
  aufwaermSaetze(fein, 3).every(a => Math.round(a.gewicht * 10) % 25 === 0));
const ohneSchritt = { modus:"wdh", gewicht:9, wdh:10, gewichtSchritt:0 };
pruefe("ohne Schrittweite auf 0,5 kg",
  aufwaermSaetze(ohneSchritt, 3).every(a => Math.round(a.gewicht * 10) % 5 === 0));
const leicht = { modus:"wdh", gewicht:2.5, wdh:10, gewichtSchritt:2.5 };
pruefe("nie 0 kg (mindestens ein Schritt)",
  aufwaermSaetze(leicht, 3).every(a => a.gewicht >= 2.5));

/* 4) Wiederholungen: nie unter 2, auch bei kurzen Saetzen. */
const wenig = { modus:"wdh", gewicht:100, wdh:3, gewichtSchritt:2.5 };
pruefe("mindestens 2 Wdh", aufwaermSaetze(wenig, 3).every(a => a.wdh >= 2));
pruefe("Tabelle kennt genau 1..3", Object.keys(RAMPEN).sort().join() === "1,2,3");

/* 5) Verdrahtung. */
// Nicht auf die Schleifen-Form pruefen (die aendert sich, siehe v136 Supersaetze),
// sondern auf die Reihenfolge im Ablauf: Rampe VOR den Arbeitssaetzen.
const ablauf = grabFn("klassischerAblauf");
pruefe("Rampe steht vor den Arbeitssaetzen im Ablauf",
  ablauf.includes("aufwaermSaetze(") &&
  ablauf.indexOf("aufwaermSaetze(") < ablauf.indexOf("for(let s = 1"));
pruefe("Aufwaermsatz wird als solcher markiert", src.includes("rampe:true, rampeWert:a"));
pruefe("kuerzere Pause nach dem Aufwaermsatz",
  /Math\.max\(30, Math\.round\(\(u\.pause \|\| 60\) \/ 2\)\)/.test(src));
pruefe("wird NICHT protokolliert",
  grabFn("satzProtokollieren").includes("if(schritt && schritt.rampe) return;"));
pruefe("kein Rekord auf dem Aufwaermsatz", grabFn("rekordPruefen").includes("schritt.rampe"));
// v137 hat dieselbe Zeile um die Dropsaetze erweitert — geprueft wird die
// Aussage: die Anzeige nimmt bei einer Rampe deren eigene Werte.
pruefe("Anzeige nutzt die Rampen-Werte", /const r = s\.rampe \? s\.rampeWert :/.test(src));
pruefe("Editor-Feld nur mit Gewicht",
  /u\.gewicht > 0 \? zahlfeld\(i,"rampe","Aufwärmsätze"/.test(src));
pruefe("Editor klemmt auf 0..3", grabFn("rampeKlemmen").includes("begrenzen(Math.round(u.rampe) || 0, 0, 3)"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
