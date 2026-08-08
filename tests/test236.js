/* 0.236.0-Test: Vorschau-Politur (61A) + Heatmap-Altlast.

   Die zwei Zusagen der Version:
   1. In der VORSCHAU gibt es keine gepunkteten `tippbar`-Linien mehr — die
      ganze Zeile ist der Knopf (kurzer Tipp: Erklaerung bzw. Pausen-Menue),
      der Langdruck (v220, Verschieben/Pause) bleibt daneben bestehen.
   2. Im TRAINING bleibt die Unterstreichung am Uebungsnamen — dort gibt es
      keine Zeile, die man stattdessen antippen koennte.
   (Dass die Heatmap-Kette restlos weg ist, prueft test86 Abschnitt 3.)
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

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die Vorschau kennt kein tippbar mehr ---------- */
const vz = grabFn("vorschauZeichnen");
/* Das erzeugte HTML traegt die Klasse nirgends mehr (ein Kommentar darf das
   Wort weiter nennen — geprueft wird der Markup-Baustein). */
pruefe("vorschauZeichnen vergibt die Klasse tippbar nirgends mehr",
  !vz.includes('class="tippbar') && !vz.includes("vs-pause tippbar"));
pruefe("die Pausen-Zeile bleibt der Knopf (ohne Unterstreichung)",
  vz.includes('\'<div class="vs-pause" role="button" onclick="vorschauPauseMenue(\''));
pruefe("die ganze Uebungs-Zeile traegt den Erklaerungs-Klick",
  /const klick = uebungErklaerbar\(titel\)/.test(vz) &&
  vz.includes('onclick="uebungErklaerungZeigen(') &&
  vz.includes('\'<div class="vs-zeile auf-fokus"\' + griff + klick'));
pruefe("nur erklaerbare Uebungen bekommen ihn (sonst leer)", /: "";/.test(vz));
pruefe("der Langdruck-Griff der Zeile bleibt (v220)", vz.includes('data-vs-uebung="'));
pruefe("und wird nach dem Zeichnen neu gebunden", vz.includes("langdruckEinrichten()"));

/* ---------- 2) Sichtbarkeit: Cursor statt Linie ---------- */
pruefe("CSS: Zeile und Pausen-Zeile zeigen den Zeiger",
  src.includes('.vs-zeile[role="button"],.vs-pause[role="button"]{cursor:pointer}'));

/* ---------- 3) Das Training behaelt seinen Hinweis ---------- */
pruefe("CSS .uebungsname.tippbar steht noch", src.includes(".uebungsname.tippbar"));
pruefe("der Trainings-Name wird weiter tippbar gemacht",
  src.includes('el.classList.add("tippbar")'));

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.236.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 236000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.236.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
