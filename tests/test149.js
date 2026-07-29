/* v149-Test: Wizard entschlackt und nach Sportarten geordnet.
   Kern: `wzAktualisiereSichtbar` (Fragen laufen Sportart fuer Sportart, in der
   Reihenfolge aus SPORTARTEN) und `wzGruppenStand` (die wievielte Frage IHRER
   Sportart). Dazu: Hilfetext liegt hinter dem i, die Schritt-Anzeige zaehlt.
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
function grabLiteral(name){
  const decl = "const " + name + " = ";
  const i = src.indexOf(decl);
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  let start = i + decl.length;
  while(start < src.length && src[start] !== "{" && src[start] !== "[") start++;
  const auf = src[start], zu = auf === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}
/* WIZARD_FRAGEN ist ein Array MIT .concat(...) dahinter — grabLiteral wuerde
   nach der Klammer aufhoeren. Darum die ganze Anweisung bis zur naechsten. */
function grabAnweisung(start, ende){
  const i = src.indexOf(start), j = src.indexOf(ende, i);
  if(i < 0 || j < 0) throw new Error("Anweisung nicht gefunden: " + start);
  return src.slice(i, j);
}

const code = [
  "const SPORTARTEN = " + grabLiteral("SPORTARTEN") + ";",
  "const WOCHENTAGE = " + grabLiteral("WOCHENTAGE") + ";",
  "const SPORT_UEBUNGEN = " + grabLiteral("SPORT_UEBUNGEN") + ";",
  grabFn("sportUebungen"),
  grabFn("zahlKurz"),
  grabFn("kraftGewaehlt"),
  grabAnweisung("const WIZARD_FRAGEN = ", "let wzSchritt"),
  "let wzSichtbar = [];",
  "let einrichtung = {};",
  grabFn("wzAktualisiereSichtbar"),
  grabFn("wzGruppenStand"),
  "module.exports = { WIZARD_FRAGEN, wzGruppenStand," +
    " sichtbarFuer: e => { einrichtung = e; wzAktualisiereSichtbar(); return wzSichtbar; } };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const { WIZARD_FRAGEN, wzGruppenStand, sichtbarFuer } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Jede Frage weiss, zu welcher Sportart sie gehoert ---------- */
const ohneBezug = WIZARD_FRAGEN.filter(f => !f.sportBezug).map(f => f.id);
pruefe("nur die Auftaktfrage steht ohne Sportart (ist: " + ohneBezug.join(", ") + ")",
  JSON.stringify(ohneBezug) === JSON.stringify(["sportarten"]));
const kraftFragen = WIZARD_FRAGEN.filter(f => f.sportBezug === "kraft").map(f => f.id);
pruefe("die acht Kraft-Fragen sind zugeordnet (ist: " + kraftFragen.length + ")", kraftFragen.length === 8);

/* ---------- 2) Reihenfolge: Sportart fuer Sportart ---------- */
const e = { sportarten:["tischtennis","kraft","laufen"] };
const sichtbar = sichtbarFuer(e);
const bezuege = sichtbar.map(f => f.sportBezug || "-");
pruefe("die Auftaktfrage bleibt vorn", bezuege[0] === "-");
/* Jede Gruppe muss ZUSAMMENHAENGEN — genau das war vorher nicht so. */
const bloecke = bezuege.filter((b, i) => i === 0 || b !== bezuege[i-1]);
pruefe("keine Sportart kommt zweimal dran (ist: " + bloecke.join(" > ") + ")",
  new Set(bloecke).size === bloecke.length);
pruefe("Reihenfolge folgt SPORTARTEN (Kraft, Laufen, Tischtennis)",
  JSON.stringify(bloecke) === JSON.stringify(["-","kraft","laufen","tischtennis"]));
pruefe("nicht gewaehlte Sportarten kommen nicht vor", !bezuege.includes("yoga"));

/* Ohne Kraft faellt der ganze Kraft-Block weg. */
const ohneKraft = sichtbarFuer({ sportarten:["yoga"] }).map(f => f.sportBezug || "-");
pruefe("ohne Krafttraining keine Kraft-Fragen", !ohneKraft.includes("kraft"));
pruefe("Yoga wird trotzdem gefragt", ohneKraft.includes("yoga"));

/* ---------- 3) wzGruppenStand: die wievielte Frage ihrer Sportart ---------- */
pruefe("Auftaktfrage hat keinen Gruppen-Stand", wzGruppenStand(sichtbar, 0) === null);
const ersteKraft = sichtbar.findIndex(f => f.sportBezug === "kraft");
const s1 = wzGruppenStand(sichtbar, ersteKraft);
pruefe("erste Kraft-Frage ist 1 von 8", s1.sport === "kraft" && s1.nummer === 1 && s1.gesamt === 8);
const s2 = wzGruppenStand(sichtbar, ersteKraft + 1);
pruefe("zweite Kraft-Frage ist 2 von 8", s2.nummer === 2 && s2.gesamt === 8);
const ersteLauf = sichtbar.findIndex(f => f.sportBezug === "laufen");
const s3 = wzGruppenStand(sichtbar, ersteLauf);
pruefe("Laufen faengt wieder bei 1 an", s3.sport === "laufen" && s3.nummer === 1);
pruefe("hinter dem Ende gibt es nichts", wzGruppenStand(sichtbar, sichtbar.length) === null);

/* ---------- 4) Weniger Text: Hilfe hinter dem i ---------- */
const zeichnen = grabFn("wzZeichnen");
pruefe("Hilfetext startet zugeklappt", zeichnen.includes('<div class="wz-hilfe" id="wz-hilfe" hidden>'));
pruefe("ein i klappt ihn auf", zeichnen.includes("infoUmschalten(\\'wz-hilfe\\')"));
pruefe("Kopfzeile nennt die Sportart", zeichnen.includes("wzGruppenStand(wzSichtbar, wzSchritt)"));
pruefe("Kopfzeile traegt die Sportart-Farbe", zeichnen.includes("sportart(stand.sport).farbe"));
/* v171 hat diese v149-Zusage ABGELOEST: Ueber jeder Frage standen drei Zaehler
   parallel (Punkteleiste, „Frage N von M" der Sportart, „Schritt N von M"
   global). Der globale Text-Zaehler ist entfallen — die Punkteleiste direkt
   darueber sagt dasselbe, ohne dass man liest. Was BLEIBT: Es steht keine
   feste, falsche Zahl mehr da (der eigentliche v149-Fehler). */
pruefe("die Fusszeile zaehlt nicht mehr mit (v171)",
  zeichnen.includes('wz-schritt-anzeige").textContent = ""'));
pruefe("der globale Zaehler ist ganz weg",
  !src.includes('"Schritt " + (wzSchritt + 1)'));
pruefe("die feste Anzeige Schritt 1/7 ist raus", !src.includes(">Schritt 1/7<"));
pruefe("die bildliche Punkteleiste traegt den globalen Fortschritt weiter",
  zeichnen.includes('wz-fortschritt").innerHTML'));
pruefe("die Zusammenfassung benennt sich selbst",
  grabFn("wzZusammenfassung").includes('"Zusammenfassung"'));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
