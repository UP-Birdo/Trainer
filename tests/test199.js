/* v199-Test: Aktivitaeten im Notizblock (47. Runde B, zweite Haelfte).

   Nutzer-Wunsch woertlich: „Aktivitaets-Sportarten stehen mit ihren Werten im
   Notizblock" — Beispiel „laufen 2,11km 14min". Bis v198 kannte der Block nur
   Kraft-Zeilen; ein Laufplan zeigte dort GAR NICHTS, weil seine Werte am Plan
   haengen (strecke, dauer) und nicht an einer Uebung.

   Die Regeln, die den Bau bestimmen — und die hier festgehalten werden:
   1. ANKER: Eine Aktivitaets-Zeile muss mit dem Namen einer Aktivitaets-Sportart
      beginnen. Sonst wuerde aus „Plank 45 s" eine Ausdauer-Einheit.
   2. KEIN WERT, KEIN EFFEKT (v172-Linie): Was die Zeile nicht nennt, aendert
      nichts.
   3. EINE SPORTART JE ABSCHNITT: Der Wechsel ist gesperrt, solange Uebungen
      drinstehen — dieselbe Regel wie im Editor (planSportartSetzen).
   4. RUNDREISE: Was die App schreibt, liest sie unveraendert wieder ein —
      deshalb steht in der Zeile keine Pace (die waere eine dritte Zahl).
   5. KEINE DOPPELZAEHLUNG: Wo Saetze protokolliert sind, zaehlen die Saetze,
      nicht noch einmal die Dauer (v197 nachgeschaerft).
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
function grabLine(anfang){
  const zeile = src.split("\n").find(z => z.trim().startsWith(anfang));
  if(!zeile) throw new Error("Zeile nicht gefunden: " + anfang);
  return zeile.trim();
}
/* Das ECHTE Sportart-Register — ein Stub wuerde genau die Namen erfinden,
   um die es hier geht („Yoga & Beweglichkeit"). */
function grabListe(name){
  const i = src.indexOf("const " + name + " = [");
  if(i < 0) throw new Error("Liste nicht gefunden: " + name);
  const start = src.indexOf("[", i);
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === "[") tiefe++;
    else if(src[k] === "]"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  "const MAX_DAUER_S = 24 * 3600;",
  "const UEBUNGEN_DB = [{ name:'Liegestütze', kat:'druck', geraet:'keine' }];",
  grabListe("SPORTARTEN"),
  grabListe("ZEITEINHEITEN"),
  "let sitzung = { daten: { plaene: [] } };",
  "let toasts = [];",
  "function speichern(){}",
  "function zeigenToast(t, art){ toasts.push(t); }",
  grabFn("begrenzen"),
  grabFn("normName"),
  grabFn("neueId"),
  grabFn("neueUebung"),
  grabFn("findePlan"),
  grabFn("sportart"),
  grabFn("sportartName"),
  grabFn("planTypFuer"),
  grabFn("hatStrecke"),
  grabFn("zeitEinheit"),
  grabFn("inEinheit"),
  grabFn("inSekunden"),
  grabFn("zeitKurz"),
  grabFn("zahlKurz"),
  grabFn("toastListe"),
  grabLine("const NOTIZ_MUSTER"),
  grabLine("const NOTIZ_PAAR"),
  grabLine("const NOTIZ_GEWICHT"),
  grabLine("const NOTIZ_STRECKE"),
  grabLine("const NOTIZ_DAUER"),
  grabFn("notizZeileDeuten"),
  grabFn("kommaZahl"),
  grabFn("notizSportart"),
  grabFn("streckeInEinheit"),
  grabFn("notizZeitEinheit"),
  grabFn("notizAktivitaetDeuten"),
  grabFn("aktivitaetAlsZeile"),
  grabFn("notizEinheitUebernehmen"),
  grabFn("uebungAlsZeile"),
  grabFn("notizZeilenModell"),
  grabFn("abschnittTextErzeugen"),
  grabFn("abschnittTextSetzen"),
  grabFn("istSollEintrag"),
  grabLine("const AKTIVITAET_MINUTEN_JE_SATZ"),
  grabLine("const AKTIVITAET_MAX_SAETZE"),
  "const SPORT_LAST_MUSKELN = { laufen:{ p:['quadriceps'], s:['calves'] } };",
  grabFn("aktivitaetSaetze"),
  grabFn("alsEinheitZaehlbar"),
  "module.exports = { get sitzung(){ return sitzung; }, get toasts(){ return toasts; }," +
  " leereToasts(){ toasts = []; }, notizSportart, streckeInEinheit, notizZeitEinheit," +
  " notizAktivitaetDeuten, aktivitaetAlsZeile, notizEinheitUebernehmen, notizZeilenModell," +
  " abschnittTextErzeugen, abschnittTextSetzen, alsEinheitZaehlbar };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) ANKER: mit welcher Sportart beginnt die Zeile? ---------- */
pruefe("die Sportart am Zeilenanfang wird erkannt", A.notizSportart("laufen 5 km") === "laufen");
pruefe("Gross- und Kleinschreibung egal", A.notizSportart("Laufen 5 km") === "laufen");
pruefe("die Sportart allein genuegt", A.notizSportart("Radfahren") === "radfahren");
pruefe("das erste Wort des Namens reicht (Yoga & Beweglichkeit)",
  A.notizSportart("yoga 30 min") === "yoga");
pruefe("der volle Name geht auch",
  A.notizSportart("Yoga & Beweglichkeit 30 min") === "yoga");
pruefe("eine Kraftuebung ist keine Sportart-Zeile", A.notizSportart("Kniebeugen 3 10") === null);
pruefe("Kraft steht bewusst nicht zur Wahl", A.notizSportart("Krafttraining 3 10") === null);
pruefe("ein Wort, das nur so ANFAENGT, zaehlt nicht",
  A.notizSportart("Laufband-Intervalle 5 400") === null);
pruefe("die Sportart muss VORNE stehen", A.notizSportart("nach dem Laufen 5 km") === null);
pruefe("leere Zeile ergibt nichts", A.notizSportart("") === null && A.notizSportart(null) === null);
pruefe("Tischtennis wird nicht mit Tennis verwechselt",
  A.notizSportart("Tischtennis 60 min") === "tischtennis" &&
  A.notizSportart("Tennis 60 min") === "tennis");

/* ---------- 2) Strecke in der Einheit der Sportart ---------- */
pruefe("Kilometer bleiben Kilometer", A.streckeInEinheit(2.11, "km", "laufen") === 2.11);
pruefe("Meter werden beim Laufen zu Kilometern", A.streckeInEinheit(500, "m", "laufen") === 0.5);
pruefe("Kilometer werden beim Schwimmen zu Metern",
  A.streckeInEinheit(1.5, "km", "schwimmen") === 1500);
pruefe("Meter bleiben beim Schwimmen Meter", A.streckeInEinheit(800, "m", "schwimmen") === 800);
pruefe("ohne Streckenmass gibt es keine Strecke",
  A.streckeInEinheit(5, "km", "yoga") === null && A.streckeInEinheit(5, "km", "klettern") === null);
pruefe("null und Unsinn ergeben nichts",
  A.streckeInEinheit(0, "km", "laufen") === null && A.streckeInEinheit(NaN, "km", "laufen") === null);

/* ---------- 3) Zeiteinheiten ---------- */
pruefe("Stunden in allen Schreibweisen",
  ["h", "std", "Stunden"].every(g => A.notizZeitEinheit(g) === "h"));
pruefe("Sekunden in allen Schreibweisen",
  ["s", "sek", "Sekunden"].every(g => A.notizZeitEinheit(g) === "s"));
pruefe("alles andere sind Minuten",
  A.notizZeitEinheit("min") === "min" && A.notizZeitEinheit("Minuten") === "min");

/* ---------- 4) Die ganze Zeile deuten ---------- */
const w = A.notizAktivitaetDeuten("laufen 2,11km 14min");   // der Wunsch, woertlich
pruefe("der Wunsch-Fall: Sportart", w.sportart === "laufen");
pruefe("der Wunsch-Fall: Strecke", w.strecke === 2.11);
pruefe("der Wunsch-Fall: Zeit", w.sekunden === 840);
pruefe("mit Leerzeichen genauso",
  A.notizAktivitaetDeuten("Laufen 2,11 km 14 min").sekunden === 840);
pruefe("Punkt statt Komma geht auch",
  A.notizAktivitaetDeuten("Laufen 2.11 km").strecke === 2.11);
pruefe("Stunden werden umgerechnet",
  A.notizAktivitaetDeuten("Radfahren 1,5 h").sekunden === 5400);
/* KEIN WERT, KEIN EFFEKT: was nicht dasteht, kommt als null zurueck. */
const nurZeit = A.notizAktivitaetDeuten("Laufen 30 min");
pruefe("ohne Strecke bleibt die Strecke null", nurZeit.strecke === null && nurZeit.sekunden === 1800);
const nurName = A.notizAktivitaetDeuten("Laufen");
pruefe("ohne Werte bleibt beides null",
  nurName.sekunden === null && nurName.strecke === null && nurName.sportart === "laufen");
pruefe("eine Kraft-Zeile bleibt unangetastet",
  A.notizAktivitaetDeuten("Sätze 3 Wdh 10 Kniebeugen") === null);
pruefe("und eine Zeit-Uebung wird KEINE Ausdauer-Einheit",
  A.notizAktivitaetDeuten("Plank 45 s") === null);
pruefe("die Minuten werden nicht als Meter gelesen",
  A.notizAktivitaetDeuten("Laufen 14min").strecke === null);
pruefe("eine unsinnig lange Einheit wird gedeckelt",
  A.notizAktivitaetDeuten("Laufen 99 h").sekunden === 24 * 3600);

/* ---------- 5) RUNDREISE: schreiben und wieder lesen ---------- */
const lauf = { sportart:"laufen", typ:"aktivitaet", strecke:2.11, dauer:840, zeitEinheit:"min" };
pruefe("die Einheit wird als Zeile geschrieben",
  A.aktivitaetAlsZeile(lauf) === "Laufen 2,11 km 14 min");
const zurueck = A.notizAktivitaetDeuten(A.aktivitaetAlsZeile(lauf));
pruefe("und unveraendert wieder gelesen",
  zurueck.sportart === "laufen" && zurueck.strecke === 2.11 && zurueck.sekunden === 840);
pruefe("in der Zeile steht KEINE Pace (sonst waere sie eine dritte Zahl)",
  !/min\/km/.test(A.aktivitaetAlsZeile(lauf)));
pruefe("ohne Streckenmass steht nur die Zeit",
  A.aktivitaetAlsZeile({ sportart:"yoga", strecke:0, dauer:1800, zeitEinheit:"min" }) === "Yoga 30 min");
pruefe("das Schwimmbecken rechnet in Metern",
  A.aktivitaetAlsZeile({ sportart:"schwimmen", strecke:800, dauer:1500, zeitEinheit:"min" })
    === "Schwimmen 800 m 25 min");
pruefe("ohne Werte bleibt der Name allein stehen",
  A.aktivitaetAlsZeile({ sportart:"laufen", strecke:0, dauer:0 }) === "Laufen");

/* ---------- 6) Uebernehmen: eine Sportart je Abschnitt ---------- */
const leer = { id:"p1", sportart:"kraft", typ:"kraft", uebungen:[] };
pruefe("ein leerer Abschnitt darf die Sportart wechseln",
  A.notizEinheitUebernehmen(leer, { sportart:"laufen", strecke:5, sekunden:1800, zeitEinheit:"min" }));
pruefe("und ist danach eine Aktivitaet",
  leer.sportart === "laufen" && leer.typ === "aktivitaet");
pruefe("die Werte stehen im Plan", leer.strecke === 5 && leer.dauer === 1800);
pruefe("die Felder, die der Typ braucht, sind da",
  typeof leer.zeitEinheit === "string" && !!leer.steigerung);
const voll = { id:"p2", sportart:"kraft", typ:"kraft", uebungen:[{ id:"u1", name:"Kniebeugen" }] };
pruefe("ein Abschnitt MIT Uebungen wechselt die Sportart nicht",
  A.notizEinheitUebernehmen(voll, { sportart:"laufen", strecke:5, sekunden:1800, zeitEinheit:"min" })
    === false);
pruefe("und bleibt unveraendert", voll.sportart === "kraft" && voll.strecke === undefined);
/* Kein Wert, kein Effekt — auch beim Uebernehmen. */
const bestand = { id:"p3", sportart:"laufen", typ:"aktivitaet", uebungen:[], strecke:10, dauer:3600, zeitEinheit:"min" };
A.notizEinheitUebernehmen(bestand, { sportart:"laufen", strecke:null, sekunden:null, zeitEinheit:"min" });
pruefe("ohne genannte Werte bleibt alles stehen",
  bestand.strecke === 10 && bestand.dauer === 3600);
A.notizEinheitUebernehmen(bestand, { sportart:"laufen", strecke:null, sekunden:1200, zeitEinheit:"min" });
pruefe("nur der genannte Wert aendert sich",
  bestand.strecke === 10 && bestand.dauer === 1200);

/* ---------- 7) Der Block zeigt die Einheit ---------- */
const zeilen = A.notizZeilenModell({ sportart:"laufen", typ:"aktivitaet", strecke:5, dauer:1800,
                                     zeitEinheit:"min", uebungen:[], freitext:"" });
pruefe("die Einheit steht als erste Zeile", zeilen.length === 1 && zeilen[0].text === "Laufen 5 km 30 min");
pruefe("sie ist als Einheit markiert", zeilen[0].einheit === true && zeilen[0].uebung === null);
const mitDrill = A.notizZeilenModell({ sportart:"laufen", typ:"aktivitaet", strecke:5, dauer:1800,
  zeitEinheit:"min", uebungen:[{ id:"u1", name:"Steigerungsläufe", modus:"wdh", saetze:4, wdh:1, gewicht:0 }], freitext:"" });
pruefe("die Drills stehen darunter", mitDrill.length === 2 && !!mitDrill[1].uebung);
pruefe("ein Kraft-Abschnitt bekommt KEINE Einheit-Zeile",
  A.notizZeilenModell({ sportart:"kraft", typ:"kraft",
    uebungen:[{ id:"u1", name:"Dips", modus:"wdh", saetze:3, wdh:10, gewicht:0 }], freitext:"" })
    .every(z => !z.einheit));
pruefe("und die Text-Sicht zeigt dasselbe",
  A.abschnittTextErzeugen({ sportart:"laufen", typ:"aktivitaet", strecke:5, dauer:1800,
                            zeitEinheit:"min", uebungen:[], freitext:"" }) === "Laufen 5 km 30 min");

/* ---------- 8) Speichern: die Zeile landet im Plan ---------- */
A.sitzung.daten.plaene = [{ id:"n1", name:"Montag", sportart:"kraft", typ:"kraft",
                            tage:[], uebungen:[], freitext:"" }];
A.leereToasts();
A.abschnittTextSetzen("n1", "laufen 2,11 km 14 min");
const n1 = A.sitzung.daten.plaene[0];
pruefe("aus der Zeile wird die Einheit des Abschnitts",
  n1.typ === "aktivitaet" && n1.sportart === "laufen" && n1.strecke === 2.11 && n1.dauer === 840);
pruefe("und KEINE Uebung namens Laufen", n1.uebungen.length === 0);
pruefe("sie steht auch nicht als Freitext herum", !n1.freitext);
/* Drills duerfen daneben stehen. */
A.abschnittTextSetzen("n1", "Laufen 2,11 km 14 min\nSätze 4 Wdh 1 Steigerungsläufe");
pruefe("Drills bleiben Uebungen", n1.uebungen.length === 1 && n1.uebungen[0].name === "Steigerungsläufe");
pruefe("die Einheit bleibt dabei stehen", n1.strecke === 2.11 && n1.dauer === 840);
/* Eine ZWEITE Einheit-Zeile ueberschreibt die erste nicht still. */
A.abschnittTextSetzen("n1", "Laufen 3 km 20 min\nLaufen 9 km 60 min");
pruefe("die erste Einheit-Zeile gilt", n1.strecke === 3 && n1.dauer === 1200);
pruefe("die zweite bleibt als Text stehen, statt zu verschwinden",
  n1.freitext.indexOf("9 km") >= 0);
/* Ein Kraft-Abschnitt mit Uebungen kippt nicht um. */
A.sitzung.daten.plaene = [{ id:"n2", name:"Ganzkörper", sportart:"kraft", typ:"kraft",
                            tage:[], uebungen:[], freitext:"" }];
A.leereToasts();
A.abschnittTextSetzen("n2", "Sätze 3 Wdh 10 Liegestütze\nLaufen 5 km 30 min");
const n2 = A.sitzung.daten.plaene[0];
pruefe("der Kraft-Abschnitt bleibt Kraft", n2.typ === "kraft" && n2.sportart === "kraft");
pruefe("die Uebung ist trotzdem angelegt", n2.uebungen.length === 1);
pruefe("die Lauf-Zeile geht nicht verloren", n2.freitext.indexOf("Laufen") >= 0);
pruefe("und der Nutzer erfaehrt, warum",
  A.toasts.some(t => /Sportart/.test(t)));

/* ---------- 9) KEINE DOPPELZAEHLUNG (v197 nachgeschaerft) ---------- */
const einheit = { typ:"aktivitaet", sportart:"laufen", dauerMin:30, saetze:[] };
pruefe("eine reine Einheit zaehlt in die Muskelkarte", A.alsEinheitZaehlbar(einheit));
pruefe("mit protokollierten Saetzen zaehlen die Saetze",
  !A.alsEinheitZaehlbar({ typ:"aktivitaet", sportart:"laufen", dauerMin:30,
                          saetze:[{ uebungId:"u1", satz:1, wdh:10 }] }));
pruefe("auch abgehakte Saetze verhindern die Doppelzaehlung",
  !A.alsEinheitZaehlbar({ typ:"aktivitaet", sportart:"laufen", dauerMin:30,
                          saetze:[{ uebungId:"u1", satz:1, wdh:10, soll:true }] }));
pruefe("ein Kraft-Eintrag bleibt aussen vor",
  !A.alsEinheitZaehlbar({ typ:"kraft", sportart:"kraft", dauerMin:30, saetze:[] }));
/* Bis v198 stand hier `echteSaetze` — das liess Soll-Saetze durch, und mit dem
   Notizblock koennte ein Eintrag beides tragen (Einheit UND abgehakte Drills). */
pruefe("gezaehlt wird nicht mehr nur nach gemessenen Saetzen",
  !grabFn("alsEinheitZaehlbar").includes("echteSaetze("));

/* ---------- 10) Verdrahtung: der Haken der Einheit ---------- */
const einheitHaken = grabFn("notizEinheitHakenUmschalten");
pruefe("nur Aktivitaets-Abschnitte haben eine Einheit",
  einheitHaken.includes('p.typ !== "aktivitaet"'));
pruefe("es wird immer HEUTE abgehakt", einheitHaken.includes("heuteAlsText()"));
pruefe("der Eintrag kommt vom gemeinsamen Erzeuger",
  einheitHaken.includes("notizEintragHolen(p, heute)"));
pruefe("die Werte kommen aus dem Plan, nicht aus einer Schaetzung",
  einheitHaken.includes("e.strecke = p.strecke || 0") &&
  einheitHaken.includes("Math.round((p.dauer || 0) / 60)"));
pruefe("der Haken laesst sich wieder wegnehmen", einheitHaken.includes("da.einheit = false"));
pruefe("ein leer gewordener Eintrag verschwindet",
  /if\(!da\.saetze\.length\) protokoll\.splice/.test(einheitHaken));
pruefe("Flamme, Kalender und Statistik ziehen nach",
  einheitHaken.includes("fortschrittNeuZeichnen()"));
/* Leitplanke 8: Stufe 1 fragt nichts und bewertet nichts. */
pruefe("die Einheit fragt nichts", !/frage\(/.test(einheitHaken));
pruefe("und bewertet nichts",
  !/bewertungOeffnen|zieleAnwenden|progression/i.test(einheitHaken));
/* Die echte Dauer darf die Schaetzung aus der Satzzahl nicht verlieren. */
pruefe("die Dauer der Einheit ueberlebt das Auffrischen",
  grabFn("notizEintragAuffrischen").includes("if(!e.einheit) e.dauerMin"));
pruefe("die Einheit-Zeile traegt ihren eigenen Haken",
  grabFn("notizZeileHtml").includes("notizEinheitHakenHtml(p)"));
pruefe("der Abgleich zieht ihn genauso nach",
  grabFn("notizZeilenAbgleichen").includes("notizEinheitHakenHtml(p)"));

/* ---------- 11) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v199",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 199);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.199", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
