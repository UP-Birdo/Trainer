/* v122-Test: Muskelkarte „Beide" + Einfachheits-Zeile unter „Mehr".
   Testbarer Kern ist die eine Übersetzung `muskelAnsichten` („beide" -> die zwei
   echten Index-Karten). Der Rest ist Markup/DOM -> strukturelle Quelltext-Checks:
   die Figuren werden gebaut (statt fester IDs), der Treffer kommt aus dem
   getippten Block, und die Einfachheit ist eine Menü-Zeile wie die anderen. */
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
new Function("module", "exports",
  [grabFn("muskelAnsichten"), "module.exports = { muskelAnsichten };"].join("\n")
)(modul, modul.exports);
const muskelAnsichten = modul.exports.muskelAnsichten;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* 1) muskelAnsichten — „beide" ist keine eigene Karte, sondern zwei echte. */
pruefe("front -> nur front", gleich(muskelAnsichten("front"), ["front"]));
pruefe("back -> nur back", gleich(muskelAnsichten("back"), ["back"]));
pruefe("beide -> front + back (Reihenfolge)", gleich(muskelAnsichten("beide"), ["front", "back"]));
pruefe("ohne Angabe -> front", gleich(muskelAnsichten(), ["front"]));
pruefe("Unsinn bleibt er selbst (kein stiller Fallback auf beide)",
  gleich(muskelAnsichten("quatsch"), ["quatsch"]));

/* 2) Muskelkarte: Figuren gebaut statt feste IDs, Treffer aus dem Block. */
pruefe("Beide-Tab vorhanden", src.includes('id="muskel-tab-beide"') && src.includes("muskelAnsicht('beide')"));
pruefe("Figuren-Behälter vorhanden", src.includes('id="muskel-figuren"'));
pruefe("alte Einzel-IDs entfernt", !src.includes('id="muskel-canvas"') && !src.includes('id="muskel-img"'));
pruefe("Figur-Block trägt seine Ansicht", src.includes('data-ansicht="'));
pruefe("Treffer liest den getippten Block", src.includes('e.currentTarget.closest(".muskel-figur")'));
pruefe("Canvas wird je Ansicht gesucht", src.includes("function muskelCanvasFuer("));
pruefe("Malen/Heatmap decken mehrere Figuren ab",
  /function muskelMalen\(ansicht\)/.test(src) && /function muskelHeatmapZeichnen\(ansicht\)/.test(src));
pruefe("CSS für zwei Figuren nebeneinander", /\.muskel-figuren\.muskel-doppelt/.test(src));

/* 3) Einfachheit unter „Mehr": Menü-Zeile im gleichen Look, Stufe im Namen,
      Erklärtext in der Auswahl statt auf der Mehr-Seite. */
pruefe("Einfachheit ist eine einst-zeile",
  /class="breit einst-zeile" onclick="simpelheitFrageOeffnen\(false\)"/.test(src));
/* v156: Die NUMMER ist aus der Zeile raus — sie stünde in der Auswahl rückwärts
   und ist nur noch eine interne Kennung. Der v122-Kern bleibt: Die Zeile trägt
   den aktuellen Stand IM Namen, nicht in einer zusätzlichen Zeile darunter. */
pruefe("Label trägt den aktuellen Stand", src.includes('"Einfachheit: " + s.titel'));
pruefe("Zeilen-Zeichner ersetzt die Karte",
  src.includes("function simpelheitZeileZeichnen(") && !src.includes("simpelheitKarteZeichnen"));
pruefe("alter Info-Block der Mehr-Seite weg",
  !src.includes("info-simpelheit") && !src.includes('id="simpelheit-stand"'));
pruefe("Erklärtext steht in der Stufen-Auswahl",
  src.includes('document.getElementById("simpelheit-hinweis").textContent'));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
