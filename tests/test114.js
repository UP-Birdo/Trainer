/* v114-Test: Statistik-Kacheln im Raster (Akkordeon von v110 zurückgebaut).
   Reine Markup-/CSS-Verdrahtung -> struktureller Quelltext-Check: die sechs
   optionalen Statistiken liegen in einem .stat-raster (auto-fit-Grid), das
   Akkordeon (Toggle/Kopf/Inhalt) ist restlos weg, jede Statistik-id aus
   STAT_OPTIONEN hat weiterhin ihre Karte, und die Info-Texte bleiben draußen. */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

function grabLiteral(name){
  const decl = "const " + name + " = ";
  const i = src.indexOf(decl);
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  let start = i + decl.length;
  while(start < src.length && src[start] !== "{" && src[start] !== "[") start++;
  const open = src[start], close = open === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === open) tiefe++;
    else if(src[k] === close){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Die sechs Statistiken liegen im Raster. */
pruefe("stat-raster vorhanden", src.includes('<div class="stat-raster">'));
pruefe("6 Statistik-Karten", (src.match(/class="karte stat-karte"/g) || []).length === 6);
pruefe("Raster nutzt auto-fit-Grid", /\.stat-raster\{[^}]*auto-fit/.test(src));

/* 2) Das Akkordeon (v110) ist restlos entfernt. */
pruefe("kein statToggle mehr", !src.includes("statToggle"));
pruefe("kein statAkkordeonAnwenden mehr", !src.includes("statAkkordeonAnwenden"));
pruefe("kein stat-inhalt mehr", !src.includes("stat-inhalt"));
pruefe("kein stat-kopf mehr", !src.includes("stat-kopf"));

/* 3) Jede optionale Statistik hat weiterhin ihre Karte (Verdrahtung Auswahl->Karte). */
const STAT_OPTIONEN = eval("(" + grabLiteral("STAT_OPTIONEN") + ")");
pruefe("STAT_OPTIONEN hat 6 Einträge", STAT_OPTIONEN.length === 6);
STAT_OPTIONEN.forEach(o => pruefe("Karte vorhanden: " + o[2], src.includes('id="' + o[2] + '"')));

/* 4) Info-Texte bleiben draußen (Nutzer-Wunsch „weniger Text"). */
pruefe("keine Statistik-Info-Knöpfe",
  !src.includes("infoUmschalten('info-volumen')") && !src.includes("infoUmschalten('info-bestwerte')"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
