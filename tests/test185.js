/* v185-Test: zwei Nutzer-Befunde.

   1. ZWEI „Abbrechen" im Aktionsmenue. Das Grundgeruest trug seit je eines,
      und v164 baute zusaetzlich eines an das Ende der Knopfliste. Geblieben ist
      das gebaute (es liegt im selben Container wie die Aktionen und traegt die
      abgesetzte Gestaltung). Der Test haelt beide Haelften fest: genau EINES im
      Quelltext des Menue-Geruests, und die v164-Zusagen gelten weiter.
   2. Die Haken-Leiste der Stufe 1 steht VOR dem Textfeld. Geprueft wird die
      Reihenfolge im erzeugten HTML — nicht die Existenz (das macht test174).
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

/* ---------- 1) Das Aktionsmenue hat genau EIN Abbrechen ---------- */
/* Das Geruest: alles zwischen <div id="menue-hintergrund"> und dem Dialog. */
const geruestVon = src.indexOf('<div id="menue-hintergrund"');
const geruestBis = src.indexOf('<div id="dialog-hintergrund"');
pruefe("das Menue-Geruest ist auffindbar", geruestVon > 0 && geruestBis > geruestVon);
const geruest = src.slice(geruestVon, geruestBis);
pruefe("im Geruest steht KEIN eigener Abbrechen-Knopf",
  !/<button[^>]*>Abbrechen<\/button>/.test(geruest));
pruefe("der Titel und der Knopf-Behaelter sind noch da",
  geruest.includes('id="menue-titel"') && geruest.includes('id="menue-knoepfe"'));

const menue = grabFn("aktionsMenue");
pruefe("das gebaute Abbrechen ist genau einmal da",
  (menue.match(/menue-abbrechen/g) || []).length === 1);
/* Die v164-Zusagen, die weiter gelten sollen: */
pruefe("jedes Aktionsmenue endet mit Abbrechen (v164)", menue.includes("menue-abbrechen"));
pruefe("es steht NACH den Aktionen (v164)",
  menue.indexOf("menueKlick(") < menue.indexOf("menue-abbrechen"));
pruefe("es ist abgesetzt gestaltet (v164)", src.includes("#menue .menue-abbrechen{"));
pruefe("es schliesst das Menue", /menue-abbrechen[^]*?menueSchliessen\(\)/.test(menue));

/* In der GANZEN App darf kein zweiter Weg dasselbe Menue schliessen wollen:
   `menueSchliessen` als onclick gibt es nur noch am Hintergrund und am gebauten
   Knopf. */
pruefe("menueSchliessen haengt nur noch an zwei Stellen",
  (src.match(/onclick="menueSchliessen\(/g) || []).length === 2);
pruefe("eine davon ist der Hintergrund (Tipp daneben schliesst weiter)",
  /<div id="menue-hintergrund" onclick="menueSchliessen\(event\)">/.test(src));

/* ---------- 2) Stufe 1: Haken VOR dem Freitext ---------- */
const abschnitt = grabFn("notizAbschnittHtml");
const iLeiste = abschnitt.indexOf("notizHakenLeisteHtml(p)");
const iText = abschnitt.indexOf("notiz-text");
pruefe("beide Teile sind im Stufe-1-Zweig", iLeiste > 0 && iText > 0);
pruefe("die Haken-Leiste steht VOR dem Textfeld", iLeiste < iText);
pruefe("die Vorschlags-Reihe bleibt beim Textfeld",
  abschnitt.indexOf("notiz-vorschlag-") > iText);
pruefe("es gibt weiterhin nur EINEN Aufruf der Leiste",
  (abschnitt.match(/notizHakenLeisteHtml\(/g) || []).length === 1);
/* Stufe 2 ist davon unberuehrt — dort sitzt der Haken in der Zeile. */
pruefe("Stufe 2 behaelt den Haken in der Zeile",
  abschnitt.includes("notizHakenHtml(p, u, true)"));
pruefe("die Leiste selbst ist unveraendert (nur ihr Platz)",
  grabFn("notizHakenLeisteHtml").includes('class="notiz-erledigt"') &&
  grabFn("notizHakenLeisteHtml").includes("Heute gemacht"));

/* Die Trennlinie muss mitwandern: oben stehend darf sie nicht nach oben
   trennen, sonst schneidet sie den Abschnittsnamen ab. */
const stil = /\.notiz-erledigt\{([^}]*)\}/.exec(src);
pruefe("es gibt ein Stylesheet fuer die Leiste", !!stil);
pruefe("die Linie trennt nach unten", /border-bottom/.test(stil[1]));
pruefe("und nicht mehr nach oben", !/border-top/.test(stil[1]));
pruefe("der Abstand sitzt ebenfalls unten",
  /margin-bottom/.test(stil[1]) && !/margin-top/.test(stil[1]));

/* ---------- 3) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v185",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 185);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.185", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
