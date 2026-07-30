/* v161-Test: Die Belastungs-Rechnung nutzt, was schon da ist.
   Drei Signale ohne eine einzige neue Eingabe:
   1) Die NOTE je Satz gewichtet ihn (harte Saetze zaehlen mehr).
   2) Ohne Note springt die relative Intensitaet ein — aber NIE beides zugleich.
   3) Der Leistungsabfall (`verfehltFolge`, v159) wird als EIGENE Aussage
      gemeldet, nicht in die Quote verruehrt.
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
  const decl = "const " + name + " = ";
  const i = src.indexOf(decl);
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  let start = i + decl.length;
  while(start < src.length && src[start] !== "{" && src[start] !== "[") start++;
  const auf = src[start], zu = auf === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const code = [
  "const NOTE_GEWICHT = " + grabLiteral("NOTE_GEWICHT") + ";",
  "const SEKUNDAER_ANTEIL = 0.5;",
  "const MUSKEL_HEAT_TAGE = 7;",
  "const KARTE = { 'LH-Bankdrücken': { muskeln:['pectoral'], sekundaer:['triceps'] } };",
  "function uebungMuskeln(n){ return KARTE[n] || null; }",
  grabFn("tagDifferenz"),
  grabFn("echteSaetze"),
  /* v189: die gemessene Pause wiegt in satzGewichtung mit. Ohne Pausen-Feld ist
     der Faktor 1 — alle Zusagen dieser Datei gelten damit unveraendert weiter
     (test189 prueft sie zusaetzlich Wert fuer Wert nach). */
  "const PAUSE_STUFEN = " + grabLiteral("PAUSE_STUFEN") + ";",
  grabFn("pauseFaktor"),
  grabFn("maxGewichtJeUebung"),
  grabFn("satzGewichtung"),
  grabFn("muskelLast"),
  grabFn("leistungFaellt"),
  "module.exports = { NOTE_GEWICHT, maxGewichtJeUebung, satzGewichtung, muskelLast, leistungFaellt };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const { NOTE_GEWICHT, maxGewichtJeUebung, satzGewichtung, muskelLast, leistungFaellt } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const HEUTE = "2026-07-27";
const satz = (ex) => Object.assign({ name:"LH-Bankdrücken" }, ex || {});
const tag = (datum, saetze) => ({ datum, saetze });

/* ---------- 1) Die Note wiegt den Satz ---------- */
pruefe("viel zu leicht wiegt am wenigsten", satzGewichtung(satz({ note:1 }), 0) === 0.5);
pruefe("passend ist der Normalfall", satzGewichtung(satz({ note:3 }), 0) === 1);
pruefe("schwer wiegt mehr", satzGewichtung(satz({ note:4 }), 0) === 1.2);
pruefe("nicht geschafft wiegt am meisten", satzGewichtung(satz({ note:5 }), 0) === 1.3);
pruefe("die Reihenfolge stimmt durchgehend",
  [1,2,3,4,5].every((n, i, a) => i === 0 || NOTE_GEWICHT[a[i-1]] < NOTE_GEWICHT[n]));

/* ---------- 2) Ohne Note: relative Intensitaet — und NIE beides ---------- */
pruefe("ohne Note zaehlt die relative Intensitaet",
  satzGewichtung(satz({ gewicht:40 }), 80) === 0.8);
pruefe("am Bestwert volle Wirkung", satzGewichtung(satz({ gewicht:80 }), 80) === 1);
pruefe("ueber dem Bestwert nicht mehr als 1", satzGewichtung(satz({ gewicht:100 }), 80) === 1);
pruefe("die Note hat Vorrang vor der Intensitaet",
  satzGewichtung(satz({ note:1, gewicht:80 }), 80) === 0.5);
pruefe("ohne beides bleibt es neutral",
  satzGewichtung(satz({}), 0) === 1 && satzGewichtung(satz({ gewicht:40 }), 0) === 1);
pruefe("Koerpergewicht ohne Note bleibt neutral", satzGewichtung(satz({ gewicht:0 }), 80) === 1);
pruefe("unsinnige Note faellt auf den Ersatz zurueck", satzGewichtung(satz({ note:9, gewicht:40 }), 80) === 0.8);

/* ---------- 3) Bestwert je Uebung ---------- */
const proto = [tag("2026-07-20", [satz({ gewicht:60 }), satz({ gewicht:80 })]),
               tag("2026-07-25", [satz({ gewicht:70 })])];
pruefe("hoechstes Gewicht wird gefunden", maxGewichtJeUebung(proto)["LH-Bankdrücken"] === 80);
pruefe("Soll-Saetze zaehlen nicht mit",
  maxGewichtJeUebung([tag(HEUTE, [satz({ gewicht:200, soll:true })])])["LH-Bankdrücken"] === undefined);
pruefe("leeres Protokoll ergibt nichts",
  Object.keys(maxGewichtJeUebung([])).length === 0 && Object.keys(maxGewichtJeUebung(null)).length === 0);

/* ---------- 4) Wirkung auf die Last ---------- */
const leicht = muskelLast([tag(HEUTE, [satz({ note:1 }), satz({ note:1 }), satz({ note:1 }), satz({ note:1 })])], HEUTE, 7);
const hart   = muskelLast([tag(HEUTE, [satz({ note:5 }), satz({ note:5 }), satz({ note:5 }), satz({ note:5 })])], HEUTE, 7);
pruefe("vier leichte Saetze wiegen 2", leicht.pectoral.saetze === 2);
pruefe("vier harte Saetze wiegen 5,2", hart.pectoral.saetze === 5.2);
pruefe("harte Saetze belasten mehr als leichte", hart.pectoral.saetze > leicht.pectoral.saetze * 2);
pruefe("die Gewichtung gilt auch fuer mitarbeitende Muskeln",
  Math.abs(hart.triceps.saetze - hart.pectoral.saetze * 0.5) < 0.01);
pruefe("ohne Noten bleibt es beim alten Wert (Regression)",
  muskelLast([tag(HEUTE, [satz({}), satz({}), satz({}), satz({})])], HEUTE, 7).pectoral.saetze === 4);

/* ---------- 5) Leistungsabfall ist eine EIGENE Aussage ---------- */
const plaene = [{ uebungen:[{ name:"LH-Bankdrücken", verfehltFolge:1 }] }];
pruefe("betroffene Muskeln werden gemeldet", leistungFaellt(plaene).has("pectoral"));
pruefe("nur PRIMAER-Muskeln, nicht die mitarbeitenden", !leistungFaellt(plaene).has("triceps"));
pruefe("ohne Verfehlen keine Meldung",
  leistungFaellt([{ uebungen:[{ name:"LH-Bankdrücken", verfehltFolge:0 }] }]).size === 0);
pruefe("ohne das Feld keine Meldung",
  leistungFaellt([{ uebungen:[{ name:"LH-Bankdrücken" }] }]).size === 0);
pruefe("unbekannte Uebung wird uebergangen",
  leistungFaellt([{ uebungen:[{ name:"Phantasie", verfehltFolge:2 }] }]).size === 0);
pruefe("leere Eingaben sind erlaubt", leistungFaellt([]).size === 0 && leistungFaellt(null).size === 0);
/* Der Leistungsabfall darf die Umfangs-Quote NICHT verschieben. */
pruefe("die Last-Rechnung kennt verfehltFolge gar nicht",
  !grabFn("muskelLast").includes("verfehltFolge") && !grabFn("muskelAuslastung").includes("verfehltFolge"));

/* ---------- 6) Verdrahtung ---------- */
pruefe("die Detail-Karte meldet den Leistungsabfall",
  grabFn("muskelAuswahlZeichnen").includes("leistungFaellt(sitzung.daten.plaene).has(key)"));
pruefe("die Last-Rechnung wiegt die Saetze", grabFn("muskelLast").includes("satzGewichtung(s,"));
pruefe("der Bestwert kommt aus der ganzen Historie", grabFn("muskelLast").includes("maxGewichtJeUebung(protokoll)"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
