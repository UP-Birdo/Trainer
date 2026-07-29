/* v150-Test: Wizard, Teil 2 — die anderen Sportarten so tief wie Krafttraining.
   Geprueft wird, WELCHE Fragen eine Sportart bekommt (nur was sie messen kann),
   dass Kletter-Grade Strings bleiben (`wzZahlFeld`) und dass die Antworten
   wirklich im Plan landen (`aktivitaetsPlaeneBauen`).
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
function grabAnweisung(start, ende){
  const i = src.indexOf(start), j = src.indexOf(ende, i);
  if(i < 0 || j < 0) throw new Error("Anweisung nicht gefunden: " + start);
  return src.slice(i, j);
}

const code = [
  "const SPORTARTEN = " + grabLiteral("SPORTARTEN") + ";",
  "const SPORT_UEBUNGEN = " + grabLiteral("SPORT_UEBUNGEN") + ";",
  "const WOCHENTAGE = " + grabLiteral("WOCHENTAGE") + ";",
  grabFn("sportart"),
  grabFn("planTypFuer"),
  grabFn("sportUebungen"),
  grabFn("zahlKurz"),
  grabFn("kraftGewaehlt"),
  /* v186: Der Aufbau der Fragenliste ruft `ivStandardFuer` auf, und
     `aktivitaetsPlaeneBauen` rechnet bei Runden die Dauer aus den Phasen —
     beide Bausteine gehoeren deshalb in die Umgebung. */
  /^const IV_STANDARD\s*=\s*[^;]+;/m.exec(src)[0],
  grabFn("ivStandardFuer"),
  grabFn("wzRundenGewaehlt"),
  grabFn("intervallPhasen"),
  grabFn("intervallGesamt"),
  grabAnweisung("const WIZARD_FRAGEN = ", "let wzSchritt"),
  grabFn("wzZahlFeld"),
  grabFn("aktivitaetsFelderVorbereiten"),
  "let zaehler = 0; function neueId(){ return 'id' + (++zaehler); }",
  "function neueUebung(){ return { name:'', modus:'wdh', saetze:3, wdh:10, dauer:0, pause:60 }; }",
  grabFn("sportUebungBauen"),
  "let einrichtung = {};",
  grabFn("aktivitaetsPlaeneBauen"),
  "module.exports = { WIZARD_FRAGEN, SPORTARTEN, wzZahlFeld, aktivitaetsFelderVorbereiten," +
    " plaeneFuer: e => { einrichtung = e; return aktivitaetsPlaeneBauen(); } };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const { WIZARD_FRAGEN, SPORTARTEN, wzZahlFeld, aktivitaetsFelderVorbereiten, plaeneFuer } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const fragenVon = sportId => WIZARD_FRAGEN.filter(f => f.sportBezug === sportId).map(f => f.id);

/* ---------- 1) Jede Sportart wird nach dem gefragt, was sie messen kann ---------- */
/* v186: Laufen hat Runden-Training, bekommt also zusaetzlich die Frage
   „durchgehend oder in Runden" — und die steht VOR der Dauer, weil sie sie
   ersetzen kann. Sportarten ohne `intervall` sind unveraendert. */
pruefe("Laufen: Tage, Art, Dauer, Strecke, Uebungen",
  JSON.stringify(fragenVon("laufen")) === JSON.stringify(["tage_laufen","ivart_laufen","dauer_laufen","strecke_laufen","drills_laufen"]));
const falscheArt = SPORTARTEN.filter(s => s.planTyp === "aktivitaet")
  .filter(s => !!s.intervall !== fragenVon(s.id).includes("ivart_" + s.id)).map(s => s.id);
pruefe("die Art-Frage steht genau dort, wo es Runden-Training gibt" +
  (falscheArt.length ? " (" + falscheArt.join(", ") + ")" : ""), falscheArt.length === 0);
pruefe("Yoga: Tage, Dauer, Ziel, Uebungen",
  JSON.stringify(fragenVon("yoga")) === JSON.stringify(["tage_yoga","dauer_yoga","ziel_yoga","drills_yoga"]));
pruefe("Tischtennis ohne Strecke und ohne Ziel",
  JSON.stringify(fragenVon("tischtennis")) === JSON.stringify(["tage_tischtennis","dauer_tischtennis","drills_tischtennis"]));
pruefe("Klettern hat ein Ziel, aber keine Strecke",
  fragenVon("klettern").includes("ziel_klettern") && !fragenVon("klettern").includes("strecke_klettern"));

/* Keine Frage ohne Grundlage — und keine fehlende. */
const aktiv = SPORTARTEN.filter(s => s.planTyp === "aktivitaet");
const falscheStrecke = aktiv.filter(s => !!s.strecke !== fragenVon(s.id).includes("strecke_" + s.id)).map(s => s.id);
pruefe("Strecken-Frage genau dort, wo es eine Strecke gibt" + (falscheStrecke.length ? " (" + falscheStrecke.join(", ") + ")" : ""),
  falscheStrecke.length === 0);
const falschesZiel = aktiv.filter(s => !!s.mass !== fragenVon(s.id).includes("ziel_" + s.id)).map(s => s.id);
pruefe("Ziel-Frage genau dort, wo es eine Messgroesse gibt" + (falschesZiel.length ? " (" + falschesZiel.join(", ") + ")" : ""),
  falschesZiel.length === 0);
const ohneDrills = aktiv.filter(s => !fragenVon(s.id).includes("drills_" + s.id)).map(s => s.id);
pruefe("jede Sportart wird nach Uebungen gefragt" + (ohneDrills.length ? " (" + ohneDrills.join(", ") + ")" : ""),
  ohneDrills.length === 0);
pruefe("Krafttraining ist damit nicht mehr die einzige mit Inhalt",
  aktiv.every(s => fragenVon(s.id).length >= 3));

/* Presets muessen es geben, sonst waere die Frage leer. */
const ohnePreset = aktiv.filter(s => (s.strecke && !s.strecke.presets) || (s.mass && !s.mass.presets)).map(s => s.id);
pruefe("jede messbare Sportart hat Stuetzpunkte" + (ohnePreset.length ? " (" + ohnePreset.join(", ") + ")" : ""),
  ohnePreset.length === 0);
const drillFrage = WIZARD_FRAGEN.find(f => f.id === "drills_tischtennis");
pruefe("die Uebungs-Frage bietet den ganzen Katalog", drillFrage.optionen.length === 8);
pruefe("sie nennt Technik oder Kondition", drillFrage.optionen.every(o => o[2] === "Technik" || o[2] === "Kondition"));

/* ---------- 2) Zahl oder Text? (Kletter-Grade duerfen nicht zu NaN werden) ---------- */
pruefe("Dauer ist eine Zahl", wzZahlFeld("dauer_laufen") === true);
pruefe("Strecke ist eine Zahl", wzZahlFeld("strecke_schwimmen") === true);
pruefe("Yoga-Ziel ist eine Zahl", wzZahlFeld("ziel_yoga") === true);
pruefe("Kletter-Grad bleibt Text", wzZahlFeld("ziel_klettern") === false);
pruefe("das Kraft-Ziel bleibt Text", wzZahlFeld("ziel") === false);
pruefe("andere Felder bleiben Text", wzZahlFeld("sportarten") === false && wzZahlFeld("dauer") === false);

/* ---------- 3) Vorbereitung der Felder ---------- */
const e = aktivitaetsFelderVorbereiten({ sportarten:["laufen","klettern"] });
pruefe("Strecke ist vorbelegt", e["strecke_laufen"] === 3);
pruefe("Kletter-Ziel ist vorbelegt", e["ziel_klettern"] === "5a");
pruefe("Uebungen starten LEER (nichts zu waehlen ist gueltig)",
  Array.isArray(e["drills_laufen"]) && e["drills_laufen"].length === 0);

/* ---------- 4) Die Antworten landen im Plan ---------- */
const plaene = plaeneFuer(aktivitaetsFelderVorbereiten({
  sportarten:["laufen","yoga"],
  "tage_laufen":[2,4], "dauer_laufen":3600, "strecke_laufen":10,
  "drills_laufen":["Bergsprints","Steigerungsläufe"],
  "ziel_yoga":60
}));
const lauf = plaene.find(p => p.sportart === "laufen");
const yoga = plaene.find(p => p.sportart === "yoga");
pruefe("Strecke aus dem Wizard steht im Plan", lauf.strecke === 10);
pruefe("die gewaehlten Uebungen stehen im Plan", lauf.uebungen.length === 2);
pruefe("Reihenfolge folgt dem Katalog, nicht der Tipp-Reihenfolge",
  lauf.uebungen[0].name === "Steigerungsläufe" && lauf.uebungen[1].name === "Bergsprints");
pruefe("die Uebungen sind fertig gebaut (Saetze, Modus)",
  lauf.uebungen.every(u => u.saetze >= 1 && (u.modus === "zeit" || u.modus === "wdh")));
pruefe("Yoga-Ziel aus dem Wizard steht im Plan", yoga.massZiel === 60);
pruefe("ohne Auswahl bleibt der Plan leer wie bisher", yoga.uebungen.length === 0);
pruefe("Laufen hat kein Messgroessen-Ziel", lauf.massZiel === null);
pruefe("Yoga hat keine Strecke", yoga.strecke === 0);

/* Fehlt eine Antwort, greift weiter der Startwert der Sportart (Stand bis v149). */
const ohneAntwort = plaeneFuer({ sportarten:["laufen"] }).find(p => p.sportart === "laufen");
pruefe("ohne Antwort bleibt der Startwert", ohneAntwort.strecke === 3 && ohneAntwort.uebungen.length === 0);

/* ---------- 5) Verdrahtung ---------- */
pruefe("Bestehende Plaene belegen den Wizard vor",
  grabFn("einrichtungOeffnen").includes('einrichtung["drills_" + p.sportart] = p.uebungen.map(u => u.name)'));
pruefe("die Zusammenfassung zeigt die Uebungszahl",
  grabFn("wzZusammenfassung").includes('drills + (drills === 1 ? " Übung" : " Übungen")'));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
