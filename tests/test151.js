/* v151-Test: Drill-Beschreibungen (SPORT_TEXT) — das ETAPPEN-REGISTER.
   Gleiches Muster wie test142 fuer die Kraftuebungen: oben eine Liste der
   fertigen Sportarten, darunter laufen die Pruefungen darueber. Eine neue
   Etappe kostet eine Zeile, keine neue Datei.
   Hinweis: in Test-LABELS keine typografischen Anfuehrungszeichen (Haus-Falle). */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

/* ---- Register: Sportart -> seit welcher Version vollstaendig beschrieben ---- */
const ETAPPEN = [
  { sport:"laufen",    version:"v151" },
  { sport:"radfahren", version:"v151" },
  { sport:"wandern",   version:"v151" },
  { sport:"schwimmen", version:"v151" },
  { sport:"rudern",    version:"v151" }
  // offen: klettern, tischtennis, tennis, kampfsport, fussball, yoga
];

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
  "const SPORT_TEXT = " + grabLiteral("SPORT_TEXT") + ";",
  "const SPORT_INFO = " + grabLiteral("SPORT_INFO") + ";",
  "const UEBUNG_TEXT = " + grabLiteral("UEBUNG_TEXT") + ";",
  "const UEBUNG_INFO = " + grabLiteral("UEBUNG_INFO") + ";",
  grabFn("sportUebungen"),
  grabFn("drillTipp"),
  grabFn("drillText"),
  "module.exports = { SPORT_UEBUNGEN, SPORT_TEXT, SPORT_INFO, UEBUNG_TEXT, drillTipp, drillText, sportUebungen };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const { SPORT_UEBUNGEN, SPORT_TEXT, SPORT_INFO, UEBUNG_TEXT, drillTipp, drillText, sportUebungen } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const alleDrills = new Set();
Object.keys(SPORT_UEBUNGEN).forEach(id => SPORT_UEBUNGEN[id].forEach(d => alleDrills.add(d.name)));

/* 1) Jede eingetragene Etappe ist und bleibt vollstaendig. */
ETAPPEN.forEach(e => {
  const namen = sportUebungen(e.sport).map(d => d.name);
  pruefe("Sportart " + e.sport + " hat ueberhaupt Drills", namen.length > 0);
  const fehlend = namen.filter(n => !drillText(n));
  pruefe("Etappe " + e.sport + " (" + e.version + ") vollstaendig" + (fehlend.length ? " (fehlt: " + fehlend.join(", ") + ")" : ""),
    fehlend.length === 0);
  const ohneFehlerteil = namen.filter(n => !/Häufigster Fehler:/.test(drillText(n) || ""));
  pruefe("Etappe " + e.sport + ": jeder Text nennt den haeufigsten Fehler" + (ohneFehlerteil.length ? " (" + ohneFehlerteil.join(", ") + ")" : ""),
    ohneFehlerteil.length === 0);
});

/* 2) Register plausibel: nur echte Sportarten, keine Doppelung. */
const unbekannt = ETAPPEN.filter(e => !SPORT_UEBUNGEN[e.sport]).map(e => e.sport);
pruefe("Register nennt nur echte Sportarten" + (unbekannt.length ? " (" + unbekannt.join(", ") + ")" : ""), unbekannt.length === 0);
pruefe("keine Sportart doppelt im Register", new Set(ETAPPEN.map(e => e.sport)).size === ETAPPEN.length);

/* 3) Keine Karteileichen: jeder Schluessel ist ein echter Drill. */
const leichen = Object.keys(SPORT_TEXT).filter(k => !alleDrills.has(k));
pruefe("kein Text ohne Drill" + (leichen.length ? " (" + leichen.join(", ") + ")" : ""), leichen.length === 0);

/* 4) Substanz — dieselben Maszstaebe wie bei den Kraftuebungen. */
const schluessel = Object.keys(SPORT_TEXT);
const zuKurz = schluessel.filter(k => SPORT_TEXT[k].length < 120);
pruefe("jeder Text hat Substanz (>= 120 Zeichen)" + (zuKurz.length ? " (" + zuKurz.join(", ") + ")" : ""), zuKurz.length === 0);
const zuWenigSaetze = schluessel.filter(k => (SPORT_TEXT[k].match(/[.!?]/g) || []).length < 2);
pruefe("mindestens zwei Saetze je Text", zuWenigSaetze.length === 0);
const gleich = schluessel.filter(k => SPORT_TEXT[k] === SPORT_INFO[k]);
pruefe("Text ist nicht der Kurz-Tipp", gleich.length === 0);
const gesehen = new Set();
const mehrfach = schluessel.filter(k => { const t = SPORT_TEXT[k]; if(gesehen.has(t)) return true; gesehen.add(t); return false; });
pruefe("kein Text zweimal verwendet" + (mehrfach.length ? " (" + mehrfach.join(", ") + ")" : ""), mehrfach.length === 0);

/* 5) Die geteilte Quelle: Drills erben von den Kraftuebungen, nicht umgekehrt. */
pruefe("Klimmzuege erben ihren Text aus der Kraft-Bibliothek",
  drillText("Klimmzüge") === UEBUNG_TEXT["Klimmzüge"] && !!UEBUNG_TEXT["Klimmzüge"]);
pruefe("ein Drill mit eigenem Text nimmt seinen eigenen",
  drillText("Bergsprints") === SPORT_TEXT["Bergsprints"]);
pruefe("unbeschriebene Drills geben leer zurueck", drillText("Volley am Netz") === "");
pruefe("ohne Namen leer", drillText("") === "" && drillText(null) === "");
pruefe("der Kurz-Tipp bleibt davon unberuehrt", drillTipp("Bergsprints") === SPORT_INFO["Bergsprints"]);

/* 6) Verdrahtung: Text steht UNTER dem Tipp. */
const bib = grabFn("bibliothekHtml");
pruefe("Drill-Liste liest die Beschreibung", bib.includes("drillText(v.name)"));
pruefe("Beschreibung steht unter dem Tipp", bib.indexOf("text(tipp)") < bib.indexOf("text(beschreibung)"));
pruefe("Beschreibung wird escaped", bib.includes("text(beschreibung)"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
