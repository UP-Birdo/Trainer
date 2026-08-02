/* v195-Test: Muskelkarte — erst der eigene Koerper, dann das Nachschlagen
   (zwei Nutzer-Ansagen aus der 50. Runde).

   Die Zusagen:
   1. Beim Oeffnen steht „Dein Koerper" (Heatmap + Auslastung), nicht mehr
      „Erkunden". Default und Markup-Klasse gehoeren zusammen.
   2. Der Erkunden-Tab bleibt — er zeigt jetzt die ECHTEN Top-Uebungen aus der
      Muskel-Zuordnung (`UEBUNG_MUSKELN`/`SPORT_MUSKELN`) statt der
      handgepflegten Kurzliste `MUSKEL_INFO.ex`. Reihenfolge: primaer vor
      sekundaer, spezifisch vor breit, dann alphabetisch.
   3. Gefiltert wird nach eigenen Geraeten und Sportarten; findet sich damit
      nichts, wird ohne Filter gesucht UND das gesagt.
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
function grabBlock(name, open, close){
  const i = src.indexOf("const " + name + " = " + open);
  if(i < 0) throw new Error("Block nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf(open, i); k < src.length; k++){
    if(src[k] === open) tiefe++;
    else if(src[k] === close){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

/* Die ECHTEN Register werden extrahiert — die Reihenfolge-Regel wird also an den
   wirklichen 147 Zuordnungen geprueft, nicht an erfundenen Beispielen. */
const modul = { exports: {} };
new Function("module", "exports", [
  grabBlock("UEBUNGEN_DB", "[", "]"),
  grabBlock("UEBUNG_MUSKELN", "{", "}"),
  grabBlock("SPORT_MUSKELN", "{", "}"),
  /* Die Alias-Schicht (v139) wird nicht mitgeschleppt: Fuer diesen Test zaehlt
     die Reihenfolge-Regel, nicht die Karten-Uebersetzung. `muskelnAufKarte`
     wird deshalb durch die Identitaet ersetzt — die Schluessel sind dieselben,
     solange die Standard-Karte aktiv ist (MUSKELKARTE_AKTIV = "standard"). */
  "function muskelnAufKarte(keys){ return (keys || []).slice(); }",
  grabFn("uebungMuskelSatz"),
  "const SPORTARTEN = [{ id:'kraft', name:'Krafttraining' }, { id:'laufen', name:'Laufen' }," +
  " { id:'yoga', name:'Yoga' }, { id:'klettern', name:'Klettern' }];",
  "const SPORT_UEBUNGEN = { laufen:[], yoga:[], klettern:[] };",
  "function sportUebungen(id){ return SPORT_UEBUNGEN[id] || []; }",
  grabFn("normName"), grabFn("sportartFuerUebung"), grabFn("sportartZuDrill"),
  grabFn("muskelUebungsQuellen"),
  "const TOP_UEBUNGEN_MAX = " + (/const TOP_UEBUNGEN_MAX = (\d+);/.exec(src) || [])[1] + ";",
  grabFn("topUebungenFuer"),
  "module.exports = { topUebungenFuer, muskelUebungsQuellen, TOP_UEBUNGEN_MAX," +
  " UEBUNG_MUSKELN, UEBUNGEN_DB, setDrills: d => { Object.keys(d).forEach(k => SPORT_UEBUNGEN[k] = d[k]); } };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* Die Annahme des Aufbaus oben: Solange die Standard-Karte aktiv ist, sind
   Karten-Schluessel und Muskel-Schluessel identisch. Schlaegt das um, muss der
   Test die Alias-Schicht mitnehmen — deshalb steht die Bedingung hier. */
pruefe("die Standard-Muskelkarte ist aktiv (Annahme dieses Tests)",
  src.includes('const MUSKELKARTE_AKTIV = "standard";'));

/* ---------- 1) Der Einstieg zeigt den eigenen Koerper ---------- */
pruefe("der Default-Modus ist trainiert",
  /let muskelStatus = \{[^}]*modus:"trainiert"/.test(src));
pruefe("und die Markup-Klasse sitzt am selben Tab",
  /id="muskel-modus-heat" class="muskel-tab muskel-an"/.test(src));
pruefe("der Erkunden-Tab traegt sie NICHT mehr",
  /id="muskel-modus-info" class="muskel-tab"[^-]/.test(src));
pruefe("der Heat-Tab steht im Markup vorne",
  src.indexOf('id="muskel-modus-heat"') < src.indexOf('id="muskel-modus-info"'));
pruefe("der Erkunden-Tab ist geblieben", src.includes("muskelModus('erkunden')"));
pruefe("der Tab heisst Dein Koerper", src.includes(">Dein Körper</button>"));

/* ---------- 2) Die Quellen: beide Register, EINE Form ---------- */
const quellen = A.muskelUebungsQuellen();
pruefe("es gibt Quellen", quellen.length > 100);
pruefe("jede hat Name und Muskel-Satz",
  quellen.every(u => u.name && u.satz && Array.isArray(u.satz.p) && Array.isArray(u.satz.s)));
pruefe("Kraftuebungen tragen ihre Sportart",
  quellen.some(u => u.sport === "kraft"));
pruefe("und Drills sind als Nicht-Kraft erkennbar",
  quellen.some(u => u.sport !== "kraft"));
pruefe("kein Muskel ist primaer UND sekundaer (uebungMuskelSatz)",
  quellen.every(u => u.satz.p.every(m => u.satz.s.indexOf(m) < 0)));

/* ---------- 3) Die Reihenfolge-Regel ---------- */
const brust = A.topUebungenFuer("pectoral", null, null, 20);
pruefe("fuer die Brust gibt es Treffer", brust.length > 0);
pruefe("primaer steht immer vor sekundaer",
  brust.every((u, i) => i === 0 || !(u.primaer && !brust[i-1].primaer)));
const primaer = brust.filter(u => u.primaer);
pruefe("innerhalb primaer: spezifisch vor breit",
  primaer.every((u, i) => i === 0 || primaer[i-1].breite <= u.breite));
pruefe("bei gleicher Breite alphabetisch",
  primaer.every((u, i) => i === 0 ||
    primaer[i-1].breite < u.breite || primaer[i-1].name.localeCompare(u.name, "de") <= 0));
pruefe("zweimal aufgerufen kommt dasselbe heraus",
  JSON.stringify(A.topUebungenFuer("pectoral", null, null, 20)) === JSON.stringify(brust));
pruefe("die Obergrenze wird eingehalten",
  A.topUebungenFuer("pectoral", null, null).length <= A.TOP_UEBUNGEN_MAX);
pruefe("ein unbekannter Muskel liefert nichts",
  A.topUebungenFuer("gibtesnicht", null, null).length === 0);
pruefe("ohne Muskel faellt nichts um",
  A.topUebungenFuer(null, null, null).length === 0 && A.topUebungenFuer("", null, null).length === 0);

/* ---------- 4) Die Filter ---------- */
const nurKoerper = A.topUebungenFuer("pectoral", ["keine"], ["kraft"], 20);
pruefe("mit Koerpergewicht bleibt etwas uebrig", nurKoerper.length > 0);
pruefe("und keine Hantel-Uebung ist dabei", nurKoerper.every(u => {
  const db = A.UEBUNGEN_DB.find(x => x.name === u.name);
  return !db || db.geraet === "keine";
}));
pruefe("mehr Geraete heisst nie weniger Treffer",
  A.topUebungenFuer("pectoral", ["keine","langhantel","kurzhantel"], ["kraft"], 20).length >= nurKoerper.length);
/* Drills zaehlen nur, wenn man die Sportart auch betreibt. */
A.setDrills({ laufen: [{ name:"Steigerungsläufe" }, { name:"Bergsprints" }] });
const beineMitLaufen = A.topUebungenFuer("quadriceps", ["keine"], ["kraft","laufen"], 30);
const beineOhneLaufen = A.topUebungenFuer("quadriceps", ["keine"], ["kraft"], 30);
pruefe("ein Lauf-Drill taucht nur mit Laufen im Profil auf",
  beineMitLaufen.some(u => u.name === "Steigerungsläufe") &&
  !beineOhneLaufen.some(u => u.name === "Steigerungsläufe"));
pruefe("ohne Sportart-Filter sind Drills grundsaetzlich erlaubt",
  A.topUebungenFuer("quadriceps", null, null, 40).length >= beineOhneLaufen.length);

/* ---------- 5) Verdrahtung in der Ansicht ---------- */
const auswahl = grabFn("muskelAuswahlZeichnen");
pruefe("der Erkunden-Modus nutzt die neue Quelle", auswahl.includes("topUebungenFuer(key"));
pruefe("und nicht mehr die handgepflegte Kurzliste", !auswahl.includes("m.ex.map"));
pruefe("er filtert nach eigenen Geraeten und Sportarten",
  auswahl.includes('meineGeraete("kraft")') && auswahl.includes("einrichtung.sportarten"));
pruefe("ohne Treffer wird ohne Filter erneut gesucht",
  auswahl.includes("topUebungenFuer(key, null, null)"));
pruefe("und der Grund steht dann da", auswahl.includes("Keine davon passt zu deinen Geräten"));
pruefe("ganz ohne Zuordnung bleibt die Karte ehrlich",
  auswahl.includes("noch keine Übung hinterlegt"));
pruefe("Uebungen mit Text sind antippbar (v169-Muster)",
  auswahl.includes("uebungErklaerbar(u.name)") && auswahl.includes("uebungErklaerungZeigen("));
pruefe("die alte ex-Liste bleibt als Daten stehen (additiv)", src.includes("ex:[\"Shrugs\""));

/* ---------- 6) Version ---------- */
pruefe("APP_VERSION steht genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("und ist mindestens 195",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 195);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
