/* v128-Test: Mehrfach-Auswahl von Plaenen (v47 zurueckgeholt, diesmal bewusst
   ueber das Menue statt automatisch beim Langdruck).
   Kern sind zwei reine Funktionen: `auswahlText` (1 Plan / N Plaene) und
   `eintraegeZurueck` (ein Rueckgaengig fuer die ganze Aktion — alle geloeschten
   Plaene muessen an ihre alten Positionen zurueck).
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
  grabFn("auswahlText"), grabFn("eintraegeZurueck"),
  "module.exports = { auswahlText, eintraegeZurueck };"
].join("\n"))(modul, modul.exports);
const { auswahlText, eintraegeZurueck } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const namen = liste => liste.map(p => p.name).join(",");

/* 1) auswahlText — Einzahl/Mehrzahl aus EINER Quelle. */
pruefe("Einzahl", auswahlText(1) === "1 Plan");
pruefe("Mehrzahl", auswahlText(3) === "3 Pläne");
pruefe("Null ist Mehrzahl", auswahlText(0) === "0 Pläne");

/* 2) eintraegeZurueck — die Positionen stimmen nach dem Sammel-Loeschen wieder. */
const alle = () => [{name:"A"},{name:"B"},{name:"C"},{name:"D"},{name:"E"}];

// Zwei aus der Mitte loeschen (B=1, D=3) und zurueckholen.
let liste = alle();
let entfernt = [{ p: liste[1], i: 1 }, { p: liste[3], i: 3 }];
liste = liste.filter(p => p.name !== "B" && p.name !== "D");
pruefe("nach dem Loeschen bleiben A,C,E", namen(liste) === "A,C,E");
eintraegeZurueck(liste, entfernt);
pruefe("zurueck an die alten Plaetze", namen(liste) === "A,B,C,D,E");

// Auch wenn die Liste absteigend uebergeben wird (Reihenfolge darf egal sein).
liste = alle();
entfernt = [{ p: liste[3], i: 3 }, { p: liste[1], i: 1 }];
liste = liste.filter(p => p.name !== "B" && p.name !== "D");
eintraegeZurueck(liste, entfernt);
pruefe("Reihenfolge der Uebergabe egal", namen(liste) === "A,B,C,D,E");

// Erster und letzter Eintrag.
liste = alle();
entfernt = [{ p: liste[0], i: 0 }, { p: liste[4], i: 4 }];
liste = liste.filter(p => p.name !== "A" && p.name !== "E");
eintraegeZurueck(liste, entfernt);
pruefe("Rand-Positionen stimmen", namen(liste) === "A,B,C,D,E");

// Alle loeschen und zurueckholen.
liste = alle();
entfernt = liste.map((p, i) => ({ p, i }));
liste = [];
eintraegeZurueck(liste, entfernt);
pruefe("alles zurueck", namen(liste) === "A,B,C,D,E");

// Index groesser als die Liste (Plan wurde zwischenzeitlich anders gefiltert).
liste = [{name:"A"}];
eintraegeZurueck(liste, [{ p:{name:"Z"}, i: 99 }]);
pruefe("zu grosser Index haengt hinten an", namen(liste) === "A,Z");
pruefe("leere Entfernt-Liste aendert nichts",
  namen(eintraegeZurueck([{name:"A"}], [])) === "A");

/* 3) Verdrahtung: Einstieg, Sperre, EIN Rueckgaengig, sauberes Ende. */
pruefe("Menue-Eintrag Auswaehlen", /text:"Auswählen", tun: planAuswahlStarten/.test(src));
pruefe("Kaestchen starten leer", grabFn("planAuswahlStarten").includes("planAuswahl.clear()"));
pruefe("Tipp hakt an statt zu oeffnen",
  /if\(planAuswahlModus\)\{ planAuswahlUmschalten\(planId\); return; \}/.test(src));
pruefe("Langdruck-Menue ist im Modus gesperrt",
  grabFn("planMenue").includes("if(planAuswahlModus) return;"));
pruefe("Start/Erledigt sind im Modus weg", src.includes('(planAuswahlModus ? "" :'));
pruefe("Loeschen nur mit Auswahl",
  grabFn("planAuswahlLeisteHtml").includes('(n ? \'<button class="schmal gefahr"'));
pruefe("EIN Toast mit Rueckgaengig fuer die ganze Aktion", (() => {
  const f = grabFn("planAuswahlLoeschen");
  return (f.match(/zeigenToast\(/g) || []).length === 2 &&   // gelöscht + wiederhergestellt
         f.includes("eintraegeZurueck(sitzung.daten.plaene, betroffen)");
})());
pruefe("jeder geloeschte Plan geht in den Papierkorb",
  grabFn("planAuswahlLoeschen").includes('inPapierkorb("plan"'));
pruefe("Tabwechsel beendet den Modus",
  grabFn("navGehe").includes("planAuswahlModus = false"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
