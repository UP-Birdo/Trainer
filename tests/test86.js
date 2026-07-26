/* v86-Test: feine Uebung->Muskel-Zuordnung + Trainings-Heatmap.
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

// HEAT_MAX_ALPHA ist ein Skalar (kein Objekt/Array, also nicht via grabConst) —
// Wert direkt aus der Quelle lesen, damit er nicht driftet, dann vor heatAlpha setzen.
const heatMax = (src.match(/HEAT_MAX_ALPHA\s*=\s*(\d+)/) || [])[1] || "235";

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
  grabFn("normName"), grabFn("uebungMuskeln"),
  grabFn("tagDifferenz"), grabFn("trainierteMuskeln"),
  "const HEAT_MAX_ALPHA = " + heatMax + ";", grabFn("heatAlpha"),
  "module.exports = { MUSKEL_ORDER, MUSKEL_SEITE, UEBUNGEN_DB, UEBUNG_MUSKELN," +
  " uebungMuskeln, tagDifferenz, heatAlpha, trainierteMuskeln };"
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

/* 3) heatAlpha: stufenlose, sättigende Deckkraft (v94) */
pruefe("heatAlpha: 0 -> transparent", T.heatAlpha(0) === 0);
pruefe("heatAlpha: ab 1 sichtbar und steigend",
  T.heatAlpha(1) > 0 && T.heatAlpha(1) < T.heatAlpha(2) && T.heatAlpha(2) < T.heatAlpha(3));
pruefe("heatAlpha: sättigt (Zuwachs nimmt ab)",
  (T.heatAlpha(2) - T.heatAlpha(1)) > (T.heatAlpha(4) - T.heatAlpha(3)));
pruefe("heatAlpha: Deckel ~235, nie darüber", T.heatAlpha(99) <= 235 && T.heatAlpha(99) >= 230);

/* 4) trainierteMuskeln: Aggregation + Zeitfenster + Freitext ignoriert */
const heute = "2026-07-24";
const prot = [
  { datum:"2026-07-24", saetze:[{name:"Kniebeugen"},{name:"Kniebeugen"},{name:"Kniebeugen"}] },
  { datum:"2026-07-16", saetze:[{name:"Kniebeugen"}] },              // 8 Tage her -> raus (Fenster 7)
  { datum:"2026-07-23", saetze:[{name:"Irgendein Freitext"}] }       // keine DB-Uebung -> ignoriert
];
const z = T.trainierteMuskeln(prot, heute, 7);
pruefe("3 Saetze Kniebeugen -> quadriceps=3, glutes=3", z.quadriceps === 3 && z.glutes === 3);
pruefe("Ausserhalb 7-Tage-Fenster zaehlt nicht", z.quadriceps === 3);   // die 8-Tage-Einheit wuerde 4 machen
pruefe("Freitext ohne DB-Treffer ignoriert", Object.keys(z).every(k => ["quadriceps","glutes"].indexOf(k) >= 0));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
