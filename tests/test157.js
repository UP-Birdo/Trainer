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
  grabFn("notizAktuelleZeile"),
  grabFn("notizVorschlaege"),
  grabFn("notizZeileMitName"),
  "module.exports = { notizAktuelleZeile, notizVorschlaege, notizZeileMitName };"
].join("\n"))(modul, modul.exports);
const { notizAktuelleZeile, notizVorschlaege, notizZeileMitName } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const NAMEN = ["LH-Bankdrücken", "KH-Bankdrücken", "Schrägbankdrücken KH", "Kniebeugen",
               "Liegestütze", "Bankdrücken-Eigenbau", "Klimmzüge"];

/* ---------- 1) Welche Zeile steht unter dem Cursor? ---------- */
const text = "Kniebeugen\nBankdr\nKlimmzüge";
pruefe("erste Zeile", notizAktuelleZeile(text, 3).text === "Kniebeugen");
pruefe("Cursor ganz am Anfang", notizAktuelleZeile(text, 0).text === "Kniebeugen");
pruefe("mittlere Zeile", notizAktuelleZeile(text, 14).text === "Bankdr");
pruefe("letzte Zeile", notizAktuelleZeile(text, text.length).text === "Klimmzüge");
pruefe("Anfang und Ende zeigen auf die Zeile",
  (() => { const z = notizAktuelleZeile(text, 14); return text.slice(z.start, z.ende) === "Bankdr"; })());
pruefe("ohne Cursor-Angabe zaehlt das Ende", notizAktuelleZeile(text).text === "Klimmzüge");
pruefe("Cursor hinter dem Text wird geklemmt", notizAktuelleZeile(text, 9999).text === "Klimmzüge");
pruefe("leerer Text ergibt eine leere Zeile", notizAktuelleZeile("", 0).text === "");
pruefe("eine Zeile ohne Umbruch", notizAktuelleZeile("Dips", 2).text === "Dips");

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

/* ---------- 4) Verdrahtung ---------- */
const html = grabFn("notizAbschnittHtml");
pruefe("die Textarea meldet jedes Tippen",
  html.includes('oninput="notizTippen(this,') && !html.includes('oninput="notizTextWachsen(this)"'));
pruefe("es gibt eine Reihe fuer die Vorschlaege", html.includes("notiz-vorschlag-' + p.id"));
pruefe("sie startet versteckt", html.includes('class="filter-reihe notiz-vorschlaege"') && html.includes("hidden></div>"));
const tippen = grabFn("notizTippen");
pruefe("beim Tippen waechst das Feld weiter mit", tippen.includes("notizTextWachsen(el)"));
pruefe("die Vorschlaege kommen aus der aktuellen Zeile",
  tippen.includes("notizAktuelleZeile(el.value, el.selectionStart)"));
pruefe("gesucht wird in ALLEN bekannten Namen", tippen.includes("alleUebungsNamen()"));
pruefe("ohne Treffer bleibt die Reihe versteckt", tippen.includes("ziel.hidden = treffer.length === 0"));
pruefe("der Fokus bleibt im Feld (sonst legt onchange den Halbsatz an)",
  tippen.includes('onmousedown="event.preventDefault()"'));
const waehlen = grabFn("notizVorschlagWaehlen");
pruefe("Auswaehlen ersetzt nur die eine Zeile", waehlen.includes("notizZeileMitName(z.text, name)"));
pruefe("der Cursor landet hinter dem Eingesetzten", waehlen.includes("setSelectionRange(cursor, cursor)"));
/* v172: Das Schliessen liegt jetzt in einer eigenen Funktion — es gibt seither
   einen zweiten Ausloeser (Verlassen des Feldes), und beide sollen dasselbe
   tun. Geprueft wird die Delegation UND dass die Funktion wirklich schliesst. */
pruefe("danach ist die Reihe wieder zu",
  waehlen.includes("notizVorschlaegeSchliessen(planId)") &&
  grabFn("notizVorschlaegeSchliessen").includes("ziel.hidden = true"));
pruefe("gespeichert wird weiter erst beim Verlassen", !waehlen.includes("abschnittTextSetzen"));
const pool = grabFn("alleUebungsNamen");
pruefe("der Namens-Vorrat kennt Kraft, Drills und eigene",
  pool.includes("UEBUNGEN_DB") && pool.includes("SPORT_UEBUNGEN") && pool.includes("eigeneUebungen"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
