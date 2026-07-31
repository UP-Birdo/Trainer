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

/* ---------- 2) Stufe 1: der Haken sitzt IN der Zeile ----------
   Der urspruengliche Wunsch (47. Runde) lautete: „Die Checkbox gehoert IN die
   Zeile des Freitextes." v174 legte die Haken darunter, v185 darueber — beide
   Male, weil eine Textarea keine Knoepfe zwischen ihren Zeilen tragen kann.
   v198 hat die Textarea durch echte Zeilen ersetzt und damit den Wunsch selbst
   erfuellt; die Leiste ist entfallen. Was hier stand (Reihenfolge Leiste/Text),
   ist damit gegenstandslos — geprueft wird jetzt, dass der Umweg nicht
   zurueckkommt. */
const abschnitt = grabFn("notizAbschnittHtml");
pruefe("die eigene Haken-Leiste ist weg", !src.includes("function notizHakenLeisteHtml("));
pruefe("und ihr Stylesheet auch", !/\.notiz-erledigt\{/.test(src));
pruefe("Stufe 1 zeigt nur noch den Block", abschnitt.includes("notizZeilenHtml(p)"));
const zeile = grabFn("notizZeileHtml");
const iHaken = zeile.indexOf("notizHakenHtml(p, z.uebung, true)");
const iFeld = zeile.indexOf('class="notiz-feld"');
pruefe("beide Teile sind in der Zeile", iHaken > 0 && iFeld > 0);
pruefe("der Haken steht VOR dem Feld", iHaken < iFeld);
pruefe("die Vorschlags-Reihe steht darunter",
  zeile.indexOf("notiz-vorschlaege") > iFeld);
/* Stufe 2 ist davon unberuehrt — dort sass der Haken schon seit v174 richtig. */
pruefe("Stufe 2 behaelt den Haken in der Zeile",
  abschnitt.includes("notizHakenHtml(p, u, true)"));

/* ---------- 3) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v185",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 185);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.185", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
