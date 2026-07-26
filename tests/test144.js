/* v144-Test: Nicht-Kraft Etappe 5a — Fortschrittsregel je SPORTART-KLASSE.
   Kern ist `planGesteigert`: eine reine Funktion, die sagt, was ein
   „war zu leicht" an diesem Plan aendern WUERDE (oder null, wenn nichts).
   Geprueft werden die Rechnung je Klasse, die Reinheit (der Plan bleibt
   unangetastet), die Hausregel STEIGERUNG_MAX und die Zuordnung der echten
   Sportarten.
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
  "const SPORTARTEN = " + grabLiteral("SPORTARTEN") + ";",
  "const FORTSCHRITT_KLASSEN = " + grabLiteral("FORTSCHRITT_KLASSEN") + ";",
  "const MAX_DAUER_S = 24 * 3600;",
  "const STEIGERUNG_MAX = 0.20;",
  grabFn("sportart"),
  grabFn("begrenzen"),
  grabFn("massZahl"),
  grabFn("massKlemmen"),
  grabFn("massSchritt"),
  grabFn("intervallPhasen"),
  grabFn("intervallGesamt"),
  grabFn("intervallSteigern"),
  grabFn("fortschrittKlasse"),
  grabFn("planGesteigert"),
  grabFn("steigerungText"),
  "module.exports = { SPORTARTEN, FORTSCHRITT_KLASSEN, STEIGERUNG_MAX, fortschrittKlasse, planGesteigert, steigerungText };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const { SPORTARTEN, FORTSCHRITT_KLASSEN, STEIGERUNG_MAX, fortschrittKlasse, planGesteigert, steigerungText } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Zuordnung: JEDE Sportart nennt eine Klasse, und die gibt es auch. */
const ohneKlasse = SPORTARTEN.filter(s => !s.fortschritt).map(s => s.id);
pruefe("jede Sportart nennt eine Fortschritts-Klasse" + (ohneKlasse.length ? " (" + ohneKlasse.join(", ") + ")" : ""),
  ohneKlasse.length === 0);
const falscheKlasse = SPORTARTEN.filter(s => s.fortschritt && !FORTSCHRITT_KLASSEN[s.fortschritt]).map(s => s.id);
pruefe("keine erfundene Klasse" + (falscheKlasse.length ? " (" + falscheKlasse.join(", ") + ")" : ""),
  falscheKlasse.length === 0);
const unbenutzt = Object.keys(FORTSCHRITT_KLASSEN).filter(k => !SPORTARTEN.some(s => s.fortschritt === k));
pruefe("keine Klasse ohne Sportart" + (unbenutzt.length ? " (" + unbenutzt.join(", ") + ")" : ""), unbenutzt.length === 0);

/* 2) Hausregel: drei Einheiten pro Woche duerfen STEIGERUNG_MAX nicht reissen.
      Genau die Rechnung, an der die alten pauschalen 7 % scheiterten (1,07^3 = 1,225). */
Object.keys(FORTSCHRITT_KLASSEN).forEach(k => {
  const f = FORTSCHRITT_KLASSEN[k];
  const proWoche = Math.pow(1 + Math.max(f.dauer, f.strecke), 3) - 1;
  pruefe("Klasse " + k + " bleibt unter " + (STEIGERUNG_MAX * 100) + " % je Woche (ist: " + Math.round(proWoche * 1000) / 10 + " %)",
    proWoche <= STEIGERUNG_MAX + 1e-9);
});
pruefe("die alten pauschalen 7 % haetten die Hausregel gerissen", Math.pow(1.07, 3) - 1 > STEIGERUNG_MAX);

/* 3) Ausdauer: Strecke UND Zeit wachsen gemeinsam (Tempo bleibt gleich). */
const lauf = { dauer: 1800, strecke: 5 };
const laufNeu = planGesteigert(lauf, "laufen", false);
pruefe("Laufen hebt die Zeit (1800 -> " + (laufNeu && laufNeu.dauer) + ")", laufNeu && laufNeu.dauer === 1908);
pruefe("Laufen hebt die Strecke (5 -> " + (laufNeu && laufNeu.strecke) + ")", laufNeu && laufNeu.strecke === 5.3);
pruefe("Laufen laesst den Plan unangetastet (rein)", lauf.dauer === 1800 && lauf.strecke === 5);

/* 4) Spielsport: nur die Zeit, und langsamer. */
const tt = { dauer: 3600 };
const ttNeu = planGesteigert(tt, "tischtennis", false);
pruefe("Tischtennis hebt nur die Zeit (3600 -> " + (ttNeu && ttNeu.dauer) + ")", ttNeu && ttNeu.dauer === 3780);
pruefe("Tischtennis hat keine Strecke", ttNeu && ttNeu.strecke === undefined);

/* 5) Klettern: die Uhr waechst NICHT — nur der Grad, und nur wenn er stand. */
const kletterPlan = { dauer: 5400, massZiel: "6a" };
pruefe("Klettern ohne erreichtes Ziel steigert gar nichts", planGesteigert(kletterPlan, "klettern", false) === null);
const kletterNeu = planGesteigert(kletterPlan, "klettern", true);
pruefe("Klettern hebt den Grad (6a -> " + (kletterNeu && kletterNeu.massZiel) + ")", kletterNeu && kletterNeu.massZiel === "6a+");
pruefe("Klettern laesst die Zeit stehen", kletterNeu && kletterNeu.dauer === undefined);

/* 6) Yoga: Haltezeit langsam plus Winkel, wenn das Ziel stand. */
const yoga = { dauer: 1200, massZiel: 30 };
const yogaNeu = planGesteigert(yoga, "yoga", true);
pruefe("Yoga hebt die Haltezeit (1200 -> " + (yogaNeu && yogaNeu.dauer) + ")", yogaNeu && yogaNeu.dauer === 1260);
pruefe("Yoga hebt den Winkel (30 -> " + (yogaNeu && yogaNeu.massZiel) + ")", yogaNeu && yogaNeu.massZiel === 35);
const yogaOhne = planGesteigert(yoga, "yoga", false);
pruefe("Yoga ohne erreichtes Ziel hebt nur die Zeit", yogaOhne && yogaOhne.massZiel === undefined && yogaOhne.dauer === 1260);

/* 7) Intervall schlaegt die Klasse: Runden statt Uhr, Dauer folgt daraus. */
const iv = { dauer: 600, intervall: { runden: 6, belastung: 60, pause: 30 } };
const ivNeu = planGesteigert(iv, "kampfsport", false);
pruefe("Intervall hebt die Runden (6 -> " + (ivNeu && ivNeu.intervall.runden) + ")", ivNeu && ivNeu.intervall.runden === 7);
pruefe("Intervall-Dauer folgt den Runden, nicht der Klasse",
  ivNeu && ivNeu.dauer === 7 * 60 + 6 * 30);
pruefe("Intervall laesst den Ursprungsplan unangetastet", iv.intervall.runden === 6 && iv.dauer === 600);

/* 8) Nichts zu heben -> null (dann wird gar nicht erst gefragt). */
pruefe("Plan ohne alles -> null", planGesteigert({}, "tennis", false) === null);
pruefe("kein Plan -> null", planGesteigert(null, "tennis", false) === null);
pruefe("Zeit am Anschlag -> null", planGesteigert({ dauer: 24 * 3600 }, "tennis", false) === null);

/* 9) steigerungText verspricht nur, was wirklich passiert. */
pruefe("Text beim Laufen nennt Zeit und Strecke", steigerungText(laufNeu, "laufen") === "die Zeit und die Strecke");
pruefe("Text beim Lauf-Plan ohne Strecke nennt nur die Zeit",
  steigerungText(planGesteigert({ dauer: 1800 }, "laufen", false), "laufen") === "die Zeit");
pruefe("Text beim Klettern nennt die Schwierigkeit", steigerungText(kletterNeu, "klettern") === "die Schwierigkeit");
pruefe("Text beim Intervall nennt die Runden, nicht die Zeit", steigerungText(ivNeu, "kampfsport") === "die Runden");
pruefe("Text ohne Steigerung ist leer", steigerungText(null, "tennis") === "");

/* 10) Verdrahtung: der Aufrufer benutzt die Regel und fragt nur bei Wirkung. */
pruefe("Eintragen ruft planGesteigert", src.includes("const steigerung = planGesteigert(echterPlan, sport, massReif)"));
pruefe("gefragt wird nur, wenn es etwas zu heben gibt", src.includes("if(steigerung){"));
pruefe("die Frage nennt, was steigt", src.includes("steigerungText(steigerung, sport)"));
pruefe("die alte Pauschale von 7 % ist raus", !src.includes("* 1.07"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
