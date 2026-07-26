/* v126-Test: Editor-Feinschliff (11. Runde) — Wochentage zugeklappt, Uebungen
   erst nach der Sportart-Wahl.
   Testbarer Kern ist `planTageText` (die Stand-Zeile der eingeklappten Auswahl).
   Der Rest ist Markup/Flow -> strukturelle Quelltext-Checks.
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

const code = [
  "const WOCHENTAGE = ['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];",
  grabFn("planTageText"),
  "module.exports = { planTageText };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const planTageText = modul.exports.planTageText;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) planTageText — was die zugeklappte Zeile anzeigt. */
pruefe("ohne Tag", planTageText({ tage: [] }) === "kein fester Tag");
pruefe("Feld fehlt ganz", planTageText({}) === "kein fester Tag");
pruefe("ein Tag", planTageText({ tage: [1] }) === "Mo");
pruefe("mehrere Tage in Wochen-Reihenfolge", planTageText({ tage: [4, 1] }) === "Mo, Do");
pruefe("Takt 2 wird genannt", planTageText({ tage: [1], wochenTakt: 2 }) === "Mo · alle 2 Wochen");
pruefe("Takt 1 wird NICHT genannt (Normalfall)", planTageText({ tage: [1], wochenTakt: 1 }) === "Mo");
pruefe("ohne Tag kein Takt-Anhang", planTageText({ tage: [], wochenTakt: 2 }) === "kein fester Tag");
pruefe("Sonntag korrekt", planTageText({ tage: [7] }) === "So");
pruefe("Original-Liste bleibt unsortiert-unberuehrt", (() => {
  const p = { tage: [4, 1] }; planTageText(p); return p.tage[0] === 4;
})());

/* 2) Aufklapp-Block: eigene Zeile, zugeklappt, Zustand + Pfeil.
      v131 hat den Block von „nur Wochentage" auf ALLE Grundeinstellungen
      erweitert — die Namen heissen seither einst statt tage. */
pruefe("Aufklapp-Zeile vorhanden", src.includes('onclick="editorEinstUmschalten()"'));
pruefe("Block startet versteckt", src.includes('<div id="editor-einst-block" hidden>'));
pruefe("Zeile traegt den Stand", src.includes('"Einstellungen: " + planEinstText(editorPlan)'));
pruefe("Umschalter + Startwert zu", src.includes("function editorEinstUmschalten()") &&
  /let editorEinstOffen = false/.test(src));
pruefe("planAnlegen startet zugeklappt", grabFn("planAnlegen").includes("editorEinstOffen = false"));
pruefe("editorOeffnen startet zugeklappt", grabFn("editorOeffnen").includes("editorEinstOffen = false"));

/* 3) Uebungen erst nach der Sportart-Wahl (+ Vorauswahl bei genau einer). */
pruefe("Liste und Picker haengen an der Sportart",
  src.includes('document.getElementById("uebung-liste").hidden = !hatSport') &&
  src.includes('document.getElementById("uebung-picker").hidden = !hatSport'));
pruefe("Picker wird ohne Sportart gar nicht gebaut",
  /if\(hatSport\) uebungPickerZeichnen\(\); else/.test(src));
pruefe("einzige Profil-Sportart wird vorausgewaehlt",
  /if\(meine\.length === 1\) planSportartSetzen\(meine\[0\]\); else editorZeichnen\(\)/.test(src));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
