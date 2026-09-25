/* v190-Test: drei Nutzer-Ansagen aus derselben Richtung — weniger Text.

   1. Ziele auf „Heute": kein Leer-Satz mehr, nur der Knopf.
   2. Serien-Karte: unter der Flamme steht nichts; der Meilenstein wandert in
      die „i"-Zeile zu den Kennzahlen.
   3. Stufen-Auswahl: die Karte traegt nur den Titel, der Rest liegt hinter
      einem „i" NEBEN der Karte (nicht darin — Knopf im Knopf ist ungueltig).
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
function grabLiteral(name){
  const i = src.indexOf("const " + name + " = ");
  if(i < 0) throw new Error("Literal nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf("[", i); k < src.length; k++){
    if(src[k] === "[") tiefe++;
    else if(src[k] === "]"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabLiteral("SERIEN_MEILENSTEINE"),
  grabFn("serienMeilenstein"),
  grabFn("meilensteinText"),
  "module.exports = { SERIEN_MEILENSTEINE, serienMeilenstein, meilensteinText };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Ziele auf Heute ---------- */
const zieleFn = grabFn("zieleStartZeichnen");
/* Geprueft wird die AUSGABE (der Satz als HTML-Inhalt), nicht die Erwaehnung:
   Der Begruendungs-Kommentar und der Neuigkeiten-Eintrag nennen ihn zu Recht. */
pruefe("der Leer-Satz wird nicht mehr ausgegeben", !/>Noch kein Ziel gesetzt/.test(zieleFn));
pruefe("der Knopf bleibt", zieleFn.includes(">Ziel anlegen<"));
pruefe("die Ueberschrift bleibt", zieleFn.includes("<h2>Ziele</h2>"));
/* Die Karte darf nicht auftauchen, solange es weder Ziel noch Plan-Uebung gibt
   (v111) — das war schon so und muss so bleiben. */
pruefe("ohne Ziel UND ohne Plan-Uebung bleibt es leer (v111)",
  /ziele\.length === 0 && uebungen\.length === 0.*\{ ziel\.innerHTML = ""; return; \}/.test(zieleFn));
pruefe("und auch sonst nirgends mehr in der App",
  !/>Noch kein Ziel gesetzt/.test(src));
/* Die Ziele-ANSICHT (view-ziele) hat einen eigenen Leer-Zustand — seit 0.251
   aus dem UPCrew-Baustein, mit Knopf statt Satz. */
pruefe("die Ziele-Ansicht hat ihren eigenen Leer-Zustand",
  src.includes('zustandLeerHtml({ symbol:"ziel", text:"Kein Ziel",'));

/* ---------- 2) Meilenstein-Text ---------- */
pruefe("ohne Serie kein Text", A.meilensteinText(0) === "");
pruefe("vor der ersten Marke steht, wie weit es noch ist",
  A.meilensteinText(3) === "noch 4 bis zur ersten Meilenstein-Flamme (7)");
pruefe("eine erreichte Marke wird genannt",
  A.meilensteinText(7) === "7er-Serie · noch 23 bis 30");
pruefe("dazwischen bleibt die letzte Marke stehen",
  A.meilensteinText(20) === "7er-Serie · noch 10 bis 30");
pruefe("bei der hoechsten Marke gibt es kein Danach",
  A.meilensteinText(100) === "100er-Serie · stärkste Marke erreicht");
pruefe("darueber hinaus bleibt es dabei",
  A.meilensteinText(150) === "100er-Serie · stärkste Marke erreicht");
pruefe("der Text traegt kein Emoji mehr (er steht jetzt im i)",
  ["🔥"].every(e => !A.meilensteinText(7).includes(e)));
pruefe("es kommt immer ein String", typeof A.meilensteinText(0) === "string" &&
  typeof A.meilensteinText(9) === "string");

/* Unter der Flamme steht nichts mehr. */
pruefe("die Meilenstein-Zeile ist aus dem HTML raus", !src.includes('id="serie-meilenstein"'));
pruefe("und ihre Zeichen-Funktion ebenfalls", !src.includes("meilensteinZeileZeichnen"));
pruefe("die Flamme selbst bleibt", src.includes('id="tag-streak-zahl"'));
pruefe("die 7-Tage-Vorschau bleibt", src.includes('id="wochen-vorschau"'));
const kenn = grabFn("kennzahlenZeichnen");
pruefe("der Meilenstein steht jetzt in der i-Zeile", kenn.includes("meilensteinText(serie)"));
pruefe("er haengt hinten an den Kennzahlen",
  /diesen Monat" \+\s*\(meilenstein \? " · " \+ meilenstein : ""\)/.test(kenn));
pruefe("ohne Meilenstein bleibt die Zeile unveraendert",
  kenn.includes('(meilenstein ? " · " + meilenstein : "")'));
pruefe("das i der Karte oeffnet weiterhin genau diese Zeile",
  src.includes("infoUmschalten('statistik-klein')"));

/* ---------- 3) Stufen-Auswahl ---------- */
/* 0.251 (Nutzer-Entscheidung): Die Karte zeigt ein BILD statt Text, dazu Name
   und ein, zwei Woerter (UPCrew-Standard). Das „i" daneben ist damit entfallen;
   die v190-Zusage „kein Satz unter der Ueberschrift" gilt weiter — sichtbar ist
   kein Satz, die ausfuehrliche Fassung ist die Vorlese-Beschriftung. */
const stufen = grabFn("simpelheitFrageZeichnen");
pruefe("die Karte traegt Titel und Kurzform",
  stufen.includes("<strong>' + text(s.titel) + '</strong>") &&
  stufen.includes("<small>' + text(s.kurz) + '</small>"));
pruefe("die Karte traegt das Bild der Stufe", stufen.includes("s.bild"));
pruefe("kein Satz sichtbar: fuer und text nur in der Vorlese-Beschriftung",
  /aria-label="' \+ text\(s\.titel \+ ": " \+ s\.fuer \+ " " \+ s\.text\)/.test(stufen) &&
  !/<small>' \+ text\(s\.(fuer|text)\)/.test(stufen));
pruefe("das Bild ist fuer Vorleseprogramme stumm", stufen.includes('class="stufe-bild" aria-hidden="true"'));
pruefe("kein Knopf im Knopf (kein i mehr in der Karte)", !stufen.includes("info-knopf"));
pruefe("die Auswahl selbst funktioniert unveraendert",
  stufen.includes("simpelheitWaehlen(' + s.n + ')"));
pruefe("die aktuelle Stufe bleibt markiert",
  stufen.includes('(s.n === jetzt ? " gewaehlt" : "")'));
pruefe("es gibt ein Stylesheet fuer die Bild-Karten", /\.stufe-wahl\.mit-bild\{[^}]*display:flex/.test(src));
pruefe("die alte Reihe Karte + i ist weg", !/\.stufe-reihe\{/.test(src));
/* v173 bleibt gueltig: die gewaehlte Karte ist lesbar — auch ihr Bild. */
pruefe("die v173-Lesbarkeitsregel steht weiterhin da",
  /\.stufe-wahl\.gewaehlt strong\{color:#16181C\}/.test(src));
pruefe("und das Bild wird auf Gelb ebenfalls dunkel",
  /\.stufe-wahl\.gewaehlt \.stufe-bild\{color:#16181C\}/.test(src));
/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v190",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 190);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.190", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
