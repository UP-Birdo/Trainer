/* v86-Test: feine Uebung->Muskel-Zuordnung.
   (Die Heatmap-Teile — heatAlpha, trainierteMuskeln — sind mit 0.236.0
   abgebaut; die Zuordnung ist weiter die Grundlage aller Muskel-Rechnungen.)
   Extrahiert die ECHTEN Daten/Funktionen aus index.html (nie kopieren). */
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
/* v211: grabConst sucht die naechste Klammer und taugt darum nur fuer Objekte
   und Felder — bei `const X = 10;` griffe es bis zur uebernaechsten Konstante.
   Fuer schlichte Werte dieser Leser: bis zum ersten Semikolon. */
function grabZahl(name){
  const t = new RegExp("^const " + name + " = [^;\\n]*;", "m").exec(src);
  if(!t) throw new Error("const nicht gefunden: " + name);
  return t[0];
}
function grabConst(name){
  const i = src.indexOf("const " + name + " =");
  if(i < 0) throw new Error("const nicht gefunden: " + name);
  let s = i; while(src[s] !== "{" && src[s] !== "[") s++;
  const auf = src[s], zu = auf === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = s; k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const code = [
  // v139: Karten-Definition + abgeleitete Kurznamen (wie in der App), dazu die
  // Alias-Schicht und die Satz-Auflösung, die uebungMuskeln jetzt benutzt.
  grabConst("MUSKELKARTEN"),
  "const MUSKELKARTE_AKTIV = 'standard';",
  grabFn("muskelKarteDef"),
  "const MUSKEL_ORDER = muskelKarteDef().order;",
  "const MUSKEL_SEITE = muskelKarteDef().seite;",
  grabConst("MUSKEL_INFO"),
  grabConst("KAT_MUSKELN"), grabConst("UEBUNGEN_DB"), grabConst("UEBUNG_MUSKELN"),
  grabFn("muskelAufKarte"), grabFn("muskelnAufKarte"), grabFn("uebungMuskelSatz"),
  // v140: uebungMuskeln kennt jetzt auch Sportart-Drills und teilt sich die
  // Anzeige-Form mit ihnen.
  grabConst("SPORT_MUSKELN"), grabFn("muskelSatzAnzeige"),
  grabFn("normName"), grabFn("uebungMuskeln"),
  "module.exports = { MUSKEL_ORDER, MUSKEL_SEITE, UEBUNGEN_DB, UEBUNG_MUSKELN," +
  " uebungMuskeln };"
].join("\n");

const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Vollstaendigkeit + Integritaet der feinen Zuordnung.
   v139: Ein Eintrag ist entweder eine Liste (nur primaer) ODER {p,s} mit
   Sekundaermuskeln — beide Formen muessen hier durchgehen. */
const primaer = e => Array.isArray(e) ? e : ((e && e.p) || []);
const alleMuskeln = e => Array.isArray(e) ? e : ((e && e.p) || []).concat((e && e.s) || []);
pruefe("Jede DB-Uebung hat eine feine Zuordnung",
  T.UEBUNGEN_DB.every(u => primaer(T.UEBUNG_MUSKELN[u.name]).length > 0));
pruefe("Alle Muskel-Schluessel gueltig",
  Object.values(T.UEBUNG_MUSKELN).every(e => alleMuskeln(e).every(m => T.MUSKEL_ORDER.indexOf(m) >= 0)));
pruefe("Keine Zuordnungs-Leiche (Name nicht in DB)",
  Object.keys(T.UEBUNG_MUSKELN).every(n => T.UEBUNGEN_DB.some(u => u.name === n)));
pruefe("MUSKEL_SEITE deckt alle 19 Muskeln (front/back)",
  T.MUSKEL_ORDER.every(m => ["front","back"].indexOf(T.MUSKEL_SEITE[m]) >= 0));

/* 2) uebungMuskeln: Muskeln + Ansichtswahl (Primaer-Muskel entscheidet) */
const km = T.uebungMuskeln("Kniebeugen");
pruefe("Kniebeugen -> Quadriceps+Glutes, vorne",
  km.muskeln.indexOf("quadriceps") >= 0 && km.muskeln.indexOf("glutes") >= 0 && km.ansicht === "front");
pruefe("LH-Bankdruecken -> Brust, vorne",
  T.uebungMuskeln("LH-Bankdrücken").muskeln.indexOf("pectoral") >= 0 && T.uebungMuskeln("LH-Bankdrücken").ansicht === "front");
pruefe("Klimmzuege -> Latissimus, hinten",
  T.uebungMuskeln("Klimmzüge").muskeln.indexOf("latissimus") >= 0 && T.uebungMuskeln("Klimmzüge").ansicht === "back");
pruefe("Rum. Kreuzheben -> Hamstrings, hinten",
  T.uebungMuskeln("Rumän. Kreuzheben").muskeln.indexOf("hamstrings") >= 0 && T.uebungMuskeln("Rumän. Kreuzheben").ansicht === "back");
pruefe("Normalisiert (Kleinschreibung)", T.uebungMuskeln("kniebeugen") && T.uebungMuskeln("kniebeugen").muskeln.indexOf("quadriceps") >= 0);
pruefe("Unbekannt -> null", T.uebungMuskeln("Voellig Erfundene Uebung XYZ") === null);

/* 3) 0.236.0: die Heatmap-Kette ist restlos abgebaut — nichts davon kehrt
      unbemerkt zurueck. */
["function heatAlpha(", "function trainierteMuskeln(", "function miniHeatFigur(",
 "function muskelHeatmapAufCanvas(", "function muskelHeatmapZeichnen(",
 "function heatLegendeHtml(", "const HEAT_MAX_ALPHA"].forEach(rest =>
  pruefe("Altlast weg: " + rest, !src.includes(rest)));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
