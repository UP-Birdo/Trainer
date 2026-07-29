/* v183-Test: Die Bibliothek kennt auch die Sportart-Drills.

   Gefunden beim Durchspielen einer reinen Ausdauer-Sportlerin (die einzige
   Persona, die bisher kein Durchgang beruehrt hatte): Die Karte unter Mehr →
   Werkzeuge verspricht „Alle Uebungen zum Nachschlagen" — zeigte aber nur
   `UEBUNGEN_DB`, also ausschliesslich Kraftuebungen. Wer nur laeuft, fand dort
   keine einzige seiner 34 Drills, obwohl jeder seit v145/v151 einen Kurz-Tipp
   UND eine Beschreibung hat.

   Geprueft wird:
   1. Die Drills der EIGENEN Sportarten sind drin — fremde nicht.
   2. Ohne Krafttraining stehen dort auch keine Kraftuebungen (und keine
      Kraft-Filter, die auf nichts zeigen).
   3. Der Filter versteht beide Welten.
   4. Die Karte stellt einen Drill richtig dar (keine „null"-Kategorie).
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
  grabLiteral("SPORTARTEN"),
  grabLiteral("UEBUNGEN_DB"),
  grabLiteral("BIB_KATS"),
  grabLiteral("SPORT_UEBUNGEN", "{"),
  "const sitzung = { daten: { eigeneUebungen: {} } };",
  grabFn("sportart"),
  grabFn("sportartName"),
  grabFn("sportUebungen"),
  grabFn("normName"),
  grabFn("bibKandidaten"),
  grabFn("bibFilterListe"),
  grabFn("bibFilter"),
  "module.exports = { bibKandidaten, bibFilterListe, bibFilter, UEBUNGEN_DB, BIB_KATS, sportUebungen };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const laeuferin = ["laufen"];
const gemischt  = ["kraft", "laufen"];
const nurKraft  = ["kraft"];

/* ---------- 1) Die eigenen Drills sind drin ---------- */
const fuerLaeuferin = A.bibKandidaten(laeuferin);
pruefe("die Laeuferin sieht ueberhaupt Uebungen", fuerLaeuferin.length > 0);
pruefe("und zwar genau ihre Lauf-Drills",
  fuerLaeuferin.length === A.sportUebungen("laufen").length);
pruefe("alle tragen ihre Sportart", fuerLaeuferin.every(u => u.sport === "laufen"));
pruefe("keine einzige Kraftuebung ist dabei",
  !fuerLaeuferin.some(u => A.UEBUNGEN_DB.some(k => k.name === u.name && u.sport === "kraft")));
pruefe("und keine fremde Sportart",
  !fuerLaeuferin.some(u => u.sport === "klettern" || u.sport === "yoga"));

/* ---------- 2) Kraft bleibt Kraft ---------- */
const fuerKraft = A.bibKandidaten(nurKraft);
pruefe("wer nur Kraft macht, sieht genau die Kraftuebungen",
  fuerKraft.length === A.UEBUNGEN_DB.length);
pruefe("sie behalten Kategorie und Geraet",
  fuerKraft.every(u => u.kat && u.sport === "kraft"));
const beides = A.bibKandidaten(gemischt);
pruefe("gemischt ergibt die Summe",
  beides.length === A.UEBUNGEN_DB.length + A.sportUebungen("laufen").length);
pruefe("ohne Sportarten steht nichts da",
  A.bibKandidaten([]).length === 0 && A.bibKandidaten(null).length === 0);
pruefe("keine Dubletten in den Namen einer Sportart",
  new Set(fuerLaeuferin.map(u => u.name)).size === fuerLaeuferin.length);

/* ---------- 3) Die Filter zeigen nie ins Leere ---------- */
const fL = A.bibFilterListe(laeuferin).map(([k]) => k);
pruefe("Alle steht immer vorn", fL[0] === "alle");
pruefe("ohne Kraft keine Kraft-Kategorien",
  !fL.some(k => ["beine","druck","zug","rumpf","cardio"].includes(k)));
pruefe("dafuer ein Filter fuer ihre Sportart", fL.includes("sport:laufen"));
const fK = A.bibFilterListe(nurKraft).map(([k]) => k);
pruefe("mit Kraft stehen die Kategorien da",
  ["beine","druck","zug","rumpf","cardio"].every(k => fK.includes(k)));
pruefe("aber kein Sportart-Filter fuer Kraft selbst", !fK.includes("sport:kraft"));
const fG = A.bibFilterListe(gemischt).map(([k]) => k);
pruefe("gemischt hat beides", fG.includes("beine") && fG.includes("sport:laufen"));
pruefe("jeder Filter traegt einen Namen",
  A.bibFilterListe(gemischt).every(([, n]) => typeof n === "string" && n.length > 0));
/* Kein Filter ohne Treffer: Jeder Knopf muss etwas anzeigen. */
A.bibFilterListe(gemischt).forEach(([k]) =>
  pruefe("der Filter " + k + " hat Treffer",
    A.bibFilter(beides, k, "").length > 0));

/* ---------- 4) Der Filter versteht beide Welten ---------- */
pruefe("Alle laesst alles durch", A.bibFilter(beides, "alle", "").length === beides.length);
pruefe("eine Kraft-Kategorie filtert Kraftuebungen",
  A.bibFilter(beides, "beine", "").every(u => u.kat === "beine"));
pruefe("und laesst Drills draussen",
  !A.bibFilter(beides, "beine", "").some(u => u.sport === "laufen"));
pruefe("ein Sportart-Filter zeigt nur deren Drills",
  A.bibFilter(beides, "sport:laufen", "").every(u => u.sport === "laufen"));
pruefe("und ist vollstaendig",
  A.bibFilter(beides, "sport:laufen", "").length === A.sportUebungen("laufen").length);
pruefe("die Suche greift ueber beide Welten",
  A.bibFilter(beides, "alle", A.sportUebungen("laufen")[0].name).length >= 1);
pruefe("Suche und Filter wirken zusammen",
  A.bibFilter(beides, "sport:laufen", "zzz-gibt-es-nicht").length === 0);

/* ---------- 5) Die Karte stellt einen Drill richtig dar ---------- */
const karte = grabFn("bibKarteHtml");
pruefe("die Karte unterscheidet Drill und Kraftuebung",
  /const istDrill = u\.sport && u\.sport !== "kraft";/.test(karte));
pruefe("ein Drill zeigt seine Art statt einer Kraft-Kategorie",
  /istDrill \? \(u\.art \|\| sportartName\(u\.sport\)\)/.test(karte));
pruefe("und seine Sportart statt eines Geraets",
  /istDrill \? sportartName\(u\.sport\)/.test(karte));
pruefe("keine null-Kategorie mehr in der Kopfzeile",
  /BIB_KAT_NAME\[u\.kat\] \|\| u\.kat \|\| ""/.test(karte));
pruefe("Tipp und Beschreibung kommen aus der gemeinsamen Quelle",
  /const tip = drillTipp\(u\.name\);/.test(karte) &&
  /const beschreibung = drillText\(u\.name\);/.test(karte));
pruefe("die Muskel-Figur bleibt (uebungMuskeln kennt Drills seit v140)",
  /const info = uebungMuskeln\(u\.name\)/.test(karte) && /miniFigurHtml\(info\)/.test(karte));

/* ---------- 6) Verdrahtung ---------- */
pruefe("die Liste kommt aus den Kandidaten, nicht mehr aus UEBUNGEN_DB",
  /bibFilter\(bibKandidaten\(sitzung\.daten\.einrichtung\.sportarten\)/.test(grabFn("bibKartenZeichnen")));
pruefe("die Filter-Zeile kommt aus der Liste",
  /bibFilterListe\(sitzung\.daten\.einrichtung\.sportarten\)/.test(grabFn("bibFilterZeichnen")));
pruefe("ein Filter, den es nicht mehr gibt, faellt auf Alle zurueck",
  /if\(!erlaubt\.includes\(bibZustand\.kat\)\) bibZustand\.kat = "alle";/.test(grabFn("bibliothekOeffnen")));
pruefe("die Beschreibung der Karte verspricht nicht mehr nur Geraete",
  src.indexOf("Alle Übungen zum Nachschlagen: Gerät") < 0);

/* ---------- 7) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v183",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 183);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.183", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
