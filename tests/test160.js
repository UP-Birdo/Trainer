/* v160-Test: Belastungs-Modell der Muskelkarte.

   Kern sind vier reine Funktionen: `alterJahre`, `kapazitaetsFaktor`,
   `muskelLast` (gewichtete Saetze im Fenster + Erholung) und `muskelAuslastung`
   samt Stufen-Einordnung. Geprueft wird vor allem, dass NUR die Groessen
   eingehen, die eingehen sollen — Koerpergewicht und BMI ausdruecklich nicht.
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
  "const MUSKEL_KAPAZITAET = " + grabLiteral("MUSKEL_KAPAZITAET") + ";",
  "const KAPAZITAET_STANDARD = 14;",
  "const SEKUNDAER_ANTEIL = 0.5;",
  "const ERHOLUNG_TAGE = 2;",
  "const MUSKEL_HEAT_TAGE = 7;",
  /* Zwei Uebungen mit bekannten Muskeln — der echte Katalog ist hier egal. */
  "const KARTE = { 'LH-Bankdrücken': { muskeln:['pectoral'], sekundaer:['triceps'] }," +
    " 'Klimmzüge': { muskeln:['latissimus'], sekundaer:['biceps'] } };",
  "function uebungMuskeln(n){ return KARTE[n] || null; }",
  "function heuteAlsText(){ return '2026-07-27'; }",
  grabFn("tagDifferenz"),
  grabFn("echteSaetze"),
  grabFn("alterJahre"),
  /* v167: kapazitaetsFaktor rechnet jetzt Schlaf mit ein. Hier wird ohne
     Tageswerte aufgerufen — dann ist der Schlaf-Faktor 1 und alle Zusagen
     dieses Tests gelten unveraendert weiter. Genau das ist die Zusage
     „kein Wert, kein Effekt"; geprueft wird sie in test167. */
  "const SCHLAF_TAGE = 7; const SCHLAF_MINDEST = 3;",
  grabFn("schlafSchnitt"),
  grabFn("schlafFaktor"),
  "const SCHLAF_STUFEN = " + grabLiteral("SCHLAF_STUFEN") + ";",
  /* v168: dasselbe fuer das Befinden — hier ohne Tageswerte aufgerufen, also
     Faktor 1. Die Wirkung selbst prueft test168. */
  "const BEFINDEN_MINDEST = 3;",
  "const BEFINDEN_STUFEN = " + grabLiteral("BEFINDEN_STUFEN") + ";",
  grabFn("befindenSchnitt"),
  grabFn("befindenFaktor"),
  grabFn("kapazitaetsFaktor"),
  grabFn("muskelKapazitaet"),
  "const NOTE_GEWICHT = " + grabLiteral("NOTE_GEWICHT") + ";",   // v161
  /* v189: satzGewichtung wiegt zusaetzlich nach der gemessenen Pause. Ohne
     Pausen-Feld ist der Faktor 1, die Zusagen hier bleiben also unveraendert —
     die Bausteine muessen aber in der Umgebung liegen. Wirkung: test189. */
  "const PAUSE_STUFEN = " + grabLiteral("PAUSE_STUFEN") + ";",
  grabFn("pauseFaktor"),
  grabFn("maxGewichtJeUebung"),
  grabFn("satzGewichtung"),
  grabFn("muskelLast"),
  grabFn("muskelAuslastung"),
  grabFn("auslastungStufe"),
  "module.exports = { alterJahre, kapazitaetsFaktor, muskelKapazitaet, muskelLast," +
    " muskelAuslastung, auslastungStufe, MUSKEL_KAPAZITAET };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const { alterJahre, kapazitaetsFaktor, muskelKapazitaet, muskelLast,
        muskelAuslastung, auslastungStufe, MUSKEL_KAPAZITAET } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const HEUTE = "2026-07-27";
const eintrag = (datum, name, anzahl, ex) => ({
  datum, saetze: Array.from({ length: anzahl }, () => Object.assign({ name }, ex || {}))
});

/* ---------- 1) Alter aus dem Profil ---------- */
pruefe("Alter wird gerechnet", alterJahre({ geburtsjahr:1990 }, HEUTE) === 36);
pruefe("ohne Geburtsjahr null", alterJahre({}, HEUTE) === null && alterJahre(null, HEUTE) === null);
pruefe("Unsinn wird abgewiesen",
  alterJahre({ geburtsjahr:1800 }, HEUTE) === null && alterJahre({ geburtsjahr:2100 }, HEUTE) === null);

/* ---------- 2) Kapazitaets-Faktor: was zaehlt, was nicht ---------- */
const jung = { geburtsjahr:2000 };
pruefe("Anfaenger vertragen weniger als Fortgeschrittene",
  kapazitaetsFaktor(jung, { erfahrung:"anfaenger" }, HEUTE) <
  kapazitaetsFaktor(jung, { erfahrung:"fortgeschritten" }, HEUTE));
pruefe("Wiedereinstieg liegt dazwischen",
  kapazitaetsFaktor(jung, { erfahrung:"wieder" }, HEUTE) === 0.8);
pruefe("ohne Angabe der mittlere Wert", kapazitaetsFaktor(jung, {}, HEUTE) === 0.8);
pruefe("Alter senkt den Faktor",
  kapazitaetsFaktor({ geburtsjahr:1960 }, { erfahrung:"fortgeschritten" }, HEUTE) <
  kapazitaetsFaktor({ geburtsjahr:2000 }, { erfahrung:"fortgeschritten" }, HEUTE));
pruefe("unter 30 spielt das Alter keine Rolle",
  kapazitaetsFaktor({ geburtsjahr:2000 }, { erfahrung:"fortgeschritten" }, HEUTE) ===
  kapazitaetsFaktor({ geburtsjahr:1998 }, { erfahrung:"fortgeschritten" }, HEUTE));
pruefe("der Alters-Abschlag ist gedeckelt",
  kapazitaetsFaktor({ geburtsjahr:1900 + 10 }, { erfahrung:"fortgeschritten" }, HEUTE) >= 0.75);
pruefe("Aufwaermen hebt leicht an",
  kapazitaetsFaktor(jung, { erfahrung:"fortgeschritten", bonus:["aufwaermen"] }, HEUTE) >
  kapazitaetsFaktor(jung, { erfahrung:"fortgeschritten", bonus:[] }, HEUTE));
pruefe("Dehnen hebt schwaecher an als Aufwaermen",
  kapazitaetsFaktor(jung, { erfahrung:"fortgeschritten", bonus:["dehnen"] }, HEUTE) <
  kapazitaetsFaktor(jung, { erfahrung:"fortgeschritten", bonus:["aufwaermen"] }, HEUTE));

/* Der wichtigste Test dieser Datei: Koerpergewicht und BMI gehen NICHT ein. */
pruefe("Koerpergewicht aendert nichts",
  kapazitaetsFaktor({ geburtsjahr:2000, gewicht:60 }, { erfahrung:"fortgeschritten" }, HEUTE) ===
  kapazitaetsFaktor({ geburtsjahr:2000, gewicht:120 }, { erfahrung:"fortgeschritten" }, HEUTE));
pruefe("Groesse (und damit BMI) aendert nichts",
  kapazitaetsFaktor({ geburtsjahr:2000, groesse:160 }, { erfahrung:"fortgeschritten" }, HEUTE) ===
  kapazitaetsFaktor({ geburtsjahr:2000, groesse:200 }, { erfahrung:"fortgeschritten" }, HEUTE));
pruefe("die Funktion erwaehnt Gewicht und BMI gar nicht",
  !grabFn("kapazitaetsFaktor").includes("gewicht") && !grabFn("kapazitaetsFaktor").toLowerCase().includes("bmi"));

/* ---------- 3) Kapazitaet je Muskel ---------- */
pruefe("grosse Muskeln vertragen mehr als kleine",
  MUSKEL_KAPAZITAET.quadriceps > MUSKEL_KAPAZITAET.neck);
pruefe("unbekannter Muskel bekommt den Standardwert",
  muskelKapazitaet("phantasie", jung, { erfahrung:"fortgeschritten" }, HEUTE) === 14);
pruefe("nie unter vier Saetze",
  muskelKapazitaet("neck", { geburtsjahr:1930 }, { erfahrung:"anfaenger" }, HEUTE) >= 4);

/* ---------- 4) Last im Fenster ---------- */
const proto = [
  eintrag("2026-07-27", "LH-Bankdrücken", 4),   // heute
  eintrag("2026-07-24", "LH-Bankdrücken", 4),   // vor 3 Tagen
  eintrag("2026-07-10", "LH-Bankdrücken", 8)    // ausserhalb des Fensters
];
const last = muskelLast(proto, HEUTE, 7);
pruefe("nur das Fenster zaehlt", last.pectoral.saetze === 8);
pruefe("mitarbeitende Muskeln zaehlen halb", last.triceps.saetze === 4);
pruefe("Tage seit dem letzten Reiz", last.pectoral.tageSeit === 0);
pruefe("aeltere Einheit setzt den Zaehler nicht zurueck",
  muskelLast([eintrag("2026-07-24", "LH-Bankdrücken", 2)], HEUTE, 7).pectoral.tageSeit === 3);
pruefe("Soll-Saetze zaehlen nicht mit (v158)",
  muskelLast([eintrag("2026-07-27", "LH-Bankdrücken", 4, { soll:true })], HEUTE, 7).pectoral === undefined);
pruefe("unbekannte Uebungen werden uebergangen",
  Object.keys(muskelLast([eintrag("2026-07-27", "Phantasie-Übung", 4)], HEUTE, 7)).length === 0);
pruefe("leeres Protokoll ergibt nichts",
  Object.keys(muskelLast([], HEUTE, 7)).length === 0 && Object.keys(muskelLast(null, HEUTE, 7)).length === 0);

/* ---------- 5) Auslastung und Stufen ---------- */
const viel = Array.from({ length: 6 }, (_, i) => eintrag("2026-07-2" + (2 + i), "LH-Bankdrücken", 5));
const a = muskelAuslastung(viel, jung, { erfahrung:"fortgeschritten" }, HEUTE);
pruefe("Quote ist Saetze durch Kapazitaet",
  Math.abs(a.pectoral.quote - a.pectoral.saetze / a.pectoral.kapazitaet) < 0.02);
pruefe("viel Volumen ergibt die hoechste Stufe", auslastungStufe(a.pectoral) === "zuviel");
pruefe("mittleres Volumen ist gut",
  auslastungStufe({ saetze:8, kapazitaet:18, quote:8/18 }) === "gut");
pruefe("am Richtwert wird gewarnt", auslastungStufe({ saetze:18, kapazitaet:18, quote:1 }) === "hoch");
pruefe("ohne Saetze ruhig", auslastungStufe({ saetze:0, kapazitaet:18, quote:0 }) === "ruhig");
pruefe("ohne Angabe ruhig", auslastungStufe(null) === "ruhig");
pruefe("Erholung wird gemeldet",
  muskelAuslastung([eintrag("2026-07-24", "Klimmzüge", 3)], jung, {}, HEUTE).latissimus.erholt === true);
pruefe("heute belastet heisst nicht erholt",
  muskelAuslastung([eintrag(HEUTE, "Klimmzüge", 3)], jung, {}, HEUTE).latissimus.erholt === false);

/* Derselbe Umfang belastet einen Anfaenger staerker als einen Fortgeschrittenen. */
const anf = muskelAuslastung(viel, jung, { erfahrung:"anfaenger" }, HEUTE).pectoral;
const fort = muskelAuslastung(viel, jung, { erfahrung:"fortgeschritten" }, HEUTE).pectoral;
pruefe("gleicher Umfang, unterschiedliche Auslastung", anf.quote > fort.quote);

/* ---------- 6) Verdrahtung ---------- */
// v167: Der Aufruf traegt jetzt die Basis-Angabe mit (Urteil nur mit genug Trainings).
pruefe("die Detail-Karte zeigt die Auslastung", grabFn("muskelAuswahlZeichnen").includes("auslastungText(key, a, reicht)"));
pruefe("die Statuszeile warnt ohne Auswahl", grabFn("muskelStatusText").includes('auslastungStufe(alle[m]) === "zuviel"'));
pruefe("die Farbe folgt der Stufe", src.includes('stufe === "zuviel" ? "var(--warn)"'));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
