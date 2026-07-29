/* v177-Test: Trend des Koerpergewichts (Belastungs-Modell, Gruppe A, Punkt 5).

   Der heikelste Punkt der Gruppe — deshalb prueft diese Datei ZUERST die
   Abgrenzung: v160 hat Koerpergewicht und BMI als KAPAZITAETS-FAKTOR
   abgelehnt, und diese Ablehnung gilt unveraendert. Was v177 dazunimmt, ist
   nicht der STAND, sondern der VERLAUF — und auch der wird kein Faktor,
   sondern eine eigene Aussage (wie v161, v168, v176).

   Weiter geprueft:
   1. Mittelwerte statt Einzelwerte (Tagesgewicht schwankt um 1–2 %).
   2. Nur der ABFALL wird erwaehnt; Zunahme und Stillstand sagen nichts.
   3. Zu duenne Datenlage sagt gar nichts, statt zu raten.
   4. Der Satz stellt die Deutung unter Vorbehalt — die App kann nicht wissen,
      ob der Abfall gewollt ist.
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
function grabConst(name){
  const zeile = new RegExp("^const " + name + "\\s*=\\s*[^;]+;", "m").exec(src);
  if(!zeile) throw new Error("Konstante nicht gefunden: " + name);
  return zeile[0];
}
function grabLiteral(name, klammer){
  const auf = klammer || "[", zu = auf === "[" ? "]" : "}";
  const i = src.indexOf("const " + name + " = ");
  if(i < 0) throw new Error("Literal nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf(auf, i); k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabConst("GEWICHT_TREND_TAGE"),
  grabConst("GEWICHT_TREND_MIN"),
  grabConst("GEWICHT_TREND_ANTEIL"),
  grabFn("tageVerschieben"),
  grabFn("zahlKurz"),
  grabFn("gewichtTrend"),
  grabFn("gewichtTrendText"),
  "module.exports = { gewichtTrend, gewichtTrendText, tageVerschieben," +
  " GEWICHT_TREND_TAGE, GEWICHT_TREND_MIN, GEWICHT_TREND_ANTEIL };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const HEUTE = "2026-07-29";
const vor = n => A.tageVerschieben(HEUTE, -n);
/** Zwei Haelften mit je zwei Eintraegen: die aeltere auf `a`, die juengere auf `n`. */
function kurve(a, n){
  return [
    { datum: vor(20), kg: a }, { datum: vor(16), kg: a },
    { datum: vor(6),  kg: n }, { datum: vor(2),  kg: n }
  ];
}

/* ---------- 1) Die Abgrenzung zu v160 (wichtigster Test) ---------- */
/* Der STAND des Gewichts bleibt aus der Rechnung draussen — v177 nimmt nur den
   VERLAUF dazu, und auch den nicht als Faktor. */
["kapazitaetsFaktor", "muskelKapazitaet", "muskelLast", "muskelAuslastung", "auslastungStufe",
 "auslastungText"].forEach(fn =>
  pruefe(fn + " kennt den Gewichts-Trend nicht",
    !/gewichtTrend|GEWICHT_TREND/.test(grabFn(fn))));
pruefe("die Kapazitaets-Rechnung erwaehnt Gewicht und BMI weiterhin gar nicht",
  !/gewicht|bmi/i.test(grabFn("kapazitaetsFaktor")));
pruefe("der Trend ist eine eigene Aussage im Hinweis-Register",
  /gewichtTrendText\(gewichtTrend\(sitzung\.daten\.gewichte/.test(src));

/* ---------- 2) Mittelwerte statt Einzelwerte ---------- */
const t = A.gewichtTrend(kurve(80, 76), HEUTE);
pruefe("ein Trend wird erkannt", !!t);
pruefe("die aeltere Haelfte wird gemittelt", t.alt === 80);
pruefe("die juengere auch", t.neu === 76);
pruefe("der Anteil stimmt", Math.abs(t.anteil - 0.05) < 1e-9);
/* Ein einzelner Ausreisser darf den Trend nicht machen: derselbe Schnitt,
   aber die Tage schwanken. */
const schwankend = [
  { datum: vor(20), kg: 82 }, { datum: vor(16), kg: 78 },   // Schnitt 80
  { datum: vor(6),  kg: 76 }, { datum: vor(2),  kg: 80 }    // Schnitt 78
];
const ts = A.gewichtTrend(schwankend, HEUTE);
pruefe("Schwankungen gehen in den Schnitt ein, nicht als Einzelwert",
  ts.alt === 80 && ts.neu === 78);
pruefe("und ergeben hier nur 2,5 %", Math.abs(ts.anteil - 0.025) < 1e-9);

/* ---------- 3) Zu duenne Datenlage sagt nichts ---------- */
pruefe("ohne Eintraege kein Trend", A.gewichtTrend([], HEUTE) === null);
pruefe("null wirft nicht", A.gewichtTrend(null, HEUTE) === null);
pruefe("nur ein Eintrag je Haelfte reicht nicht",
  A.gewichtTrend([{ datum: vor(20), kg: 80 }, { datum: vor(2), kg: 76 }], HEUTE) === null);
pruefe("alle Eintraege in EINER Haelfte reichen nicht",
  A.gewichtTrend([{ datum: vor(6), kg: 80 }, { datum: vor(4), kg: 78 },
                  { datum: vor(2), kg: 76 }], HEUTE) === null);
pruefe("Eintraege ausserhalb des Fensters zaehlen nicht",
  A.gewichtTrend([{ datum: vor(60), kg: 90 }, { datum: vor(50), kg: 90 },
                  { datum: vor(6), kg: 76 }, { datum: vor(2), kg: 76 }], HEUTE) === null);
pruefe("ein Eintrag in der Zukunft zaehlt nicht",
  A.gewichtTrend(kurve(80, 76).concat([{ datum: A.tageVerschieben(HEUTE, 3), kg: 60 }]), HEUTE).neu === 76);
pruefe("kaputte Eintraege werfen nicht",
  A.gewichtTrend([null, {}, { datum:vor(5) }, { datum:vor(5), kg:0 }], HEUTE) === null);

/* ---------- 4) Nur der Abfall wird erwaehnt ---------- */
pruefe("ein deutlicher Abfall ergibt einen Satz",
  A.gewichtTrendText(A.gewichtTrend(kurve(80, 76), HEUTE)).length > 20);
pruefe("gleichbleibendes Gewicht sagt nichts",
  A.gewichtTrendText(A.gewichtTrend(kurve(80, 80), HEUTE)) === "");
pruefe("Zunahme sagt nichts",
  A.gewichtTrendText(A.gewichtTrend(kurve(76, 80), HEUTE)) === "");
pruefe("ein Abfall unter der Schwelle sagt nichts",
  A.gewichtTrendText(A.gewichtTrend(kurve(80, 79), HEUTE)) === "");
pruefe("genau an der Schwelle wird er erwaehnt",
  A.gewichtTrendText({ alt:100, neu:98, anteil:0.02 }).length > 20);
pruefe("ohne Trend kein Satz", A.gewichtTrendText(null) === "");

/* ---------- 5) Der Satz selbst ---------- */
const satz = A.gewichtTrendText(A.gewichtTrend(kurve(80, 76), HEUTE));
pruefe("er nennt die gezaehlte Menge", satz.indexOf("4 kg") > 0);
pruefe("er nennt den Zeitraum", satz.indexOf("drei Wochen") > 0);
pruefe("er stellt die Deutung unter Vorbehalt", satz.indexOf("Falls das nicht so gewollt ist") > 0);
pruefe("er nennt beide haeufigen Gruende",
  satz.indexOf("Erholung") > 0 && satz.indexOf("Essen") > 0);
pruefe("er behauptet keine Ueberlastung", !/überlast|krank|gefähr/i.test(satz));
pruefe("Kommazahlen deutsch",
  A.gewichtTrendText({ alt:80, neu:77.5, anteil:0.03 }).indexOf("2,5 kg") > 0);

/* ---------- 6) Das Hinweis-Register ---------- */
const register = grabLiteral("BELASTUNGS_HINWEISE");
pruefe("es gibt das Register", register.length > 20);
["entlastung", "gewicht"].forEach(id =>
  pruefe("der Hinweis " + id + " steht darin", new RegExp('id:"' + id + '"').test(register)));
const html = grabFn("belastungsHinweiseHtml");
pruefe("die Anzeige laeuft ueber das Register, nicht ueber Einzelaufrufe",
  /BELASTUNGS_HINWEISE[\s\S]*\.map\(h => h\.satz\(\)\)/.test(html));
pruefe("stumme Hinweise erzeugen keine leere Zeile", /\.filter\(Boolean\)/.test(html));
pruefe("jeder Hinweis bekommt seine eigene Zeile", /\.join\(""\)/.test(html));

/* ---------- 7) Die Zahlen ---------- */
pruefe("das Fenster sind drei Wochen", A.GEWICHT_TREND_TAGE === 21);
pruefe("jede Haelfte braucht mindestens zwei Eintraege", A.GEWICHT_TREND_MIN === 2);
pruefe("die Schwelle liegt ueber der Tagesschwankung", A.GEWICHT_TREND_ANTEIL >= 0.02);

/* ---------- 8) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v177",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 177);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.177", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
