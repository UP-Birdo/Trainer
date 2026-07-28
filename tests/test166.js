/* v166-Test: Tageswerte (Schlaf, Befinden) — von Hand eingetragen, mit Datum.

   Gebaut wie die Koerpermasse, aber als REGISTER: ein weiterer Wert soll eine
   Zeile in TAGESWERTE kosten. Der Test laeuft deshalb ueber das echte Register
   und prueft jeden Eintrag gegen denselben Vertrag — ein spaeter dazukommender
   Wert (Ruhepuls …) wird hier automatisch mitgeprueft.
   Kern sind die reinen Funktionen: werteReihe, werteSetzen, tageswertPruefen,
   tageswertSchnitt, tageswertText.
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
  const i = src.indexOf("const " + name + " = ");
  if(i < 0) throw new Error("Literal nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf("[", i); k < src.length; k++){
    if(src[k] === "[") tiefe++;
    else if(src[k] === "]"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabLiteral("TAGESWERTE"),
  grabFn("tageswertDef"),
  grabFn("werteReihe"),
  grabFn("werteSetzen"),
  grabFn("tageswertPruefen"),
  grabFn("tageswertText"),
  grabFn("tageswertSchnitt"),
  "module.exports = { TAGESWERTE, tageswertDef, werteReihe, werteSetzen," +
  " tageswertPruefen, tageswertText, tageswertSchnitt };"
].join("\n"))(modul, modul.exports);
const { TAGESWERTE, tageswertDef, werteReihe, werteSetzen,
        tageswertPruefen, tageswertText, tageswertSchnitt } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Das Register ---------- */
pruefe("Schlaf und Befinden sind da",
  TAGESWERTE.some(w => w.id === "schlaf") && TAGESWERTE.some(w => w.id === "befinden"));
pruefe("keine doppelten Kennungen",
  new Set(TAGESWERTE.map(w => w.id)).size === TAGESWERTE.length);
TAGESWERTE.forEach(w => {
  pruefe(w.id + ": Name und Hinweis sind da",
    typeof w.name === "string" && w.name.length > 0 &&
    typeof w.hinweis === "string" && w.hinweis.length > 0);
  pruefe(w.id + ": der Bereich ist sinnvoll",
    typeof w.min === "number" && typeof w.max === "number" && w.max > w.min);
  pruefe(w.id + ": die Schrittweite passt in den Bereich",
    w.schritt > 0 && w.schritt <= (w.max - w.min));
  pruefe(w.id + ": Nachkommastellen sind festgelegt",
    w.nachkomma === 0 || w.nachkomma > 0);
});
pruefe("Schlaf zaehlt in Stunden", tageswertDef("schlaf").einheit === "h");
pruefe("Befinden hat keine Einheit", tageswertDef("befinden").einheit === "");
pruefe("Befinden geht von 1 bis 5",
  tageswertDef("befinden").min === 1 && tageswertDef("befinden").max === 5);
pruefe("eine unbekannte Art faellt auf den ersten Wert zurueck",
  tageswertDef("gibtsnicht").id === TAGESWERTE[0].id);

/* ---------- 2) werteReihe — nur die eigene Art, chronologisch ---------- */
const liste = [
  { datum:"2026-03-02", art:"schlaf",   wert:7 },
  { datum:"2026-03-01", art:"schlaf",   wert:6.5 },
  { datum:"2026-03-01", art:"befinden", wert:3 },
  { datum:"2026-03-03", art:"schlaf",   wert:8 }
];
const werte = r => r.map(e => e.wert).join(",");
pruefe("nur die gewaehlte Art", werte(werteReihe(liste, "schlaf")) === "6.5,7,8");
pruefe("chronologisch sortiert", werteReihe(liste, "schlaf")[0].datum === "2026-03-01");
pruefe("die andere Art bleibt getrennt", werte(werteReihe(liste, "befinden")) === "3");
pruefe("unbekannte Art -> leer", werteReihe(liste, "gibtsnicht").length === 0);
pruefe("leere/fehlende Liste -> leer",
  werteReihe([], "schlaf").length === 0 && werteReihe(null, "schlaf").length === 0);
pruefe("kaputte Eintraege werfen nicht", werteReihe([null, { art:"schlaf", datum:"2026-01-01", wert:5 }], "schlaf").length === 1);
pruefe("rein: die Eingabe bleibt unsortiert liegen", liste[0].datum === "2026-03-02");

/* ---------- 3) werteSetzen — ein Wert je Tag UND Art ---------- */
let l = [];
werteSetzen(l, "2026-03-01", "schlaf", 7);
werteSetzen(l, "2026-03-01", "befinden", 4);
pruefe("verschiedene Arten am selben Tag stehen nebeneinander", l.length === 2);
werteSetzen(l, "2026-03-01", "schlaf", 8);
pruefe("derselbe Tag und dieselbe Art korrigiert, statt zu verdoppeln", l.length === 2);
pruefe("und zwar den richtigen Eintrag",
  l.find(e => e.art === "schlaf").wert === 8 && l.find(e => e.art === "befinden").wert === 4);
werteSetzen(l, "2026-02-01", "schlaf", 6);
pruefe("nachgetragene Tage landen an der richtigen Stelle", l[0].datum === "2026-02-01");
pruefe("werteSetzen gibt die Liste zurueck", werteSetzen(l, "2026-04-01", "schlaf", 7) === l);

/* ---------- 4) tageswertPruefen — Bereich und Schrittweite ---------- */
const schlaf = tageswertDef("schlaf"), befinden = tageswertDef("befinden");
pruefe("normale Eingabe bleibt", tageswertPruefen(schlaf, "7.5") === 7.5);
pruefe("Komma statt Punkt geht auch", tageswertPruefen(schlaf, "7,5") === 7.5);
pruefe("auf die halbe Stunde gerundet", tageswertPruefen(schlaf, "7.3") === 7.5);
pruefe("und nach unten genauso", tageswertPruefen(schlaf, "7.1") === 7);
pruefe("ein Vertipper wird begrenzt statt gespeichert", tageswertPruefen(schlaf, "25") === 24);
pruefe("negatives ebenso", tageswertPruefen(schlaf, "-3") === 0);
pruefe("Befinden rundet auf ganze Zahlen", tageswertPruefen(befinden, "3.4") === 3);
pruefe("Befinden bleibt zwischen 1 und 5",
  tageswertPruefen(befinden, "9") === 5 && tageswertPruefen(befinden, "0") === 1);
pruefe("keine Fliesskomma-Reste", String(tageswertPruefen(schlaf, "0.3")).length <= 3);
pruefe("Text ist kein Wert",
  tageswertPruefen(schlaf, "gut") === null && tageswertPruefen(schlaf, "") === null &&
  tageswertPruefen(schlaf, null) === null);
pruefe("die Null ist ein gueltiger Wert, kein Fehler", tageswertPruefen(schlaf, "0") === 0);

/* ---------- 5) Anzeige-Text ---------- */
pruefe("Schlaf mit Einheit und einer Nachkommastelle", tageswertText(schlaf, 7.5) === "7.5 h");
pruefe("Befinden ohne Einheit und ohne Nachkomma", tageswertText(befinden, 4) === "4");

/* ---------- 6) Schnitt der letzten Tage ---------- */
const reihe = [4,5,6,7,8,9,10,11].map((w,i) => ({ datum:"2026-03-0" + (i+1), art:"schlaf", wert:w }));
pruefe("der Schnitt nimmt die LETZTEN sieben", tageswertSchnitt(reihe, 7) === 8);
pruefe("weniger Eintraege als gefragt ist erlaubt",
  tageswertSchnitt(reihe.slice(0, 2), 7) === 4.5);
pruefe("ohne Eintraege gibt es keinen Schnitt",
  tageswertSchnitt([], 7) === null && tageswertSchnitt(null, 7) === null);
pruefe("ohne Angabe sind es sieben Tage", tageswertSchnitt(reihe) === tageswertSchnitt(reihe, 7));
pruefe("ein einzelner Eintrag ist sein eigener Schnitt",
  tageswertSchnitt([{ wert:6 }], 7) === 6);

/* ---------- 7) Verdrahtung in der App ---------- */
pruefe("das Datenfeld wird nachgeruestet",
  grabFn("datenNachruesten").includes("daten.tageswerte = []"));
pruefe("die Kachel steht in der Statistik-Auswahl",
  src.includes('["tageswert",      "Tageswerte",          "stat-tageswert"]'));
pruefe("sie ist immer waehlbar (manuell befuellt)",
  grabFn("statHatDaten").includes('if(id === "tageswert")      return true;'));
pruefe("und wird nicht durch eine Datenpruefung versteckt",
  grabFn("statistikSichtbarkeit").includes("stat-tageswert"));
pruefe("die Statistik zeichnet sie mit",
  grabFn("statistikOeffnen").includes("tageswertZeichnen()"));
pruefe("die Detail-Ansicht ist ab Stufe 4 erlaubt (wie die Koerpermasse)",
  src.includes('"view-tageswert": 4'));
pruefe("die Detail-Ansicht existiert im HTML", src.includes('<section id="view-tageswert"'));
pruefe("und laesst sich wegwischen (v164)",
  src.slice(src.indexOf('<section id="view-tageswert"'),
            src.indexOf("</section>", src.indexOf('<section id="view-tageswert"'))).includes("data-zurueck"));
pruefe("das Mehrfach-Loeschen aus v163 gilt auch hier",
  src.includes('ansicht:  "view-tageswert", ziel: "tageswert-liste"'));
pruefe("die Liste nutzt Kopf und Zeilen-Umschlag",
  grabFn("tageswertZeichnen").includes('listenKopfHtml("tageswert")') &&
  grabFn("tageswertZeichnen").includes('listenZeileHtml("tageswert"'));
pruefe("ein Art-Wechsel beendet den Auswahl-Modus",
  grabFn("tageswertArtSetzen").includes("listenAuswahl.clear()"));
pruefe("Eintragen laeuft ueber die Pruefung",
  grabFn("tageswertEintragen").includes("tageswertPruefen(def"));
pruefe("und speichert ueber werteSetzen",
  grabFn("tageswertEintragen").includes("werteSetzen(sitzung.daten.tageswerte"));
pruefe("es gibt eigene Dialoge statt confirm",
  grabFn("tageswertLoeschen").includes("frage(") && !grabFn("tageswertLoeschen").includes("confirm("));

/* ---------- 8) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v166",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 166);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.166", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
