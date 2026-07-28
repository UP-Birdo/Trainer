/* v137-Test: Dropsaetze — Gegenstueck zur Rampe, aber ALS ARBEIT gezaehlt.
   Kern ist `dropSaetze` (Staffelung 80 / 80-60 %, fallende Wdh) plus die
   entscheidende Wechselwirkung: `effektiveNote` (v113) darf Dropsaetze NICHT
   als „Soll verfehlt" lesen, sonst blockierten sie jede Steigerung. Dazu der
   ausgefuehrte Ablauf (Drop haengt ohne Pause am Arbeitssatz).
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
  "const VORBEREITUNG_S = 10;",
  grabZeile("RAMPEN"), grabZeile("DROPS"),
  "function zeitAnsage(){ return 'zeit'; }",
  grabFn("aufwaermSaetze"), grabFn("dropSaetze"), grabFn("superBloecke"),
  // v159: `effektiveNote` fragt `sollVerfehlt` (dort steckt seither auch das Gewicht).
  grabFn("klassischerAblauf"), grabFn("sollVerfehlt"), grabFn("effektiveNote"),
  "module.exports = { dropSaetze, klassischerAblauf, effektiveNote };"
].join("\n"))(modul, modul.exports);
const { dropSaetze, klassischerAblauf, effektiveNote } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const kurz = l => l.map(d => d.gewicht + "x" + d.wdh).join(" ");

/* 1) Staffelung. */
const u = { modus:"wdh", gewicht:100, wdh:10, gewichtSchritt:2.5 };
pruefe("1 Drop: 80 Prozent, 7 Wdh", kurz(dropSaetze(u, 1)) === "80x7");
pruefe("2 Drops: 80 und 60 Prozent, Wdh fallen weiter", kurz(dropSaetze(u, 2)) === "80x7 60x5");
pruefe("Gewicht faellt", dropSaetze(u, 2).every((d,i,l) => i === 0 || d.gewicht < l[i-1].gewicht));
pruefe("Wdh fallen", dropSaetze(u, 2).every((d,i,l) => i === 0 || d.wdh <= l[i-1].wdh));
pruefe("immer leichter als der Arbeitssatz", dropSaetze(u, 2).every(d => d.gewicht < u.gewicht));

/* 2) Keine Drops, wo sie keinen Sinn haben. */
pruefe("0 -> leer", dropSaetze(u, 0).length === 0);
pruefe("ohne Angabe -> leer", dropSaetze(u).length === 0);
pruefe("mehr als 2 gibt es nicht", dropSaetze(u, 3).length === 0);
pruefe("Zeit-Uebung -> leer", dropSaetze({ modus:"zeit", gewicht:100, wdh:10 }, 2).length === 0);
pruefe("Koerpergewicht -> leer", dropSaetze({ modus:"wdh", gewicht:0, wdh:12 }, 2).length === 0);
pruefe("keine Uebung -> leer", dropSaetze(null, 2).length === 0);
pruefe("mindestens 2 Wdh", dropSaetze({ modus:"wdh", gewicht:100, wdh:3, gewichtSchritt:2.5 }, 2)
  .every(d => d.wdh >= 2));
pruefe("nie 0 kg", dropSaetze({ modus:"wdh", gewicht:2.5, wdh:8, gewichtSchritt:2.5 }, 2)
  .every(d => d.gewicht >= 2.5));

/* 3) Ablauf: Drop haengt OHNE Pause am Arbeitssatz, Pause erst danach. */
const plan = { uebungen: [{ name:"A", modus:"wdh", saetze:2, wdh:10, gewicht:100, gewichtSchritt:2.5, pause:60, drop:1 }] };
const s = klassischerAblauf(plan);
const muster = s.map(x => x.typ === "pause" ? "P" : (x.drop ? "D" : "S")).join("");
pruefe("Muster S D P S D (kein Pause-Schritt vor dem Drop, keiner am Ende)", muster === "SDPSD");
pruefe("Drop traegt seine eigenen Werte", s.filter(x => x.drop).every(x => x.dropWert.gewicht === 80));
pruefe("Drop gehoert zum selben Satz", s.filter(x => x.drop)[0].satz === 1);

/* 4) Die Wechselwirkung mit der Progression (v113). */
const uebung = { id:"u1", modus:"wdh", wdh:10, wdhMin:8 };
const saetzeMitDrop = [
  { uebungId:"u1", wdh:10 },              // Arbeitssatz: Soll erreicht
  { uebungId:"u1", wdh:7, drop:true },    // Drop: weniger Wdh, aber bewusst
  { uebungId:"u1", wdh:10 }
];
pruefe("Dropsatz bremst die Steigerung NICHT", effektiveNote(uebung, 2, saetzeMitDrop) === 2);
const saetzeEcht = [{ uebungId:"u1", wdh:10 }, { uebungId:"u1", wdh:7 }];
pruefe("ein echter schwacher Satz bremst weiter", effektiveNote(uebung, 2, saetzeEcht) === 5);
pruefe("nur Dropsaetze -> keine Bewertungsgrundlage, Note bleibt",
  effektiveNote(uebung, 1, [{ uebungId:"u1", wdh:5, drop:true }]) === 1);

/* 5) Verdrahtung. */
pruefe("Drop wird protokolliert und markiert",
  grabFn("satzProtokollieren").includes("eintrag.drop = true"));
/* v159: Das Drop-Gewicht läuft jetzt über `lauf.istGewicht` — `schrittBetreten`
   setzt es auf den Drop-Wert, `satzProtokollieren` schreibt genau das weg. Damit
   zeigt die Anzeige immer, was gleich protokolliert wird, und der Sonderfall im
   Protokollieren entfällt. Die Zusage ist dieselbe, der Weg ein anderer. */
pruefe("Drop protokolliert SEIN Gewicht",
  grabFn("schrittBetreten").includes("lauf.istGewicht = r ? r.gewicht : u.gewicht") &&
  grabFn("satzProtokollieren").includes("lauf.istGewicht != null ? lauf.istGewicht : u.gewicht"));
pruefe("kein Rekord auf dem Dropsatz", grabFn("rekordPruefen").includes("schritt.drop"));
pruefe("Anzeige kennt den Dropsatz", src.includes('s.drop  ? "Drop-Satz · nach Satz "'));
pruefe("Editor-Feld nur mit Gewicht", src.includes('zahlfeld(i,"drop","Dropsätze"'));
pruefe("Editor klemmt auf 0..2", grabFn("rampeKlemmen").includes("begrenzen(Math.round(u.drop)  || 0, 0, 2)"));
pruefe("Karte zeigt die Drops", src.includes('(u.drop  > 0 ? " · " + u.drop  + " Drop" : "")'));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
