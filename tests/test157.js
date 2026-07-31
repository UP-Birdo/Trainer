/* v157-Test: Vorschlaege beim Tippen im Notizblock.
   Drei reine Bausteine: `notizAktuelleZeile` (welche Zeile unter dem Cursor),
   `notizVorschlaege` (was passt) und `notizZeileMitName` (Name ersetzen, Mengen
   behalten). Dazu die Verdrahtung — inklusive des Fokus-Tricks, ohne den der
   angefangene Name beim Antippen sofort als Uebung angelegt wuerde.
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
function grabLine(anfang){
  const zeile = src.split("\n").find(z => z.trim().startsWith(anfang));
  if(!zeile) throw new Error("Zeile nicht gefunden: " + anfang);
  return zeile.trim();
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabLine("const NOTIZ_MUSTER"),
  grabLine("const NOTIZ_PAAR"),
  grabLine("const NOTIZ_GEWICHT"),   // v172: Gewicht am Zeilenende
  grabFn("normName"),
  grabFn("zahlKurz"),                // v172: notizZeileMitName schreibt das Gewicht mit
  grabFn("notizZeileDeuten"),
  grabFn("notizVorschlaege"),
  grabFn("notizZeileMitName"),
  "module.exports = { notizVorschlaege, notizZeileMitName };"
].join("\n"))(modul, modul.exports);
const { notizVorschlaege, notizZeileMitName } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const NAMEN = ["LH-Bankdrücken", "KH-Bankdrücken", "Schrägbankdrücken KH", "Kniebeugen",
               "Liegestütze", "Bankdrücken-Eigenbau", "Klimmzüge"];

/* ---------- 1) Welche Zeile ist gemeint? ----------
   Bis v197 musste die App das aus der Cursor-Position im Textfeld ausrechnen
   (`notizAktuelleZeile`). Seit dem Zeilen-Umbau v198 IST jede Zeile ein
   eigenes Feld — die Frage stellt sich nicht mehr, und die Rechnung ist
   ersatzlos entfallen. Der Test haelt fest, dass sie nicht zurueckkommt und
   dass die Vorschlaege stattdessen direkt vom Feldinhalt kommen. */
pruefe("die Cursor-Rechnung ist entfallen", !src.includes("function notizAktuelleZeile("));
pruefe("und niemand ruft sie noch", !src.includes("notizAktuelleZeile("));
pruefe("die Vorschlaege kommen direkt aus dem Feld",
  grabFn("notizZeileTippen").includes("notizVorschlaege(feld.value, alleUebungsNamen(), 5)"));

/* ---------- 2) Was wird vorgeschlagen? ---------- */
pruefe("Treffer am Anfang stehen vorn",
  notizVorschlaege("bankdr", NAMEN, 5)[0] === "Bankdrücken-Eigenbau");
pruefe("Treffer in der Mitte kommen danach",
  notizVorschlaege("bankdr", NAMEN, 5).includes("LH-Bankdrücken"));
pruefe("Gross- und Kleinschreibung egal",
  notizVorschlaege("KNIEBEU", NAMEN, 5).length === 1);
pruefe("ein Buchstabe schlaegt nichts vor", notizVorschlaege("b", NAMEN, 5).length === 0);
pruefe("leere Zeile schlaegt nichts vor", notizVorschlaege("", NAMEN, 5).length === 0);
pruefe("fertig getippter Name schlaegt sich nicht selbst vor",
  !notizVorschlaege("Kniebeugen", NAMEN, 5).includes("Kniebeugen"));
pruefe("die Obergrenze wird eingehalten", notizVorschlaege("bankdr", NAMEN, 2).length === 2);
pruefe("ohne Treffer bleibt es leer", notizVorschlaege("xyzabc", NAMEN, 5).length === 0);
/* Mengen in der Zeile duerfen die Suche nicht stoeren. */
pruefe("Mengen vor dem Namen stoeren nicht",
  notizVorschlaege("kniebeu 3 10", NAMEN, 5)[0] === "Kniebeugen");
pruefe("auch das ausdrueckliche Muster stoert nicht",
  notizVorschlaege("Sätze 3 Wdh 10 kniebeu", NAMEN, 5)[0] === "Kniebeugen");

/* ---------- 3) Name ersetzen, Mengen behalten ---------- */
pruefe("ohne Mengen bleibt nur der Name",
  notizZeileMitName("bankdr", "LH-Bankdrücken") === "LH-Bankdrücken");
pruefe("Kurzform wird zur Muster-Zeile",
  notizZeileMitName("bankdr 3 10", "LH-Bankdrücken") === "Sätze 3 Wdh 10 LH-Bankdrücken");
pruefe("verdrehte Zahlen werden dabei gerade gezogen",
  notizZeileMitName("bankdr 10 3", "LH-Bankdrücken") === "Sätze 3 Wdh 10 LH-Bankdrücken");
pruefe("Zeit-Uebungen bleiben Zeit-Uebungen",
  notizZeileMitName("Sätze 3 Zeit 45 pla", "Plank") === "Sätze 3 Zeit 45 Plank");
pruefe("leere Zeile ergibt den Namen", notizZeileMitName("", "Dips") === "Dips");

/* ---------- 4) Verdrahtung (v198: an der ZEILE statt am Abschnitt) ---------- */
const html = grabFn("notizZeileHtml");
pruefe("jede Zeile meldet ihr Tippen", html.includes('oninput="notizZeileTippen(this)"'));
pruefe("jede Zeile hat ihre eigene Vorschlags-Reihe",
  html.includes('class="filter-reihe notiz-vorschlaege"'));
pruefe("sie startet versteckt", html.includes('notiz-vorschlaege" hidden'));
const tippen = grabFn("notizZeileTippen");
pruefe("gesucht wird in ALLEN bekannten Namen", tippen.includes("alleUebungsNamen()"));
pruefe("ohne Treffer bleibt die Reihe versteckt", tippen.includes("ziel.hidden = treffer.length === 0"));
pruefe("gefuellt wird die Reihe DIESER Zeile", tippen.includes("notizVorschlagsReihe(feld)"));
pruefe("der Fokus bleibt im Feld (sonst legt onchange den Halbsatz an)",
  tippen.includes('onmousedown="event.preventDefault()"'));
const waehlen = grabFn("notizVorschlagWaehlen");
pruefe("Auswaehlen ersetzt nur die eine Zeile", waehlen.includes("notizZeileMitName(feld.value, name)"));
pruefe("der Cursor landet hinter dem Eingesetzten", waehlen.includes("setSelectionRange(cursor, cursor)"));
/* v172: Das Schliessen liegt jetzt in einer eigenen Funktion — es gibt seither
   einen zweiten Ausloeser (Verlassen des Feldes), und beide sollen dasselbe
   tun. Geprueft wird die Delegation UND dass die Funktion wirklich schliesst. */
pruefe("danach ist die Reihe wieder zu",
  waehlen.includes("notizVorschlaegeSchliessen(feld)") &&
  grabFn("notizVorschlaegeSchliessen").includes("ziel.hidden = true"));
pruefe("gespeichert wird weiter erst beim Verlassen",
  !waehlen.includes("abschnittTextSetzen") && !waehlen.includes("notizZeilenSpeichern"));
const pool = grabFn("alleUebungsNamen");
pruefe("der Namens-Vorrat kennt Kraft, Drills und eigene",
  pool.includes("UEBUNGEN_DB") && pool.includes("SPORT_UEBUNGEN") && pool.includes("eigeneUebungen"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
