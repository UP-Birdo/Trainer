/* v174-Test: Der Haken je Zeile — Verlauf fuer Stufe 1 und 2.

   Nutzer-Entscheidung zur offenen Frage aus v173: Der Notizblock SOLL einen
   Verlauf bekommen — nicht als zweites Eingabefeld („Getan" ist seit v155 zu
   Recht weg), sondern als Haken an der Zeile, der sich Zeitpunkt und Uebung
   merkt und beides „kompatibel fuer die anderen Stufen" eintraegt.

   Geprueft werden genau die drei Zusagen, die den Bau bestimmen:
   1. KOMPATIBEL: Der Eintrag hat dieselbe Form wie der von `kraftErledigt` —
      Feld fuer Feld gegen die ECHTE Funktion verglichen, damit die beiden
      nicht auseinanderlaufen koennen.
   2. EHRLICH: Die Saetze tragen `soll:true` (v158) — ein Haken sagt „gemacht",
      nicht „genau diese Zahlen geschafft".
   3. EIN EINTRAG JE ABSCHNITT UND TAG: sonst wuerden aus sechs Haken sechs
      „Trainings" und Serie, Kalender und das Mindestmass aus v167 waeren falsch.
   Dazu: ein echtes Training am selben Tag wird NICHT angefasst.
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
  grabFn("begrenzen"),
  grabFn("jetztAlsZeit"),
  grabFn("notizEintragFinden"),
  grabFn("notizAbgehakt"),
  grabFn("notizSaetzeFuer"),
  grabFn("notizEintragAuffrischen"),
  grabFn("eintragZeitspanne"),
  grabFn("istSollEintrag"),
  grabFn("echteSaetze"),
  "module.exports = { jetztAlsZeit, notizEintragFinden, notizAbgehakt, notizSaetzeFuer," +
  " notizEintragAuffrischen, eintragZeitspanne, istSollEintrag, echteSaetze };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const HEUTE = "2026-07-29", GESTERN = "2026-07-28";
const U = { id:"u1", name:"LH-Bankdrücken", modus:"wdh", saetze:3, wdh:8, gewicht:80 };
const U2 = { id:"u2", name:"Klimmzüge", modus:"wdh", saetze:4, wdh:6, gewicht:0 };
const UZEIT = { id:"u3", name:"Plank", modus:"zeit", saetze:2, dauer:45 };

/* ---------- 1) Die Saetze, die ein Haken schreibt ---------- */
const s1 = A.notizSaetzeFuer(U, "07:15");
pruefe("je geplantem Satz einer", s1.length === 3);
pruefe("sie sind durchnummeriert", s1.map(s => s.satz).join(",") === "1,2,3");
pruefe("alle tragen denselben Zeitpunkt", s1.every(s => s.zeit === "07:15"));
pruefe("alle haengen an der Uebung", s1.every(s => s.uebungId === "u1"));
pruefe("der Name steht dabei", s1.every(s => s.name === "LH-Bankdrücken"));
pruefe("EHRLICH: alle sind als Sollwerte markiert", s1.every(s => s.soll === true));
pruefe("und tragen keine erfundene Note", s1.every(s => s.note === null));
pruefe("Wdh und Gewicht kommen aus der Zeile",
  s1.every(s => s.wdh === 8 && s.gewicht === 80));
const sz = A.notizSaetzeFuer(UZEIT, "18:00");
pruefe("eine Zeit-Uebung bekommt dauer statt wdh",
  sz.length === 2 && sz.every(s => s.dauer === 45 && s.wdh === undefined));
pruefe("ohne Satzzahl wird EIN Satz geschrieben, nicht null",
  A.notizSaetzeFuer({ id:"x", name:"X" }, "08:00").length === 1);
pruefe("eine unsinnige Satzzahl wird gedeckelt",
  A.notizSaetzeFuer({ id:"x", name:"X", saetze:999 }, "08:00").length === 20);
pruefe("eine Zeile ohne Zahlen erfindet keine",
  A.notizSaetzeFuer({ id:"x", name:"X", modus:"wdh" }, "08:00")[0].wdh === 0);

/* ---------- 2) EHRLICH: die v158-Trennlinie greift ---------- */
const eintrag = { id:"e1", datum:HEUTE, planId:"p1", quelle:"notizblock", saetze:s1.slice() };
pruefe("der Eintrag gilt als Soll-Eintrag (v158)", A.istSollEintrag(eintrag));
pruefe("und liefert keine gemessenen Saetze", A.echteSaetze(eintrag).length === 0);

/* ---------- 3) EIN EINTRAG JE ABSCHNITT UND TAG ---------- */
const protokoll = [
  { id:"alt", datum:GESTERN, planId:"p1", quelle:"notizblock", saetze:A.notizSaetzeFuer(U, "19:00") },
  { id:"echt", datum:HEUTE, planId:"p1", saetze:[{ uebungId:"u1", satz:1, wdh:8, gewicht:82.5 }] },
  { id:"heute", datum:HEUTE, planId:"p1", quelle:"notizblock", saetze:s1.slice() },
  { id:"anderer", datum:HEUTE, planId:"p2", quelle:"notizblock", saetze:A.notizSaetzeFuer(U2, "08:00") }
];
pruefe("der Eintrag von heute wird gefunden",
  A.notizEintragFinden(protokoll, "p1", HEUTE).id === "heute");
pruefe("ein ECHTES Training am selben Tag wird NICHT angefasst",
  A.notizEintragFinden(protokoll, "p1", HEUTE).id !== "echt");
pruefe("ein anderer Abschnitt hat seinen eigenen Eintrag",
  A.notizEintragFinden(protokoll, "p2", HEUTE).id === "anderer");
pruefe("ein anderer Tag hat seinen eigenen",
  A.notizEintragFinden(protokoll, "p1", GESTERN).id === "alt");
pruefe("ohne Eintrag kommt null zurueck",
  A.notizEintragFinden(protokoll, "p9", HEUTE) === null);
pruefe("leeres Protokoll wirft nicht",
  A.notizEintragFinden([], "p1", HEUTE) === null && A.notizEintragFinden(null, "p1", HEUTE) === null);

/* ---------- 4) Abgehakt oder nicht ---------- */
pruefe("die abgehakte Uebung wird erkannt", A.notizAbgehakt(protokoll, "p1", HEUTE, "u1"));
pruefe("eine nicht abgehakte nicht", !A.notizAbgehakt(protokoll, "p1", HEUTE, "u2"));
pruefe("der Haken gilt NUR fuer seinen Tag",
  A.notizAbgehakt(protokoll, "p1", GESTERN, "u1") && !A.notizAbgehakt(protokoll, "p1", "2026-07-27", "u1"));
pruefe("und nur fuer seinen Abschnitt", !A.notizAbgehakt(protokoll, "p2", HEUTE, "u1"));
pruefe("das echte Training macht keinen Haken",
  !A.notizAbgehakt([protokoll[1]], "p1", HEUTE, "u1"));

/* ---------- 5) Auffrischen: Reihenfolge und Dauer ---------- */
const gemischt = { saetze: A.notizSaetzeFuer(U2, "09:30").concat(A.notizSaetzeFuer(U, "07:15")) };
A.notizEintragAuffrischen(gemischt);
pruefe("die Saetze stehen nach Zeitpunkt sortiert",
  gemischt.saetze[0].zeit === "07:15" && gemischt.saetze[gemischt.saetze.length - 1].zeit === "09:30");
pruefe("innerhalb einer Uebung bleibt die Satz-Reihenfolge",
  gemischt.saetze.filter(s => s.zeit === "07:15").map(s => s.satz).join(",") === "1,2,3");
pruefe("die Dauer wird geschaetzt wie beim Nachtragen (2 min je Satz)",
  gemischt.dauerMin === 14);
pruefe("ein einzelner Satz ergibt mindestens 1 min",
  A.notizEintragAuffrischen({ saetze:[{ satz:1, zeit:"07:00" }] }).dauerMin >= 1);

/* ---------- 6) Zeitspanne im Verlauf ---------- */
pruefe("ein Zeitpunkt steht allein da", A.eintragZeitspanne({ saetze:s1 }) === "07:15");
pruefe("mehrere ergeben eine Spanne", A.eintragZeitspanne(gemischt) === "07:15–09:30");
pruefe("ohne Zeiten steht nichts da",
  A.eintragZeitspanne({ saetze:[{ satz:1 }] }) === "");
pruefe("ein Eintrag ohne Saetze wirft nicht",
  A.eintragZeitspanne({}) === "" && A.eintragZeitspanne(null) === "");
pruefe("die Uhrzeit hat immer zwei Stellen", /^\d{2}:\d{2}$/.test(A.jetztAlsZeit()));

/* ---------- 7) KOMPATIBEL: dieselbe Form wie kraftErledigt ---------- */
const umschalten = grabFn("notizHakenUmschalten");
const erledigt = grabFn("kraftErledigt");
["datum:", "plan:", "planId:", "sportart:", "typ:", "sonder:", "dauerMin:", "notiz:", "saetze"]
  .forEach(feld => pruefe("der Eintrag hat dasselbe Feld wie kraftErledigt: " + feld,
    umschalten.includes(feld) && erledigt.includes(feld)));
pruefe("er traegt id: neueId() wie jeder andere", /id: neueId\(\)/.test(umschalten));
pruefe("typ ist kraft — die Saetze sind die Kraft-Form", /typ: "kraft"/.test(umschalten));
pruefe("sonder wird wie ueberall aus planAmTag abgeleitet",
  /sonder: !planAmTag\(p, heute\)/.test(umschalten));
pruefe("das Protokoll bleibt nach Datum sortiert",
  /protokoll\.sort\(\(a, b\) => a\.datum\.localeCompare\(b\.datum\)\)/.test(umschalten));
pruefe("der Notizblock-Eintrag ist als solcher markiert",
  /quelle: "notizblock"/.test(umschalten));

/* ---------- 8) Verhalten des Umschaltens ---------- */
pruefe("es wird immer HEUTE abgehakt", /const heute = heuteAlsText\(\)/.test(umschalten));
pruefe("eine namenlose Zeile ist nichts zum Abhaken",
  /if\(!u\.name \|\| !u\.name\.trim\(\)\) return;/.test(umschalten));
pruefe("der letzte Haken weg entfernt den leeren Eintrag",
  /if\(!e\.saetze\.length\) protokoll\.splice/.test(umschalten));
/* Gesucht ist der AUFRUF, nicht das Wort — im Kommentar daneben steht, warum
   der Papierkorb hier bewusst nicht benutzt wird. */
pruefe("und zwar OHNE Umweg ueber den Papierkorb",
  !/inPapierkorb\(/.test(umschalten));
pruefe("nur die Saetze DIESER Uebung verschwinden",
  /e\.saetze\.filter\(s => s\.uebungId !== uebungId\)/.test(umschalten));
pruefe("gespeichert wird danach", /speichern\(\);/.test(umschalten));
pruefe("und der Fortschritt zieht ueberall nach (v153)",
  /fortschrittNeuZeichnen\(\);/.test(umschalten));
pruefe("der Block wird neu gezeichnet", /notizblockZeichnen\(\);/.test(umschalten));
pruefe("der Zeitpunkt steht in der Rueckmeldung", /Gemacht um " \+ zeit/.test(umschalten));

/* ---------- 9) Verdrahtung in beiden Stufen ---------- */
const abschnitt = grabFn("notizAbschnittHtml");
/* Die Leiste hing bis v184 unter dem Textfeld, seit v185 steht sie davor
   (Nutzer-Ansage) — geprueft wird hier nur, DASS Stufe 1 sie bekommt; die
   Reihenfolge selbst haelt test185 fest. */
pruefe("Stufe 1 bekommt die Haken-Leiste",
  abschnitt.includes("notizHakenLeisteHtml(p)"));
pruefe("Stufe 2 bekommt den Haken IN der Zeile",
  abschnitt.includes("notizHakenHtml(p, u, true)"));
pruefe("eine namenlose Zeile bekommt stattdessen einen Platzhalter",
  abschnitt.includes('<span class="notiz-kopf-haken"></span>'));
pruefe("die Spaltenkoepfe haben die Haken-Spalte mitbekommen",
  /notiz-kopf"><span class="notiz-kopf-haken">/.test(abschnitt));
const leiste = grabFn("notizHakenLeisteHtml");
pruefe("ohne Uebungen erscheint keine Leiste", /if\(!uebungen\.length\) return "";/.test(leiste));
pruefe("namenlose Zeilen stehen nicht in der Leiste",
  /filter\(u => u\.name && u\.name\.trim\(\)\)/.test(leiste));
const hakenHtml = grabFn("notizHakenHtml");
pruefe("der Knopf sagt Vorlese-Programmen seinen Zustand", /aria-pressed=/.test(hakenHtml));
pruefe("und was er tut", /aria-label=/.test(hakenHtml));
pruefe("er nutzt NICHT den gelben Vollton", !/gewaehlt/.test(hakenHtml));
pruefe("sondern das Haus-Kaestchen aus v163", /plan-haken/.test(hakenHtml));
pruefe("es gibt ein Stylesheet dafuer",
  /\.notiz-haken\{/.test(src) && /\.notiz-haken\.an\{/.test(src));
pruefe("die kompakte Spalte ist so breit wie die des x-Knopfs",
  /\.notiz-haken\.klein\{width:44px/.test(src) && /\.notiz-kopf-haken\{width:44px/.test(src));

/* ---------- 10) Leitplanke 8 bleibt unberuehrt ---------- */
/* Der Haken fragt nichts und bewertet nichts — es wird kein Dialog geoeffnet
   und keine Note gesetzt. */
pruefe("der Haken stellt keine Frage", !/frage\(/.test(umschalten));
pruefe("und faellt kein Urteil", !/note:/.test(umschalten) && !/bewert/i.test(umschalten));
pruefe("die Analyse-Ansichten bleiben oben (Regression)",
  /"view-statistik": 4/.test(src) && /"view-tagescheck": 4/.test(src));

/* ---------- 11) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v174",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 174);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.174", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
