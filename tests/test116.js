/* v116-Test: Statistik-Kacheln entschlacken. Reine Markup-/CSS-Politur ->
   struktureller Quelltext-Check: kleine, unaufdringliche Kachel-Überschrift,
   kleiner Rund-Knopf, bei Körpergewicht das kleine „+" plus antippbare Kurve
   (öffnet Einträge & Details) statt separatem Knopf. */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Kleine, nicht-fette Kachel-Überschrift. */
pruefe("stat-karte h2 klein gestylt", /\.stat-karte h2\{[^}]*font-size:14px/.test(src));
pruefe("kleiner Rund-Knopf definiert", src.includes("button.rund.klein{"));

/* 2) Körpergewicht: kleines + im Eck. */
pruefe("Gewicht-+ ist klein", src.includes('class="rund klein" onclick="gewichtFormularZeigen()"'));

/* 3) Die Kurve ist die Hauptsache und antippbar -> Details; separater Knopf weg. */
pruefe("Gewicht-Kurve antippbar -> Details",
  src.includes('id="gewicht-diagramm" class="abstand stat-tap" onclick="gewichtDetailsOeffnen()"'));
pruefe("kein separater Einträge-&-Details-Knopf mehr",
  !src.includes('class="schmal breit" onclick="gewichtDetailsOeffnen()"'));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
