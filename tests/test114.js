/* v114-Test: Statistik-Kacheln im Raster (Akkordeon von v110 zurückgebaut).
   Reine Markup-/CSS-Verdrahtung -> struktureller Quelltext-Check: die optionalen
   Statistiken liegen in einem .stat-raster (auto-fit-Grid), das Akkordeon
   (Toggle/Kopf/Inhalt) ist restlos weg, jede Statistik-id aus STAT_OPTIONEN hat
   weiterhin ihre Karte, und die Info-Texte bleiben draußen.
   Die Anzahl wird bewusst NICHT festgenagelt, sondern gegen STAT_OPTIONEN
   geprüft — sonst bricht der Test bei jeder neuen Statistik (v121: Messwerte). */
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

const STAT_OPTIONEN = eval("(" + grabLiteral("STAT_OPTIONEN") + ")");

/* 1) Die optionalen Statistiken liegen im Raster — je Option genau eine Kachel. */
pruefe("stat-raster vorhanden", src.includes('<div class="stat-raster">'));
/* v196: Die Trainings-Kachel traegt zusaetzlich `stat-tap` (sie oeffnet den
   vollen Verlauf, wie Kalender und Koerpergewicht). Die v114-Zusage bleibt:
   je Option genau EINE Kachel — nur das Muster darf den Zusatz vertragen. */
pruefe("je STAT_OPTIONEN-Eintrag eine Kachel",
  (src.match(/class="karte stat-karte[^"]*" id="/g) || []).length === STAT_OPTIONEN.length);
pruefe("mindestens die sechs Kern-Statistiken", STAT_OPTIONEN.length >= 6);
pruefe("Raster nutzt auto-fit-Grid", /\.stat-raster\{[^}]*auto-fit/.test(src));

/* 2) Das Akkordeon (v110) ist restlos entfernt. */
pruefe("kein statToggle mehr", !src.includes("statToggle"));
pruefe("kein statAkkordeonAnwenden mehr", !src.includes("statAkkordeonAnwenden"));
pruefe("kein stat-inhalt mehr", !src.includes("stat-inhalt"));
pruefe("kein stat-kopf mehr", !src.includes("stat-kopf"));

/* 3) Jede optionale Statistik hat weiterhin ihre Karte (Verdrahtung Auswahl->Karte). */
STAT_OPTIONEN.forEach(o => pruefe("Karte vorhanden: " + o[2], src.includes('id="' + o[2] + '"')));

/* 4) Info-Texte bleiben draußen (Nutzer-Wunsch „weniger Text"). */
pruefe("keine Statistik-Info-Knöpfe",
  !src.includes("infoUmschalten('info-volumen')") && !src.includes("infoUmschalten('info-bestwerte')"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
