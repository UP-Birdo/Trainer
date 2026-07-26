/* v124-Test: Sportart aktivieren fragt erst (kein Auto-Plan) + Langdruck auf
   Uebungs-Karten im Editor.
   Testbarer Kern ist `uebungMenue` (welche Aktionen bietet die Karteikarte an —
   Pfeile nur, wo sie hinfuehren) gegen ein Mini-Fake. Der Rest ist Flow/DOM ->
   strukturelle Quelltext-Checks.
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

let letztesMenue = null;
const code = [
  "let editorPlan = null;",
  "function aktionsMenue(titel, aktionen){ menue = { titel, aktionen }; }",
  "let menue = null;",
  "function uebungSchieben(){} function uebungLoeschen(){}",
  grabFn("uebungMenue"),
  "module.exports = { uebungMenue, setPlan(p){ editorPlan = p; }, letztes(){ return menue; } };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const labels = () => T.letztes().aktionen.map(a => a.text);

/* 1) uebungMenue: Pfeile nur, wo sie hinfuehren; Loeschen immer. */
T.setPlan({ uebungen: [ { name:"Kniebeugen" }, { name:"Bankdruecken" }, { name:"" } ] });
T.uebungMenue(0);
pruefe("erste Uebung: kein Nach-oben", labels().indexOf("▲ Nach oben") < 0);
pruefe("erste Uebung: Nach-unten da", labels().indexOf("▼ Nach unten") >= 0);
pruefe("Titel ist der Uebungsname", T.letztes().titel === "Kniebeugen");
T.uebungMenue(1);
pruefe("mittlere Uebung: beide Pfeile", labels().indexOf("▲ Nach oben") >= 0 && labels().indexOf("▼ Nach unten") >= 0);
T.uebungMenue(2);
pruefe("letzte Uebung: kein Nach-unten", labels().indexOf("▼ Nach unten") < 0);
pruefe("namenlose Uebung bekommt Ersatztitel", T.letztes().titel === "Übung 3");
pruefe("Loeschen ist immer dabei und gefaehrlich",
  T.letztes().aktionen.some(a => a.text === "Übung löschen" && a.stil === "gefahr"));
T.setPlan({ uebungen: [ { name:"Einzige" } ] });
T.uebungMenue(0);
pruefe("einzige Uebung: nur Loeschen", labels().length === 1);
const vorher = T.letztes();
T.uebungMenue(7);   // Index gibt es nicht
pruefe("unbekannter Index oeffnet kein Menue", T.letztes() === vorher);

/* 2) Verdrahtung Langdruck: EIN Helfer fuer beide Kartenarten. */
pruefe("Helfer langdruckBinden existiert", src.includes("function langdruckBinden("));
pruefe("Plan-Karten nutzen ihn", /querySelectorAll\("\[data-plan\]"\)[\s\S]{0,120}langdruckBinden/.test(src));
pruefe("Uebungs-Karten nutzen ihn", /uebung-liste \[data-uebung\][\s\S]{0,120}langdruckBinden/.test(src));
pruefe("Uebungs-Karte traegt ihren Index", src.includes('data-uebung="\' + i + \'"'));
pruefe("Editor bindet nach dem Zeichnen neu",
  /miniMuskelFigur\(el[\s\S]{0,400}langdruckEinrichten\(\);/.test(src));
pruefe("kurzes Antippen klappt weiter auf (v105 unberuehrt)",
  src.includes('onclick="editorUebungToggle('));

/* 3) Verdrahtung Sportart-Frage: kein Wizard ohne Rueckfrage. */
pruefe("Frage-Funktion existiert", src.includes("function sportPlanFrage("));
pruefe("zwei Antworten", /Jetzt anlegen[\s\S]{0,160}Später/.test(src));
pruefe("Aktivieren ruft die Frage statt des Wizards",
  /planTyp === "aktivitaet"\) sportPlanFrage\(offeneSportart\)/.test(src));
pruefe("Seite wird vor der Frage aktualisiert",
  /sportartSeiteZeichnen\(\);\s*\n\s*\/\/ C1: neue Sportart/.test(src));
pruefe("Sportart-Seite bietet den Wizard nach", src.includes("sportSetupStarten(\\'"));
pruefe("Nachhol-Knopf nur ohne Plan dieser Sportart", src.includes("const hatPlan = sitzung.daten.plaene.some"));
pruefe("veralteter Nicht-Kraft-Hinweis entfernt",
  !src.includes("gibt es bisher nur für Krafttraining"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
