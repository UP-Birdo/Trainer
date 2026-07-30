/* Sammel-Läufer für die ganze Regressionskette.

   WARUM ES IHN GIBT (07/2026): Bis dahin wurde jede Testdatei als eigener
   Prozess gestartet — bei über 90 Dateien dominiert der Electron-Start die
   Laufzeit, und jeder Lauf brauchte ein selbstgebautes PowerShell-Gerüst, das
   die Ausgabedateien wieder einsammelt. Das war fehleranfällig (eine leere
   Fehlerdatei liefert in PowerShell `$null`, nicht "") und laut.

   Dieser Läufer macht beides in EINEM Prozess:
     1. Syntax-Check des Script-Blocks aus der index.html,
     2. jede tests/testNN.js der Reihe nach,
   und gibt am Ende EINE Zeile aus. Nur was fehlschlägt, wird ausführlich.

   Aufruf (PowerShell, kein Node auf diesem Rechner — siehe tools/Test-Trainer.ps1):
     $env:ELECTRON_RUN_AS_NODE = "1"
     & <Code.exe> tests\alle.js index.html
   Rückgabe: 0 = alles grün, 1 = mindestens ein Fehler.

   Die Testdateien selbst bleiben unverändert und einzeln lauffähig — sie sind
   weiterhin eigenständige Skripte, die `process.argv[2]` lesen und mit
   `process.exit` enden. Beides fängt der Läufer ab. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const indexPfad = process.argv[2];
if(!indexPfad){
  console.error("Aufruf: alle.js <pfad-zur-index.html> [--nur testNN,testMM]");
  process.exit(2);
}
const testOrdner = __dirname;

/* Optional: nur bestimmte Dateien laufen lassen (schnelle Zwischenläufe beim
   Bauen). Die VOLLE Kette bleibt Pflicht vor jeder Übergabe. */
let nur = null;
const nurIndex = process.argv.indexOf("--nur");
if(nurIndex > 0 && process.argv[nurIndex + 1]){
  nur = process.argv[nurIndex + 1].split(",").map(s => s.trim().replace(/\.js$/, ""));
}

/** Eine Testdatei im EIGENEN Modul-Umfeld ausführen, ohne den Läufer zu
    beenden. Kein internes Node-API: der Wrapper ist derselbe, den Node auch
    benutzt, nur selbst gebaut. */
function laufe(datei){
  const quelle = fs.readFileSync(datei, "utf8");
  const modul = { exports: {} };
  const ausgabe = [], fehlerZeilen = [];
  const echtLog = console.log, echtErr = console.error;
  const echtExit = process.exit, echtArgv = process.argv;
  let code = 0;
  console.log   = (...a) => ausgabe.push(a.join(" "));
  console.error = (...a) => fehlerZeilen.push(a.join(" "));
  process.argv  = [echtArgv[0], datei, indexPfad];
  const ENDE = { ende: true };
  process.exit  = c => { code = c || 0; throw ENDE; };
  try {
    const wrapper = vm.runInThisContext(
      "(function(exports, require, module, __filename, __dirname){" + quelle + "\n})",
      { filename: datei });
    wrapper(modul.exports, require, modul, datei, path.dirname(datei));
  } catch(e){
    if(e !== ENDE){
      code = 1;
      fehlerZeilen.push(String((e && e.stack) || e));
    }
  } finally {
    console.log = echtLog; console.error = echtErr;
    process.exit = echtExit; process.argv = echtArgv;
  }
  return { code, ausgabe, fehlerZeilen };
}

/* ---------- 1) Syntax-Check des Script-Blocks ---------- */
/* Dasselbe Extrahieren wie tests/extract.js — bewusst `lastIndexOf` für BEIDE
   Marken: Die Datei enthält vor dem Hauptblock noch kleinere Script-Tags, und
   der HAUPTBLOCK ist der letzte. (Mit `indexOf` für den Anfang landet das HTML
   dazwischen im Prüftext und der Parser stolpert über das erste „<".)
   Geprüft wird mit `new vm.Script` — derselbe Parser wie `node --check`, nur
   ohne Zwischendatei. */
let syntaxFehler = null;
try {
  const html = fs.readFileSync(indexPfad, "utf8");
  const von = html.lastIndexOf("<script>");
  const bis = html.lastIndexOf("</script>");
  if(von < 0 || bis < 0 || bis <= von) throw new Error("Script-Block nicht gefunden in " + indexPfad);
  new vm.Script(html.slice(von + "<script>".length, bis), { filename: "index.html (Script-Block)" });
} catch(e){
  syntaxFehler = String((e && e.message) || e);
}

/* ---------- 2) Alle Testdateien ---------- */
const dateien = fs.readdirSync(testOrdner)
  .filter(f => /^test\w+\.js$/.test(f))
  .filter(f => !nur || nur.includes(f.replace(/\.js$/, "")))
  .sort((a, b) => {
    const za = parseInt(a.replace(/\D/g, ""), 10), zb = parseInt(b.replace(/\D/g, ""), 10);
    return za - zb;
  });

let pruefungen = 0, rot = [];
for(const f of dateien){
  const r = laufe(path.join(testOrdner, f));
  const zeile = r.ausgabe.join(" ");
  const treffer = /(\d+) ok, (\d+) Fehler/.exec(zeile);
  if(r.code === 0 && treffer && treffer[2] === "0"){
    pruefungen += Number(treffer[1]);
  } else {
    rot.push({ datei: f, zeile: zeile || "(keine Ausgabe)", fehler: r.fehlerZeilen });
    if(treffer) pruefungen += Number(treffer[1]);
  }
}

/* ---------- 3) Ergebnis ---------- */
if(syntaxFehler){
  console.error("SYNTAX-FEHLER im Script-Block: " + syntaxFehler);
}
for(const r of rot){
  console.error("--- " + r.datei + ": " + r.zeile);
  r.fehler.slice(0, 12).forEach(z => console.error("    " + z));
  if(r.fehler.length > 12) console.error("    … und " + (r.fehler.length - 12) + " weitere");
}
const heil = !syntaxFehler && rot.length === 0;
console.log(dateien.length + " Dateien, " + pruefungen + " Pruefungen, " +
  rot.length + " mit Fehlern" + (syntaxFehler ? ", Syntax ROT" : ", Syntax ok") +
  (heil ? "  ->  ALLES GRUEN" : "  ->  ROT"));
process.exit(heil ? 0 : 1);
