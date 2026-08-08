/* 0.239.0-Test: sechs Korrekturen aus der Tiefenpruefung.

   1. auslastungStufe urteilt ueber die QUOTE zuerst — ein Muskel mit
      Beschwerde-Boden (saetze 0, quote 1,3) ist "zuviel", nicht "ruhig".
   2. Der fiktive Vorschau-Eintrag (vorschau:true) zaehlt nur als LAST:
      maxGewichtJeUebung, beschwerdeVorlaeufer und die Kapazitaets-Seite von
      muskelAuslastung ignorieren ihn.
   3. beschwerdeVorlaeufer zaehlt auch SEKUNDAER belastete Muskeln.
   4. trainingLosgehts traegt den Doppeltipp-Schutz.
   5. gewichtAendern liest lauf.schritte (lauf.ablauf gab es nie).
   6. Haltezeit: zeitGehalten sammelt Etappen ueber Anhalten/Weiter und
      ±Zeit; ein auf 0 gekuerzter Zeit-Satz wird protokolliert.
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
  grabFn("auslastungStufe"),
  grabFn("echteSaetze"),
  grabFn("maxGewichtJeUebung"),
  grabFn("planAlsEintrag"),
  "module.exports = { auslastungStufe, maxGewichtJeUebung, planAlsEintrag };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Stufe folgt der Quote, nicht nur den Saetzen ---------- */
pruefe("Beschwerde-Boden ohne Last ist zuviel, nicht ruhig",
  T.auslastungStufe({ saetze:0, kapazitaet:18, quote:1.3 }) === "zuviel");
pruefe("ohne Saetze und ohne Quote weiter ruhig",
  T.auslastungStufe({ saetze:0, kapazitaet:18, quote:0 }) === "ruhig");
pruefe("null bleibt ruhig", T.auslastungStufe(null) === "ruhig");
pruefe("die alten Stufen stehen unveraendert",
  T.auslastungStufe({ saetze:18, kapazitaet:18, quote:1 }) === "hoch" &&
  T.auslastungStufe({ saetze:8, kapazitaet:18, quote:8/18 }) === "gut");

/* ---------- 2) Der fiktive Eintrag ist kein Messwert ---------- */
{
  const e = T.planAlsEintrag({ typ:"kraft", uebungen:[{ name:"Kniebeugen", saetze:2, wdh:10, gewicht:80 }] }, "2026-08-09");
  pruefe("planAlsEintrag markiert sich als Vorschau", e.vorschau === true);
  pruefe("ein Vorschau-Gewicht stiftet keinen Bestwert",
    T.maxGewichtJeUebung([e, { datum:"2026-08-01", saetze:[{ name:"Kniebeugen", gewicht:75 }] }])["Kniebeugen"] === 75);
}
pruefe("beschwerdeVorlaeufer ueberspringt Vorschau-Eintraege",
  grabFn("beschwerdeVorlaeufer").includes("t.vorschau"));
pruefe("beschwerdeVorlaeufer kennt Sekundaer-Muskeln",
  grabFn("beschwerdeVorlaeufer").includes("info.sekundaer") &&
  grabFn("beschwerdeVorlaeufer").includes("muskelnAufKarte(satz.s)"));
{
  const a = grabFn("muskelAuslastung");
  pruefe("die Kapazitaets-Seite rechnet mit dem echten Protokoll",
    a.includes("filter(e => e && !e.vorschau)") &&
    a.includes("erfahrungsFaktor(einrichtung, echt, heute)") &&
    a.includes("beschwerdeVorlaeufer(echt, beschwerden, heute)") &&
    a.includes("muskelLast(echt, tageVerschieben(heute, -7 * w), 6)"));
  pruefe("die LAST rechnet weiter mit dem vollen Protokoll (Vorschau zaehlt dort)",
    a.includes("muskelLast(protokoll, heute, MUSKEL_HEAT_TAGE)"));
}

/* ---------- 3) Trainings-Fixes ---------- */
pruefe("Los geht's traegt den Doppeltipp-Schutz",
  grabFn("trainingLosgehts").includes("tippGesperrt()"));
pruefe("gewichtAendern liest lauf.schritte",
  grabFn("gewichtAendern").includes("lauf.schritte[lauf.index]") &&
  !src.includes("lauf.ablauf["));   // der Kommentar darf den alten Namen nennen
pruefe("schrittBetreten setzt die Etappen-Summe zurueck",
  grabFn("schrittBetreten").includes("lauf.zeitGehalten = 0"));
pruefe("Anhalten haelt die gelaufene Etappe fest",
  grabFn("pauseKnopf").includes("lauf.zeitGehalten = (lauf.zeitGehalten || 0) + Math.max(0, lauf.dauer - lauf.restBeiPause)"));
pruefe("Plus/Minus-Zeit haelt die gelaufene Etappe fest",
  grabFn("zeitAendern").includes("lauf.zeitGehalten = (lauf.zeitGehalten || 0) + Math.max(0, lauf.dauer - restVorher)"));
pruefe("ein auf 0 gekuerzter Zeit-Satz wird protokolliert",
  grabFn("zeitAendern").includes('if(s.typ === "satz-zeit")') &&
  grabFn("zeitAendern").includes("satzProtokollieren(s, begrenzen(Math.round(lauf.zeitGehalten), 0, s.sekunden))"));
pruefe("die Ist-Haltezeit summiert Etappen + laufende Zeit",
  grabFn("hauptKnopf").includes("(lauf.zeitGehalten || 0) + etappe"));

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.239.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 239000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.239.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
