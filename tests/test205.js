/* v205-Test: Alle Statistiken lassen sich oeffnen (47. Runde C).

   Koerpergewicht, Koerpermasse und Tageswerte konnten es laengst. Die uebrigen
   fuenf Kacheln nicht — und der Grund war ein echter Unterschied: Volumen,
   Ausdauer, Messwerte, Fortschritt und Bestwerte haben KEINE eigenen Eintraege,
   sie rechnen aus dem Protokoll. Was man dort loescht, ist ein Training.

   Die Zusagen, die der Test festhaelt:
   1. EIN REGISTER statt fuenf Ansichten — die fuenf unterscheiden sich nur
      darin, WELCHE Eintraege dazugehoeren.
   2. Gezeigt wird, was die Kachel zeigt: die gewaehlte Sportart, die gewaehlte
      Uebung — sonst staende in der Liste etwas anderes als im Diagramm.
   3. Bestwerte zaehlen nur GEMESSENE Saetze (v158) — ein abgehaktes Training
      erzeugt keinen Rekord und darf deshalb auch nicht in der Liste stehen.
   4. Geloescht wird im Protokoll, mit denselben Folgen wie im Verlauf (v182),
      und „Alle auswaehlen" hakt nur an, was diese Statistik zeigt.
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
function grabBlock(name, open, close){
  const i = src.indexOf("const " + name + " = " + open);
  if(i < 0) throw new Error("Block nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf(open, i); k < src.length; k++){
    if(src[k] === open) tiefe++;
    else if(src[k] === close){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  "let sitzung = { daten: { protokoll: [] } };",
  "let ausdauerSport = null, messwerteSport = null, fortschrittUebung = null;",
  "function sportartName(id){ return id === 'laufen' ? 'Laufen' : 'Klettern'; }",
  grabFn("echteSaetze"),
  grabBlock("STAT_DETAILS", "{", "}"),
  "let statDetailArt = null;",
  grabFn("statDetailEintraege"),
  "module.exports = { STAT_DETAILS, statDetailEintraege," +
  "  setProtokoll(p){ sitzung.daten.protokoll = p; }," +
  "  setArt(a){ statDetailArt = a; }," +
  "  setFilter(a, m, f){ ausdauerSport = a; messwerteSport = m; fortschrittUebung = f; } };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* Ein Protokoll, das alle Faelle abdeckt. */
const P = [
  { id:"k1", datum:"2026-07-01", plan:"Ganzkörper", typ:"kraft",
    saetze:[{ name:"Kniebeugen", wdh:10, gewicht:60 }] },                       // gemessen
  { id:"k2", datum:"2026-07-03", plan:"Ganzkörper", typ:"kraft",
    saetze:[{ name:"Kniebeugen", wdh:10, gewicht:60, soll:true }] },            // abgehakt
  { id:"a1", datum:"2026-07-05", plan:"Laufen", typ:"aktivitaet", sportart:"laufen",
    dauerMin:30, strecke:5, saetze:[] },
  { id:"a2", datum:"2026-07-06", plan:"Klettern", typ:"aktivitaet", sportart:"klettern",
    dauerMin:60, saetze:[], messwert:"6a" },
  { id:"a3", datum:"2026-07-07", plan:"Laufen", typ:"aktivitaet", sportart:"laufen",
    dauerMin:45, strecke:8, saetze:[] },
  { id:"ohne", datum:"2026-07-08", plan:"Uralt", typ:"kraft",
    saetze:[{ name:"Dips", wdh:8, gewicht:0 }] }                                 // ohne id? -> hat eine
];
A.setProtokoll(P);

/* ---------- 1) Das Register ---------- */
const arten = Object.keys(A.STAT_DETAILS);
pruefe("es gibt genau die fuenf offenen Statistiken", arten.length === 5);
pruefe("und zwar diese",
  ["volumen","ausdauer","messwerte","fortschritt","bestwerte"].every(a => arten.includes(a)));
pruefe("jede nennt ihre Eintraege", arten.every(a => typeof A.STAT_DETAILS[a].eintraege === "function"));
pruefe("jede hat einen Titel", arten.every(a => !!A.STAT_DETAILS[a].titel));
pruefe("und einen Satz, der sagt, was man sieht",
  arten.every(a => typeof A.STAT_DETAILS[a].hinweis === "string" && A.STAT_DETAILS[a].hinweis.length > 10));

/* ---------- 2) Volumen: Trainings mit Saetzen ---------- */
A.setArt("volumen");
let ids = A.statDetailEintraege().map(e => e.id);
pruefe("Volumen zeigt die Trainings mit Saetzen",
  ids.includes("k1") && ids.includes("k2") && ids.includes("ohne"));
pruefe("und keine satzlose Einheit", !ids.includes("a1"));
pruefe("neueste zuerst", ids[0] === "ohne");

/* ---------- 3) Ausdauer: die GEWAEHLTE Sportart ---------- */
A.setArt("ausdauer");
A.setFilter(null, null, null);
pruefe("ohne Auswahl stehen alle Einheiten da",
  A.statDetailEintraege().map(e => e.id).sort().join(",") === "a1,a2,a3");
A.setFilter("laufen", null, null);
ids = A.statDetailEintraege().map(e => e.id);
pruefe("mit Auswahl nur ihre Sportart", ids.sort().join(",") === "a1,a3");
pruefe("die Kraft-Trainings bleiben draussen", !ids.includes("k1"));
pruefe("der Titel nennt die Sportart",
  A.STAT_DETAILS.ausdauer.titel().indexOf("Laufen") > 0);

/* ---------- 4) Messwerte: nur Einheiten MIT Wert ---------- */
A.setArt("messwerte");
A.setFilter(null, null, null);
pruefe("nur Einheiten mit gemessenem Wert",
  A.statDetailEintraege().map(e => e.id).join(",") === "a2");
A.setFilter(null, "laufen", null);
pruefe("und nur die gewaehlte Sportart", A.statDetailEintraege().length === 0);

/* ---------- 5) Fortschritt: die gewaehlte Uebung ---------- */
A.setArt("fortschritt");
A.setFilter(null, null, "Kniebeugen");
ids = A.statDetailEintraege().map(e => e.id);
pruefe("die Trainings mit dieser Uebung", ids.sort().join(",") === "k1,k2");
pruefe("andere Uebungen bleiben draussen", !ids.includes("ohne"));
A.setFilter(null, null, null);
pruefe("ohne gewaehlte Uebung bleibt die Liste leer", A.statDetailEintraege().length === 0);

/* ---------- 6) Bestwerte: nur GEMESSENE Saetze (v158) ---------- */
A.setArt("bestwerte");
A.setFilter(null, null, null);
ids = A.statDetailEintraege().map(e => e.id);
pruefe("gemessene Trainings stehen drin", ids.includes("k1") && ids.includes("ohne"));
pruefe("ein abgehaktes Training NICHT (es setzt keinen Rekord)", !ids.includes("k2"));
pruefe("satzlose Einheiten auch nicht", !ids.includes("a1"));

/* ---------- 7) Eintraege ohne id bleiben aussen vor ---------- */
A.setProtokoll(P.concat([{ datum:"2026-07-09", typ:"kraft", saetze:[{ name:"X", wdh:5 }] }]));
A.setArt("volumen");
pruefe("wer keine id hat, laesst sich nicht einzeln loeschen — und steht nicht da",
  A.statDetailEintraege().every(e => !!e.id));
A.setProtokoll(P);
pruefe("eine unbekannte Art liefert nichts",
  (() => { A.setArt("gibtesnicht"); return A.statDetailEintraege().length === 0; })());

/* ---------- 8) Verdrahtung ---------- */
const oeffnen = grabFn("statDetailOeffnen");
pruefe("eine unbekannte Art oeffnet nichts", oeffnen.includes("if(!STAT_DETAILS[art]) return;"));
pruefe("die Ansicht wird gezeigt", oeffnen.includes('zeige("view-statdetail")'));
pruefe("sie ist ab Stufe 4 erreichbar (wie die Statistik selbst)",
  /"view-statdetail": 4/.test(src));
["volumen","ausdauer","messwerte","fortschritt","bestwerte"].forEach(a =>
  pruefe("die Kachel " + a + " ist tippbar",
    src.includes('stat-tap" onclick="statDetailOeffnen(\'' + a + '\')')));
/* Geloescht wird ueber das Register — mit den Folgen des Verlaufs. */
pruefe("es gibt einen eigenen Listen-Typ", /statdetail: \{[\s\S]{0,600}ansicht:  "view-statdetail"/.test(src));
pruefe("er arbeitet auf dem Protokoll",
  /statdetail: \{[\s\S]{0,600}setzen:    ?l => \{ sitzung\.daten\.protokoll = l; \}/.test(src));
pruefe("Alle-auswaehlen hakt nur an, was diese Statistik zeigt",
  /statdetail: \{[\s\S]{0,600}sichtbar: \(\) => statDetailEintraege\(\)/.test(src));
pruefe("die Folgen am Plan gehen mit (v182)",
  /statdetail: \{[\s\S]{0,700}folgenZurueck: e => folgenZurueck\(e\)/.test(src));
pruefe("und Flamme, Heute und Statistik ziehen nach",
  /statdetail: \{[\s\S]{0,800}zeichnen: \(\) => \{ fortschrittNeuZeichnen\(\); statDetailZeichnen\(\); \}/.test(src));
const zeichnen = grabFn("statDetailZeichnen");
pruefe("die Liste nutzt dieselbe Zeile wie der Verlauf",
  zeichnen.includes("protokollEintragHtml(e, true)"));
pruefe("und denselben Kopf mit Mehrfach-Loeschen",
  zeichnen.includes('listenKopfHtml("statdetail")'));
pruefe("ohne Eintraege steht ein Satz statt einer leeren Seite",
  zeichnen.includes("Noch keine Einträge."));

/* ---------- 9) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v205",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 205);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.205", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
