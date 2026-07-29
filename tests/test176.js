/* v176-Test: Wochen ohne Entlastung (Belastungs-Modell, Gruppe A, Punkt 4).

   Die Roadmap sagt fuer Gruppe A: „schon in den Daten, noch nicht genutzt —
   zuerst bauen". Punkt 4: Dauerbelastung ohne leichtere Woche. Die App kannte
   den Rhythmus laengst (ENTLASTUNG_NACH/ENTLASTUNG_ANTEIL auf der
   Ausdauer-Seite), die Muskelkarte aber nicht.

   Geprueft wird:
   1. Die Zaehlung selbst — was als Entlastung gilt und was nicht.
   2. Dass die LAUFENDE Woche nie mitzaehlt (sie ist noch nicht vorbei).
   3. Dass es eine EIGENE Aussage bleibt: Die Auslastungs-Rechnung darf davon
      NICHTS wissen (dieselbe Trennung wie v161 Leistungsabfall und v168
      Muskelkater).
   4. Dass die Haus-Zahlen WIEDERVERWENDET und nicht neu erfunden werden.
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

const modul = { exports: {} };
new Function("module", "exports", [
  grabConst("ENTLASTUNG_NACH"),
  grabConst("ENTLASTUNG_ANTEIL"),
  grabConst("ENTLASTUNG_BLICK"),
  grabFn("isoWoche"),
  grabFn("tageVerschieben"),
  grabFn("wochenLast"),
  grabFn("wochenOhneEntlastung"),
  grabFn("entlastungText"),
  "module.exports = { wochenLast, wochenOhneEntlastung, entlastungText, isoWoche," +
  " ENTLASTUNG_NACH, ENTLASTUNG_ANTEIL, ENTLASTUNG_BLICK };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* Mittwoch — bewusst mitten in der Woche, damit die laufende Woche wirklich
   „noch nicht vorbei" ist. */
const HEUTE = "2026-07-29";
/** Ein Eintrag mit n Saetzen, `wochen` abgeschlossene Wochen vor heute. */
function eintrag(wochen, n){
  const d = new Date(HEUTE + "T12:00:00");
  d.setDate(d.getDate() - 7 * wochen);
  return { datum: d.toISOString().slice(0, 10), saetze: Array.from({ length:n }, (_, i) => ({ satz:i + 1 })) };
}
/** Protokoll aus einer Liste [Saetze der letzten abgeschlossenen Woche, der davor, …]. */
function protokollAus(wochenSaetze){
  return wochenSaetze.map((n, i) => n > 0 ? eintrag(i + 1, n) : null).filter(Boolean);
}

/* ---------- 1) Saetze je Woche ---------- */
const p1 = protokollAus([20, 20]);
const last = A.wochenLast(p1);
pruefe("die Saetze werden je Woche summiert",
  Object.keys(last).length === 2 && Object.values(last).every(v => v === 20));
pruefe("zwei Einheiten derselben Woche addieren sich",
  Object.values(A.wochenLast([eintrag(1, 5), eintrag(1, 7)]))[0] === 12);
pruefe("ein Eintrag ohne Saetze zaehlt null",
  Object.values(A.wochenLast([{ datum:HEUTE }]))[0] === 0);
pruefe("kaputte Eintraege werfen nicht",
  Object.keys(A.wochenLast([null, {}, { datum:null }])).length === 0);
pruefe("leeres Protokoll ergibt nichts",
  Object.keys(A.wochenLast([])).length === 0 && Object.keys(A.wochenLast(null)).length === 0);

/* ---------- 2) Die Zaehlung ---------- */
pruefe("ohne Training gibt es keine Folge",
  A.wochenOhneEntlastung([], HEUTE) === 0);
pruefe("drei gleich schwere Wochen ergeben drei",
  A.wochenOhneEntlastung(protokollAus([20, 20, 20]), HEUTE) === 3);
pruefe("steigende Wochen zaehlen genauso",
  A.wochenOhneEntlastung(protokollAus([30, 25, 20]), HEUTE) === 3);
pruefe("eine Pausenwoche beendet die Folge",
  A.wochenOhneEntlastung(protokollAus([20, 20, 0, 20, 20]), HEUTE) === 2);
pruefe("eine deutlich leichtere Woche beendet sie auch",
  A.wochenOhneEntlastung(protokollAus([20, 20, 12, 20]), HEUTE) === 2);
pruefe("eine nur leicht leichtere Woche beendet sie NICHT",
  A.wochenOhneEntlastung(protokollAus([20, 20, 18, 20]), HEUTE) === 4);
pruefe("genau an der Schwelle gilt sie als Entlastung",
  A.wochenOhneEntlastung(protokollAus([20, 20, 14, 20]), HEUTE) === 2);
pruefe("war die LETZTE abgeschlossene Woche die Entlastung, ist die Folge null",
  A.wochenOhneEntlastung(protokollAus([10, 20, 20, 20]), HEUTE) === 0);
pruefe("die erste Woche nach einer Pause zaehlt als erste",
  A.wochenOhneEntlastung(protokollAus([20, 0, 20, 20]), HEUTE) === 1);
pruefe("weiter zurueck als das Blickfeld wird nicht gezaehlt",
  A.wochenOhneEntlastung(protokollAus(Array(20).fill(20)), HEUTE) === A.ENTLASTUNG_BLICK);

/* ---------- 3) Die laufende Woche zaehlt NIE mit ---------- */
const mitHeute = protokollAus([20, 20, 20]).concat([{ datum:HEUTE, saetze:[{satz:1}] }]);
pruefe("ein Training von heute aendert die Folge nicht",
  A.wochenOhneEntlastung(mitHeute, HEUTE) === 3);
pruefe("auch eine sehr leichte laufende Woche wird nicht als Entlastung gewertet",
  A.wochenOhneEntlastung(protokollAus([20, 20, 20]).concat([{ datum:HEUTE, saetze:[] }]), HEUTE) === 3);
pruefe("und eine sehr schwere laufende Woche verlaengert sie nicht",
  A.wochenOhneEntlastung(protokollAus([20]).concat([{ datum:HEUTE, saetze:Array(50).fill({satz:1}) }]), HEUTE) === 1);

/* ---------- 4) Der Satz ---------- */
pruefe("unter der Schwelle wird nichts gesagt",
  A.entlastungText(A.ENTLASTUNG_NACH - 1) === "");
pruefe("bei null erst recht nicht", A.entlastungText(0) === "");
pruefe("ab der Schwelle steht der Satz da",
  A.entlastungText(A.ENTLASTUNG_NACH).length > 20);
pruefe("er nennt die Zahl der Wochen",
  A.entlastungText(5).indexOf("5 Wochen") === 0);
pruefe("er nennt den Anteil der Entlastungswoche",
  A.entlastungText(3).indexOf(String(Math.round(A.ENTLASTUNG_ANTEIL * 100)) + " %") > 0);
pruefe("er ist eine Empfehlung, keine Warnung",
  !/Warnung|gefährlich|Überlastung|zu viel/i.test(A.entlastungText(4)));

/* ---------- 5) Die Haus-Zahlen werden WIEDERVERWENDET ---------- */
pruefe("der Rhythmus kommt aus ENTLASTUNG_NACH", A.ENTLASTUNG_NACH === 3);
pruefe("der Anteil aus ENTLASTUNG_ANTEIL", A.ENTLASTUNG_ANTEIL === 0.70);
pruefe("die Zaehlung benutzt beide, statt eigene Zahlen zu erfinden",
  /ENTLASTUNG_ANTEIL/.test(grabFn("wochenOhneEntlastung")) &&
  /ENTLASTUNG_NACH/.test(grabFn("entlastungText")));
pruefe("es gibt sie im Quelltext genau einmal",
  (src.match(/^const ENTLASTUNG_NACH\s*=/gm) || []).length === 1 &&
  (src.match(/^const ENTLASTUNG_ANTEIL\s*=/gm) || []).length === 1);

/* ---------- 6) EIGENE Aussage — die Quote bleibt unberuehrt ---------- */
/* Dieselbe Trennung wie v161 (Leistungsabfall) und v168 (Muskelkater): Die
   Rechnung darf davon nichts wissen, sonst waeren zwei Aussagen zu einer
   verruehrt und keine mehr scharf. */
["muskelLast", "muskelKapazitaet", "kapazitaetsFaktor", "muskelAuslastung", "auslastungStufe"]
  .forEach(fn => pruefe(fn + " kennt die Entlastungs-Rechnung nicht",
    !/wochenOhneEntlastung|entlastungText|wochenLast/.test(grabFn(fn))));
pruefe("und auslastungText auch nicht",
  !/wochenOhneEntlastung|entlastungText/.test(grabFn("auslastungText")));

/* ---------- 7) Verdrahtung ----------
   v177 hat die eigene Zeilen-Funktion durch das Register BELASTUNGS_HINWEISE
   ersetzt — sonst kaeme mit jeder neuen eigenen Aussage ein weiterer Aufruf an
   beiden Stellen dazu. Die v176-Zusage bleibt: Der Satz steht auf der
   Muskelkarte, mit und ohne gewaehlten Muskel, in der Signalfarbe. */
const zeile = grabFn("belastungsHinweiseHtml");
pruefe("das Register liefert die Zeilen", /BELASTUNGS_HINWEISE/.test(zeile));
pruefe("der Entlastungs-Hinweis steht darin",
  /entlastungText\(wochenOhneEntlastung\(sitzung\.daten\.protokoll/.test(src));
pruefe("ohne Satz erscheint gar keine Zeile", /\.filter\(Boolean\)/.test(zeile));
pruefe("die Zeilen tragen die Signalfarbe, nicht das Warnrot",
  /var\(--signal\)/.test(zeile) && !/var\(--warn\)/.test(zeile));
const status = grabFn("muskelStatusText");
pruefe("sie stehen MIT gewaehltem Muskel da und ohne",
  (status.match(/belastungsHinweiseHtml\(\)/g) || []).length === 2);
pruefe("die Grundlagen-Zeile aus v167 bleibt daneben stehen",
  (status.match(/grundlagenZeileHtml\(\)/g) || []).length === 2);
pruefe("die Muskelkarte bleibt ab Stufe 4 (Leitplanke 8)",
  /"view-muskeln": 4/.test(src));

/* ---------- 8) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v176",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 176);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.176", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
