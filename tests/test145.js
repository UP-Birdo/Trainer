/* v145-Test: Nicht-Kraft Etappe 5b — der ausgebaute DRILL-KATALOG.
   Geprueft wird die Datenlage: jeder Drill ist vollstaendig beschrieben (Art,
   Modus, passendes Mengenfeld), hat einen Kurz-Tipp und — bis auf die bewusst
   ausgenommenen — eine Muskel-Zuordnung. Dazu die Verdrahtung der Anzeige.
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
  "const SPORT_UEBUNGEN = " + grabLiteral("SPORT_UEBUNGEN") + ";",
  "const SPORT_INFO = " + grabLiteral("SPORT_INFO") + ";",
  "const SPORT_MUSKELN = " + grabLiteral("SPORT_MUSKELN") + ";",
  "const UEBUNG_INFO = " + grabLiteral("UEBUNG_INFO") + ";",
  "const MUSKELKARTEN = " + grabLiteral("MUSKELKARTEN") + ";",
  grabFn("drillTipp"),
  "module.exports = { SPORT_UEBUNGEN, SPORT_INFO, SPORT_MUSKELN, UEBUNG_INFO, MUSKELKARTEN, drillTipp };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const { SPORT_UEBUNGEN, SPORT_INFO, SPORT_MUSKELN, UEBUNG_INFO, MUSKELKARTEN, drillTipp } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const sportIds = Object.keys(SPORT_UEBUNGEN);
const alleDrills = [];
sportIds.forEach(id => SPORT_UEBUNGEN[id].forEach(d => alleDrills.push({ sport:id, d })));
const drillNamen = new Set(alleDrills.map(x => x.d.name));

/* 1) Umfang: der Katalog ist gewachsen und jede Sportart traegt genug. */
pruefe("mindestens 75 Drills insgesamt (ist: " + alleDrills.length + ")", alleDrills.length >= 75);
const zuDuenn = sportIds.filter(id => SPORT_UEBUNGEN[id].length < 6);
pruefe("jede Sportart hat mindestens 6 Drills" + (zuDuenn.length ? " (" + zuDuenn.join(", ") + ")" : ""),
  zuDuenn.length === 0);
const ohneTechnik = sportIds.filter(id => !SPORT_UEBUNGEN[id].some(d => d.art === "technik"));
const ohneKondition = sportIds.filter(id => !SPORT_UEBUNGEN[id].some(d => d.art === "kondition"));
pruefe("jede Sportart hat Technik" + (ohneTechnik.length ? " (" + ohneTechnik.join(", ") + ")" : ""), ohneTechnik.length === 0);
pruefe("jede Sportart hat Kondition" + (ohneKondition.length ? " (" + ohneKondition.join(", ") + ")" : ""), ohneKondition.length === 0);

/* 2) Jeder Drill ist vollstaendig und in sich stimmig. */
const kaputt = alleDrills.filter(({ d }) =>
  !d.name || !["technik","kondition"].includes(d.art) || !["zeit","wdh"].includes(d.modus) ||
  !(d.saetze >= 1) || (d.modus === "zeit" ? !(d.dauer > 0) : !(d.wdh > 0)));
pruefe("jeder Drill hat Art, Modus, Saetze und die passende Menge" +
  (kaputt.length ? " (" + kaputt.map(x => x.d.name).join(", ") + ")" : ""), kaputt.length === 0);

/* 3) Namen sind je Sportart eindeutig (sonst greift der Picker daneben). */
const doppelteInSport = sportIds.filter(id => {
  const n = SPORT_UEBUNGEN[id].map(d => d.name);
  return new Set(n).size !== n.length;
});
pruefe("keine doppelten Namen innerhalb einer Sportart" + (doppelteInSport.length ? " (" + doppelteInSport.join(", ") + ")" : ""),
  doppelteInSport.length === 0);

/* 4) Kurz-Tipp: jeder Drill hat einen — ueber SPORT_INFO oder geerbt. */
const ohneTipp = [...drillNamen].filter(n => !drillTipp(n));
pruefe("jeder Drill hat einen Kurz-Tipp" + (ohneTipp.length ? " (" + ohneTipp.join(", ") + ")" : ""), ohneTipp.length === 0);
const tippLeichen = Object.keys(SPORT_INFO).filter(k => !drillNamen.has(k));
pruefe("kein Tipp ohne Drill" + (tippLeichen.length ? " (" + tippLeichen.join(", ") + ")" : ""), tippLeichen.length === 0);
const kurzeTipps = Object.keys(SPORT_INFO).filter(k => SPORT_INFO[k] && SPORT_INFO[k].length < 25);
pruefe("kein Tipp ist ein Platzhalter" + (kurzeTipps.length ? " (" + kurzeTipps.join(", ") + ")" : ""), kurzeTipps.length === 0);
pruefe("geerbter Tipp funktioniert (Klimmzuege aus UEBUNG_INFO)",
  drillTipp("Klimmzüge") === UEBUNG_INFO["Klimmzüge"]);

/* 5) Muskeln: keine Leichen, nur bekannte Muskeln, und die Ausnahmen sind genau
      die dokumentierten (raten waere schlechter als schweigen, v125-Linie). */
const muskelLeichen = Object.keys(SPORT_MUSKELN).filter(k => !drillNamen.has(k));
pruefe("keine Muskel-Zuordnung ohne Drill" + (muskelLeichen.length ? " (" + muskelLeichen.join(", ") + ")" : ""),
  muskelLeichen.length === 0);
const bekannt = new Set(MUSKELKARTEN.standard.order);
const falscheMuskeln = [];
Object.keys(SPORT_MUSKELN).forEach(k => {
  const s = SPORT_MUSKELN[k];
  [].concat(s.p || [], s.s || []).forEach(m => { if(!bekannt.has(m)) falscheMuskeln.push(k + "/" + m); });
});
pruefe("nur bekannte Muskeln" + (falscheMuskeln.length ? " (" + falscheMuskeln.join(", ") + ")" : ""),
  falscheMuskeln.length === 0);
const AUSNAHMEN = ["Aufschlag-Training","Aufschlag und dritter Ball","Passgenauigkeit (an die Wand)",
                   "Atem-Rhythmus (3er-Zug)","Atemübung (Pranayama)","Klimmzüge"];
const ohneMuskeln = [...drillNamen].filter(n => !SPORT_MUSKELN[n]).sort();
pruefe("genau die dokumentierten Drills bleiben ohne Muskeln (ist: " + ohneMuskeln.join(", ") + ")",
  JSON.stringify(ohneMuskeln) === JSON.stringify([...AUSNAHMEN].sort()));
const primaerLeer = Object.keys(SPORT_MUSKELN).filter(k => !(SPORT_MUSKELN[k].p || []).length);
pruefe("jede Zuordnung nennt mindestens einen Hauptmuskel" + (primaerLeer.length ? " (" + primaerLeer.join(", ") + ")" : ""),
  primaerLeer.length === 0);

/* 6) Verdrahtung der Anzeige: Figur + Tipp in der Drill-Liste. */
const bib = grabFn("bibliothekHtml");
pruefe("Drill-Liste zeigt die Muskel-Figur", bib.includes("miniFigurHtml(uebungMuskeln(v.name)"));
pruefe("Drill-Liste zeigt den Kurz-Tipp", bib.includes("drillTipp(v.name)"));
pruefe("Tipp wird escaped", bib.includes("text(tipp)"));
pruefe("Sportart-Seite zeichnet die Figuren nach",
  grabFn("sportartSeiteZeichnen").includes('miniFigurenZeichnen("#sportart-inhalt")'));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
