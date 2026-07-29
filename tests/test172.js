/* v172-Test: Der Notizblock versteht Gewichte — und raeumt hinter sich auf.

   Aus dem Persona-Durchgang „Thomas" (erfahren, Stufe Notizblock):
   „Bankdruecken 3x8 80 kg" ergab Saetze 3, Wdh 8 — und Gewicht 0, weil die
   „80 kg" Teil des NAMENS wurden. Unter dem Namen „Bankdruecken 80 kg" greift
   keine einzige Namens-Zuordnung mehr (Geraet, Muskelkarte, Erklaerung,
   Bibliothek), und die Zahl veraltet mit jeder Steigerung.

   Geprueft wird:
   1. Das Gewicht wird am ZEILENENDE erkannt und der Name bleibt sauber.
   2. Ein Gewicht MITTEN im Namen bleibt unangetastet (Zusage aus v155).
   3. Hin und zurueck ist stabil: Zeile -> Uebung -> Zeile aendert nichts mehr.
   4. „Kein Wert, kein Effekt": Was eine Zeile nicht nennt, aendert sie nicht.
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
function grabConst(name){
  const zeile = new RegExp("^const " + name + "\\s*=\\s*[^;]+;", "m").exec(src);
  if(!zeile) throw new Error("Konstante nicht gefunden: " + name);
  return zeile[0];
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabConst("NOTIZ_MUSTER"),
  grabConst("NOTIZ_PAAR"),
  grabConst("NOTIZ_GEWICHT"),
  grabFn("zahlKurz"),
  grabFn("notizZeileDeuten"),
  grabFn("uebungAlsZeile"),
  grabFn("notizZeileMitName"),
  grabFn("notizVorschlaege"),
  grabFn("toastListe"),
  "function normName(s){ return String(s||'').toLowerCase().replace(/\\s+/g,' ').trim(); }",
  "module.exports = { notizZeileDeuten, uebungAlsZeile, notizZeileMitName," +
  " notizVorschlaege, toastListe, zahlKurz };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Gewicht am Zeilenende ---------- */
const d1 = A.notizZeileDeuten("Bankdrücken 3x8 80 kg");
pruefe("die Zeile wird ueberhaupt gedeutet", !!d1);
pruefe("der Name ist sauber", d1.name === "Bankdrücken");
pruefe("Saetze bleiben die kleinere Zahl", d1.saetze === 3);
pruefe("Wdh bleiben die groessere", d1.wert === 8);
pruefe("das Gewicht ist gelandet", d1.gewicht === 80);
pruefe("der Modus bleibt Wdh", d1.modus === "wdh");

const d2 = A.notizZeileDeuten("Kniebeuge 5 5 82,5 kg");
pruefe("Komma-Gewichte werden verstanden", d2 && d2.gewicht === 82.5);
pruefe("und der Name bleibt trotzdem sauber", d2.name === "Kniebeuge");
pruefe("Punkt-Gewichte genauso",
  A.notizZeileDeuten("Kniebeuge 5 5 82.5 kg").gewicht === 82.5);
pruefe("ohne Leerzeichen vor kg", A.notizZeileDeuten("Kniebeuge 5 5 80kg").gewicht === 80);
pruefe("Grossschreibung stoert nicht", A.notizZeileDeuten("Kniebeuge 5 5 80 KG").gewicht === 80);

/* Auch ohne Mengen: nur ein Gewicht ist eine gueltige Aussage. */
const d3 = A.notizZeileDeuten("Bankdrücken 80 kg");
pruefe("eine Zeile mit NUR Gewicht wird gedeutet", !!d3);
pruefe("ihr Name ist sauber", d3.name === "Bankdrücken");
pruefe("ihr Gewicht steht", d3.gewicht === 80);
pruefe("und sie nennt AUSDRUECKLICH keine Mengen", d3.saetze === null && d3.wert === null);

/* Das lange Muster kennt das Gewicht auch. */
const d4 = A.notizZeileDeuten("Sätze 3 Wdh 10 LH-Bankdrücken 60 kg");
pruefe("das Muster vertraegt ein Gewicht", d4 && d4.gewicht === 60);
pruefe("und behaelt seinen Namen", d4.name === "LH-Bankdrücken");
const d5 = A.notizZeileDeuten("Sätze 3 Zeit 45 Plank 10 kg");
pruefe("auch eine Zeit-Uebung", d5 && d5.modus === "zeit" && d5.wert === 45 && d5.gewicht === 10);

/* ---------- 2) Zusagen aus v155 bleiben ---------- */
const alt = A.notizZeileDeuten("Kurzhantel 20 kg 3 10");
pruefe("ein Gewicht MITTEN im Namen bleibt im Namen", alt.name === "Kurzhantel 20 kg");
pruefe("und wird nicht ins Gewichtsfeld gezogen", alt.gewicht === null);
pruefe("Zahlen im Namen ueberleben weiter",
  A.notizZeileDeuten("500-m-Intervalle 3 10").name === "500-m-Intervalle");
pruefe("nackte Zahlen sind keine Uebung", A.notizZeileDeuten("3 10") === null);
pruefe("ein nacktes Gewicht ist keine Uebung", A.notizZeileDeuten("80 kg") === null);
pruefe("leere Zeile bleibt nichts", A.notizZeileDeuten("   ") === null);
pruefe("eine einzelne Zahl bleibt nichts", A.notizZeileDeuten("Bankdrücken 500") === null);
pruefe("Zeilen ohne alles bleiben nichts", A.notizZeileDeuten("Dehnen nicht vergessen") === null);

/* ---------- 3) Hin und zurueck ist stabil ---------- */
const u = { name:"LH-Bankdrücken", modus:"wdh", saetze:3, wdh:8, gewicht:80 };
const zeile = A.uebungAlsZeile(u);
pruefe("die Uebung wird MIT Gewicht geschrieben", zeile === "Sätze 3 Wdh 8 LH-Bankdrücken 80 kg");
const zurueck = A.notizZeileDeuten(zeile);
pruefe("und exakt so wieder gelesen",
  zurueck.name === u.name && zurueck.saetze === 3 && zurueck.wert === 8 && zurueck.gewicht === 80);
pruefe("zweiter Durchlauf aendert nichts mehr (Fixpunkt)",
  A.uebungAlsZeile({ name:zurueck.name, modus:"wdh", saetze:zurueck.saetze,
                     wdh:zurueck.wert, gewicht:zurueck.gewicht }) === zeile);
pruefe("ohne Gewicht bleibt die Zeile wie frueher",
  A.uebungAlsZeile({ name:"Liegestütze", modus:"wdh", saetze:3, wdh:12, gewicht:0 })
    === "Sätze 3 Wdh 12 Liegestütze");
pruefe("Gewicht 0 haengt kein leeres kg an",
  A.uebungAlsZeile({ name:"Plank", modus:"zeit", saetze:3, dauer:45, gewicht:0 })
    === "Sätze 3 Zeit 45 Plank");
pruefe("Kommazahlen werden deutsch zurueckgeschrieben",
  A.uebungAlsZeile({ name:"Kniebeuge", modus:"wdh", saetze:5, wdh:5, gewicht:82.5 })
    === "Sätze 5 Wdh 5 Kniebeuge 82,5 kg");
pruefe("und wieder gelesen ergibt dieselbe Zahl",
  A.notizZeileDeuten("Sätze 5 Wdh 5 Kniebeuge 82,5 kg").gewicht === 82.5);

/* ---------- 4) Kein Wert, kein Effekt (im Speicher-Pfad) ---------- */
const setzen = grabFn("abschnittTextSetzen");
pruefe("Mengen werden nur bei genannten Mengen gesetzt",
  /if\(m && m\.saetze != null\)\{/.test(setzen));
pruefe("das Gewicht ist eine EIGENE Wache",
  /if\(m && m\.gewicht != null\) u\.gewicht = m\.gewicht;/.test(setzen));
pruefe("eine neue Uebung erfindet weiterhin kein Startgewicht",
  /u\.gewicht = 0; u\.gewichtSchritt = 0;/.test(setzen));

/* ---------- 5) Vorschlaege behalten das Gewicht ---------- */
pruefe("ein Vorschlag ersetzt nur den Namen",
  A.notizZeileMitName("bankdr 3 8 80 kg", "LH-Bankdrücken")
    === "Sätze 3 Wdh 8 LH-Bankdrücken 80 kg");
pruefe("auch wenn nur ein Gewicht dasteht",
  A.notizZeileMitName("bankdr 80 kg", "LH-Bankdrücken") === "LH-Bankdrücken 80 kg");
pruefe("und ohne alles bleibt der Name allein",
  A.notizZeileMitName("bankdr", "LH-Bankdrücken") === "LH-Bankdrücken");
pruefe("die Vorschlagssuche stoert sich nicht am Gewicht",
  A.notizVorschlaege("bankdr 3 8 80 kg", ["LH-Bankdrücken","Kniebeuge"], 5)[0] === "LH-Bankdrücken");

/* ---------- 6) Toast bricht um statt aus dem Bild zu laufen ---------- */
pruefe("zwei Namen stehen voll da", A.toastListe(["A","B"]) === "A, B");
pruefe("der dritte wird gezaehlt", A.toastListe(["A","B","C"]) === "A, B und eine weitere");
pruefe("mehrere werden gezaehlt", A.toastListe(["A","B","C","D"]) === "A, B und 2 weitere");
pruefe("leere Liste bleibt leer", A.toastListe([]) === "");
pruefe("null bleibt leer", A.toastListe(null) === "");
pruefe("der Speicher-Pfad nutzt ihn", /toastListe\(frisch\)/.test(setzen));
pruefe("der Toast darf umbrechen (kein nowrap mehr)",
  !/\.toast\{[^}]*white-space:nowrap/.test(src));
pruefe("und bleibt in seinem Container", /\.toast\{[^}]*max-width:100%/.test(src));
pruefe("der Text bekommt eigenen Umbruch-Spielraum",
  /\.toast > span\{[^}]*min-width:0/.test(src));

/* ---------- 7) Vorschlaege raeumen sich weg ---------- */
pruefe("es gibt eine Schliess-Funktion", /function notizVorschlaegeSchliessen\(/.test(src));
pruefe("das Textfeld raeumt beim Verlassen auf",
  /onblur="notizVorschlaegeSchliessen/.test(src));
pruefe("die Auswahl nutzt dieselbe Funktion",
  /notizVorschlaegeSchliessen\(planId\);/.test(grabFn("notizVorschlagWaehlen")));
pruefe("der Fokus-Trick beim Antippen bleibt",
  /onmousedown="event\.preventDefault\(\)"/.test(grabFn("notizTippen")));
pruefe("die Vorschlags-Reihe bricht um statt zu wischen",
  /\.notiz-vorschlaege\{[^}]*flex-wrap:wrap/.test(src));
pruefe("die Filter-Reihen der Uebungs-Suche bleiben wischbar",
  /\.filter-reihe\{[^}]*overflow-x:auto/.test(src));

/* ---------- 8) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v172",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 172);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.172", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
