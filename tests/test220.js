/* v220-Test: Der Nutzer bestimmt den Ablauf selbst. (60. Runde, Staffel A + B.)

   Die vier Zusagen:
   1. PAUSE 0 HEISST OHNE PAUSE. Sie ueberlebt das Speichern (Untergrenze 0 statt
      10 s), der Ablauf betritt sie nicht mehr, und auch die halbe Pause nach
      einem Aufwaermsatz bleibt dann aus.
   2. ABGEBROCHEN IST NICHT UMSONST. Der Abbruch schreibt einen Protokolleintrag
      aus den fertigen Saetzen — in derselben Form wie das beendete Training.
   3. OHNE BEWERTUNG. Ein Abbruch fasst die Progression NICHT an (v70-/v182-Linie).
   4. UMSTELLEN VOR DEM START. In der Vorschau verschiebt der Langdruck eine
      Uebung, ein Tipp auf die Pausen-Zeile aendert die Pause — und die
      Superatz-Kopplung bleibt dabei am PLATZ, nicht an der Uebung.
   Dazu die Stoppuhr oben im Training.
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

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("rampenPause"),
  grabFn("verstricheneSekunden"),
  grabFn("trainingsEintrag"),
  grabFn("uebungenTauschen"),
  "module.exports = { rampenPause, verstricheneSekunden, trainingsEintrag, uebungenTauschen };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Pause 0 heisst ohne Pause ---------- */
pruefe("ohne Pause bleibt die Rampe ohne Pause", A.rampenPause(0) === 0);
pruefe("die halbe Pause ist die haelfte", A.rampenPause(90) === 45);
pruefe("mindestens 30 s bleiben stehen", A.rampenPause(60) === 30);
/* Wer 20 s zwischen den Saetzen macht, will nach dem Aufwaermen keine 30. */
pruefe("nie laenger als die Arbeitspause selbst", A.rampenPause(20) === 20);
pruefe("ohne Angabe gilt der alte Rueckfall auf 60 s", A.rampenPause(undefined) === 30);
pruefe("kaputte Werte werfen nicht", A.rampenPause("viel") === 30 && A.rampenPause(null) === 30);
pruefe("negative Werte gelten als ohne Pause", A.rampenPause(-5) === 0);

/* Die Klemme beim Speichern laesst die 0 jetzt durch. */
const speichernFn = grabFn("editorSpeichern");
pruefe("die Untergrenze der Pause ist 0, nicht 10",
  /u\.pause\s*=\s*begrenzen\(Math\.round\(u\.pause\),\s*0,\s*600\)/.test(speichernFn));
/* Der Ablauf baut die Rampen-Pause ueber die neue Funktion. */
pruefe("der klassische Ablauf rechnet die Rampen-Pause ueber rampenPause",
  grabFn("klassischerAblauf").includes("rampenPause(u.pause)"));
/* Und der Trainingsbildschirm betritt eine 0-Pause gar nicht erst. */
const betreten = grabFn("schrittBetreten");
pruefe("eine Pause ohne Sekunden wird uebersprungen",
  /s\.typ === "pause" && !\(s\.sekunden > 0\)/.test(betreten));
pruefe("dabei geht es sofort zum naechsten Schritt",
  /lauf\.index\+\+;\s*\n\s*schrittBetreten\(\);\s*\n\s*return;/.test(betreten));
/* Die Messung aus v188 bleibt ehrlich: die Wanduhr laeuft weiter. */
pruefe("die Pausen-Messung wird trotzdem gestartet",
  betreten.indexOf("lauf.pauseStart = Date.now()") < betreten.indexOf("lauf.index++"));

/* ---------- 2) Der Abbruch traegt ein ---------- */
const plan = { id:"p1", name:"Oberkörper", sportart:"kraft", tage:["mo"], uebungen:[] };
const saetze = [{ uebungId:"u1", name:"Bankdrücken", modus:"wdh", satz:1, wdh:8, gewicht:40 }];
const e = A.trainingsEintrag(plan, saetze, 7.4, "id-1", "2026-08-08");
pruefe("der Eintrag traegt id und Datum von aussen", e.id === "id-1" && e.datum === "2026-08-08");
pruefe("er kennt seinen Plan", e.plan === "Oberkörper" && e.planId === "p1");
pruefe("die Sportart wandert mit", e.sportart === "kraft");
pruefe("er ist ein Kraft-Eintrag", e.typ === "kraft");
pruefe("mit festem Tag ist es kein Sondertraining", e.sonder === false);
pruefe("die Dauer wird gerundet", e.dauerMin === 7);
pruefe("die geschafften Saetze sind drin", e.saetze.length === 1);
pruefe("ein Plan ohne Tag ist ein Sondertraining",
  A.trainingsEintrag({ id:"p2", name:"X", tage:[] }, [], 1, "i", "d").sonder === true);
pruefe("ein alter Plan ohne tage-Feld faellt nicht um",
  A.trainingsEintrag({ id:"p3", name:"X" }, [], 1, "i", "d").sonder === true);
/* Ein Training, das kuerzer als eine Minute war, ist trotzdem eines. */
pruefe("die Dauer ist nie 0", A.trainingsEintrag(plan, [], 0.2, "i", "d").dauerMin === 1);
pruefe("kaputte Dauer wirft nicht", A.trainingsEintrag(plan, [], "viel", "i", "d").dauerMin === 1);
pruefe("ohne Saetze bleibt die Liste leer",
  A.trainingsEintrag(plan, null, 5, "i", "d").saetze.length === 0);

/* ---------- 3) Verdrahtung des Abbruchs ---------- */
const abbrechen = grabFn("trainingAbbrechen");
pruefe("der Abbruch baut den Eintrag ueber dieselbe Funktion",
  abbrechen.includes("trainingsEintrag("));
pruefe("und legt ihn ins Protokoll", abbrechen.includes("sitzung.daten.protokoll.push"));
pruefe("gespeichert wird auch", abbrechen.includes("speichern()"));
pruefe("alles Abgeleitete zieht sofort mit", abbrechen.includes("fortschrittNeuZeichnen()"));
/* Ohne einen einzigen fertigen Satz gibt es nichts einzutragen. */
pruefe("ohne Saetze wird nichts geschrieben", /if\(saetze\.length\)\{/.test(abbrechen));
pruefe("der Dialog verspricht das Eintragen", abbrechen.includes("Eingetragen wird, was du geschafft hast"));
pruefe("der alte Satz nichts wird protokolliert ist weg",
  !src.includes("Es wird nichts angepasst und nichts protokolliert"));
/* Die Grenze: keine Bewertung, keine Progression. */
pruefe("der Abbruch bewertet nicht",
  !abbrechen.includes("bewertungOeffnen") && !abbrechen.includes("progressionAnwenden") &&
  !abbrechen.includes("zieleAnwenden"));
pruefe("der Merker wird geloescht (kein Wiederaufnahme-Angebot)",
  abbrechen.includes("trainingMerkerLoeschen()"));
/* Und das beendete Training nutzt dieselbe eine Form. */
pruefe("auch trainingBeenden baut ueber trainingsEintrag",
  grabFn("trainingBeenden").includes("trainingsEintrag(plan, lauf.saetze"));

/* ---------- 4) Die Stoppuhr oben ---------- */
pruefe("null Sekunden am Anfang", A.verstricheneSekunden(1000, 1000) === 0);
pruefe("sie zaehlt in Sekunden", A.verstricheneSekunden(1000, 61000) === 60);
pruefe("angefangene Sekunden zaehlen nicht mit", A.verstricheneSekunden(0, 1999) === 1);
pruefe("eine rueckwaerts laufende Uhr ergibt nie etwas Negatives",
  A.verstricheneSekunden(5000, 1000) === 0);
pruefe("kaputte Werte werfen nicht",
  A.verstricheneSekunden(null, "x") === 0 && A.verstricheneSekunden(undefined, 5) === 0);
pruefe("die Anzeige gibt es", src.includes('id="gesamtzeit"'));
pruefe("der Schritt-Text hat sein eigenes Feld bekommen", src.includes('id="balken-schritt"'));
pruefe("der Balken schreibt nicht mehr die ganze Zeile",
  grabFn("gesamtBalkenZeichnen").includes('getElementById("balken-schritt")'));
pruefe("sie liest dieselbe Quelle wie die Trainingsdauer",
  grabFn("gesamtUhrZeichnen").includes("lauf.startZeit"));
/* Eigener Takt, weil bei einem Wdh-Satz gar kein Countdown laeuft. */
pruefe("sie hat einen eigenen Sekunden-Takt",
  /setInterval\(gesamtUhrZeichnen, 1000\)/.test(grabFn("gesamtUhrStarten")));
pruefe("beide Startpunkte starten sie",
  grabFn("trainingLosgehts").includes("gesamtUhrStarten()") &&
  grabFn("trainingFortsetzenAnbieten").includes("gesamtUhrStarten()"));
pruefe("und sie wird wieder gestoppt",
  grabFn("aufraeumen").includes("gesamtUhrStoppen()") &&
  grabFn("trainingBeenden").includes("gesamtUhrStoppen()"));

/* ---------- 5) Vorschau: verschieben ---------- */
const u = (name, super_) => ({ id:name, name:name, pause:60, superMitNaechster:!!super_ });
const liste = [u("A", true), u("B"), u("C")];        // A+B sind ein Superatz
const runter = A.uebungenTauschen(liste, 0, 1);
pruefe("die Uebung wandert nach unten", runter.map(x => x.name).join("") === "BAC");
pruefe("das Original bleibt unberuehrt", liste.map(x => x.name).join("") === "ABC");
/* Innerhalb des Paares getauscht: dasselbe Paar, nur andere Reihenfolge. */
pruefe("die Kopplung bleibt am Platz, das Paar bleibt ein Paar",
  runter[0].superMitNaechster === true && runter[1].superMitNaechster === false);
/* C zwischen A und B geschoben: C gehoert ab da zum Paar, B steht frei. */
const dazwischen = A.uebungenTauschen(liste, 2, -1);
pruefe("die dritte Uebung rutscht ins Paar", dazwischen.map(x => x.name).join("") === "ACB");
pruefe("und die verdraengte steht frei dahinter",
  dazwischen[0].superMitNaechster === true && dazwischen[2].superMitNaechster === false);
pruefe("die letzte Uebung koppelt nie",
  A.uebungenTauschen([u("A"), u("B", true)], 0, 1).slice(-1)[0].superMitNaechster === false);
/* Die Raender. */
pruefe("ueber den Anfang hinaus passiert nichts",
  A.uebungenTauschen(liste, 0, -1).map(x => x.name).join("") === "ABC");
pruefe("ueber das Ende hinaus passiert nichts",
  A.uebungenTauschen(liste, 2, 1).map(x => x.name).join("") === "ABC");
pruefe("eine leere Liste wirft nicht", A.uebungenTauschen([], 0, 1).length === 0);
pruefe("keine Liste wirft nicht", A.uebungenTauschen(null, 0, 1).length === 0);

/* ---------- 6) Vorschau: Verdrahtung ---------- */
const zeichnen = grabFn("vorschauZeichnen");
pruefe("die Zeilen tragen den Griff", zeichnen.includes("data-vs-uebung="));
pruefe("Bonus-Phasen bekommen keinen",
  /aufwaermen" \|\| schritt\.typ === "dehnen"\)\s*\n?\s*\? "" : ' data-vs-uebung/.test(zeichnen));
pruefe("der Langdruck wird nach dem Zeichnen angebunden", zeichnen.includes("langdruckEinrichten()"));
pruefe("die Vorschau-Zeilen haengen im gemeinsamen Einrichter",
  grabFn("langdruckEinrichten").includes("[data-vs-uebung]"));
pruefe("die Pausen-Zeile ist antippbar", zeichnen.includes("vorschauPauseMenue("));
pruefe("eine Pause von 0 heisst dort ohne Pause", zeichnen.includes('"ohne Pause"'));
const menue = grabFn("vorschauUebungMenue");
pruefe("das Menue bietet beide Richtungen",
  menue.includes("vorschauUebungSchieben(i, -1)") && menue.includes("vorschauUebungSchieben(i, 1)"));
pruefe("und die Pause", menue.includes("vorschauPauseMenue(i)"));
/* Im Zirkel waere ein Pfeil ein leeres Versprechen. */
pruefe("im Zirkel gibt es keine Pfeile", menue.includes("!zirkel && i > 0"));
pruefe("und der Titel sagt warum", menue.includes("im Zirkel mischt jede Runde neu"));
/* Geloescht oder gekoppelt wird hier NICHT — das ist Editor-Arbeit. */
pruefe("kein Loeschen kurz vor dem Start",
  !menue.includes("uebungLoeschen") && !menue.includes("superKopplungUmschalten"));
const setzen = grabFn("vorschauPauseSetzen");
pruefe("die Pause wird geklemmt", setzen.includes("begrenzen(Math.round(sekunden), 0, 600)"));
pruefe("0 steht im Angebot", /const VS_PAUSEN = \[0,/.test(src));
/* Die Vorschau-Regel: der gespeicherte Plan bleibt unberuehrt. */
pruefe("gearbeitet wird auf der Kopie",
  grabFn("trainingStarten").includes("JSON.parse(JSON.stringify(plan))"));
pruefe("der alte Satz zu den Pausen ist weg",
  !src.includes("Die Pausen bleiben immer die der Übung davor"));

/* ---------- 7) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v220",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 220);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.220", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
