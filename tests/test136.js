/* v136-Test: Supersaetze — zwei (oder mehr) Uebungen ohne Pause dazwischen.
   Kern sind `superBloecke` (zerlegt die Uebungsliste in Bloecke) und
   `imSuperatz` (Anzeige). Dazu der ECHTE Ablauf: `klassischerAblauf` wird
   ausgefuehrt und geprueft, dass im Superatz keine Pause zwischen den Partnern
   steht, wohl aber danach — und dass Einzeluebungen unveraendert laufen.
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
  "const VORBEREITUNG_S = 10;",
  "const RAMPEN = { 1:[0.6], 2:[0.5,0.75], 3:[0.4,0.6,0.8] };",
  "function zeitAnsage(){ return 'zeit'; }",
  grabFn("aufwaermSaetze"), grabFn("superBloecke"), grabFn("imSuperatz"),
  grabFn("klassischerAblauf"),
  "module.exports = { superBloecke, imSuperatz, klassischerAblauf };"
].join("\n"))(modul, modul.exports);
const { superBloecke, imSuperatz, klassischerAblauf } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const bl = liste => JSON.stringify(superBloecke(liste));
const ue = (name, extra) => Object.assign({ name, modus:"wdh", saetze:2, wdh:10, gewicht:0, pause:60 }, extra || {});

/* 1) superBloecke — wer gehoert zusammen? */
pruefe("ohne Kopplung: lauter Einzelbloecke", bl([ue("A"), ue("B"), ue("C")]) === "[[0],[1],[2]]");
pruefe("eine Kopplung", bl([ue("A", { superMitNaechster:true }), ue("B"), ue("C")]) === "[[0,1],[2]]");
pruefe("Kette ergibt Dreier",
  bl([ue("A", { superMitNaechster:true }), ue("B", { superMitNaechster:true }), ue("C")]) === "[[0,1,2]]");
pruefe("Kopplung in der Mitte",
  bl([ue("A"), ue("B", { superMitNaechster:true }), ue("C")]) === "[[0],[1,2]]");
pruefe("Schalter an der LETZTEN Uebung koppelt niemanden",
  bl([ue("A"), ue("B", { superMitNaechster:true })]) === "[[0],[1]]");
pruefe("leere Liste", bl([]) === "[]");
pruefe("undefined faellt nicht um", JSON.stringify(superBloecke(undefined)) === "[]");

/* 2) imSuperatz — was die Karte anzeigt. */
const paar = [ue("A", { superMitNaechster:true }), ue("B"), ue("C")];
pruefe("erster Partner gehoert dazu", imSuperatz(paar, 0) === true);
pruefe("zweiter Partner auch", imSuperatz(paar, 1) === true);
pruefe("die dritte nicht", imSuperatz(paar, 2) === false);
pruefe("Schalter ohne Nachfolger zaehlt nicht",
  imSuperatz([ue("A"), ue("B", { superMitNaechster:true })], 1) === false);

/* 3) Der echte Ablauf. */
const plan = { uebungen: [ue("A", { superMitNaechster:true }), ue("B")] };
const s = klassischerAblauf(plan);
const muster = s.map(x => x.typ === "pause" ? "P" : (x.uebungIndex === 0 ? "A" : "B")).join("");
pruefe("Superatz: A B Pause A B (keine Pause dazwischen, keine am Ende)", muster === "ABPAB");
pruefe("Pause traegt die Pause des zuletzt Geuebten",
  s.filter(x => x.typ === "pause").every(x => x.sekunden === 60));
pruefe("Ansage nennt den Superatz", s[0].ansage.includes("Superatz 1 von 2"));

const einzeln = klassischerAblauf({ uebungen: [ue("A"), ue("B")] });
pruefe("ohne Kopplung wie bisher: A P A P B P B",
  einzeln.map(x => x.typ === "pause" ? "P" : (x.uebungIndex === 0 ? "A" : "B")).join("") === "APAPBPB");
pruefe("Einzeluebung ohne Superatz-Ansage", !einzeln[0].ansage.includes("Superatz"));

/* Partner mit weniger Saetzen steigt aus, der andere macht allein weiter. */
const ungleich = klassischerAblauf({ uebungen: [ue("A", { superMitNaechster:true, saetze:3 }), ue("B", { saetze:1 })] });
pruefe("ungleiche Satzzahl: A B P A P A",
  ungleich.map(x => x.typ === "pause" ? "P" : (x.uebungIndex === 0 ? "A" : "B")).join("") === "ABPAPA");

/* Rampen laufen VOR dem Superatz — und zwar die beider Partner. */
const mitRampe = klassischerAblauf({ uebungen: [
  ue("A", { superMitNaechster:true, gewicht:100, gewichtSchritt:2.5, rampe:1 }),
  ue("B", { gewicht:50, gewichtSchritt:2.5, rampe:1 })
]});
const rampen = mitRampe.filter(x => x.rampe);
pruefe("beide Partner waermen auf", rampen.length === 2);
pruefe("Rampen stehen vor dem ersten Arbeitssatz",
  mitRampe.findIndex(x => x.rampe) < mitRampe.findIndex(x => x.typ === "satz-wdh" && !x.rampe));

/* 4) Verdrahtung. */
pruefe("Menue-Eintrag zum Koppeln", src.includes("Mit nächster Übung koppeln"));
pruefe("nur wenn es einen Nachfolger gibt",
  /if\(i < editorPlan\.uebungen\.length - 1\)\s*\n\s*aktionen\.push\(\{ text: u\.superMitNaechster/.test(src));
pruefe("Karte zeigt den Superatz", src.includes('imSuperatz(editorPlan.uebungen, i) ? " · Superatz" : ""'));
pruefe("Loeschen raeumt den Schalter der letzten Uebung",
  grabFn("uebungLoeschen").includes("letzte.superMitNaechster = false"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
