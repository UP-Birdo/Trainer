/* 0.250.0-Test: Erledigt zaehlt, die Schwierigkeit wiegt, das Wachstum liest
   alles gewichtet.

   Die Zusagen:
   1. ERLEDIGT ZAEHLT IN DIE LAST (Nutzer-Entscheidung): `lastSaetze` nimmt
      auch Soll-Saetze, beide Last-Rechnungen nutzen sie. Die v158-Linie gilt
      daneben weiter: Bestwerte/Rekorde/Noten lesen ueber `echteSaetze` —
      geplant ist nicht gemessen, aber es ist Arbeit. Die Dauer des
      Erledigt-Eintrags kommt aus `dauerSchaetzen` (letzte echte Werte des
      Plans + Richtwert je Wdh) — stand schon, wird hier festgenagelt.
   2. DIE SCHWIERIGKEIT WIEGT MIT (`messwertFaktor`): nur Sportarten mit
      `mass.intensiv` (Klettern ja, Yogas Beweglichkeit bewusst nein),
      relativ zum EIGENEN Schnitt (ab drei Einheiten), ±10 % Deckel,
      ohne Wert/Schnitt neutral.
   3. RAT UND FORTSCHRITT: liegen die Hauptmuskeln der Skalen-Sportart ueber
      dem Richtwert, raet die Karte zu einer Stufe darunter; ist der beste
      Grad juengst hoeher als davor, sagt sie den Fortschritt.
   4. DAS WACHSTUM liest die gewichteten Wochen-Lasten (muskelLast) — Wdh,
      Zeit, Erledigt und Grad fliessen automatisch ein.
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
function grabZahl(name){
  const t = new RegExp("^const " + name + "\\s*=[^;\\n]*;", "m").exec(src);
  if(!t) throw new Error("Konstante nicht gefunden: " + name);
  return t[0];
}

/* Die ECHTE Kletter-Skala aus dem Sportarten-Register ziehen — kein Nachbau. */
const kletterMass = (() => {
  const i = src.indexOf('id:"klettern"');
  const j = src.indexOf("mass:{", i);
  let tiefe = 0;
  for(let k = src.indexOf("{", j + 5); k < src.length; k++){
    if(src[k] === "{") tiefe++;
    else if(src[k] === "}"){ tiefe--; if(tiefe === 0) return src.slice(j + 5, k + 1); }
  }
  throw new Error("Kletter-mass nicht gefunden");
})();

const modul = { exports: {} };
new Function("module", "exports", [
  grabZahl("MESSWERT_MINDEST_EINHEITEN"), grabZahl("ERHOLUNG_LERN_FENSTER"),
  "const SPORTARTEN_TEST = { klettern: { mass: " + kletterMass + " }," +
  "  yoga: { mass: { label:'Beweglichkeit', einheit:'°', schritt:5, start:30, max:180 } }," +
  "  laufen: {} };",
  "function sportart(id){ return SPORTARTEN_TEST[id] || {}; }",
  "function sportartName(id){ return id; }",
  "const SPORT_LAST_MUSKELN = { klettern: { p:['forearm','latissimus'], s:['biceps'] } };",
  "function muskelnAufKarte(k){ return (k || []).slice(); }",
  "const MUSKEL_INFO = { forearm:{ name:'Unterarme' }, latissimus:{ name:'Lat' } };",
  "function begrenzen(w, min, max){ return Math.min(max, Math.max(min, w)); }",
  grabFn("tagDifferenz"),
  grabFn("massZahl"),
  grabFn("echteSaetze"), grabFn("lastSaetze"),
  grabFn("messwertSchnittJeSportart"), grabFn("messwertFaktor"),
  grabFn("messwertFortschritt"), grabFn("messwertFortschrittText"),
  grabFn("messwertRat"), grabFn("messwertRatText"),
  "module.exports = { lastSaetze, echteSaetze, messwertSchnittJeSportart, messwertFaktor," +
  " messwertFortschritt, messwertFortschrittText, messwertRat, messwertRatText };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const HEUTE = "2026-08-10";

/* ---------- 1) Erledigt zaehlt in die Last ---------- */
{
  const saetze = [{ name:"Kniebeugen", wdh:10, soll:true }, { name:"Plank", modus:"zeit", dauer:45 }, null];
  pruefe("lastSaetze nimmt Soll-Saetze mit (und wirft kaputte raus)",
    T.lastSaetze({ saetze }).length === 2);
  pruefe("echteSaetze filtert Soll weiterhin (Bestwerte-Linie)",
    T.echteSaetze({ saetze }).length === 1);
}
pruefe("beide Last-Rechnungen lesen ueber lastSaetze",
  grabFn("muskelLast").includes("lastSaetze(e).forEach") &&
  grabFn("muskelLastAbklingend").includes("lastSaetze(e).forEach"));
pruefe("Bestwerte lesen weiter ueber echteSaetze",
  grabFn("maxGewichtJeUebung").includes("echteSaetze(e)"));
pruefe("der Erledigt-Eintrag schaetzt seine Dauer aus den Plan-Werten",
  grabFn("kraftErledigt").includes("dauerMin: dauerSchaetzen(plan)"));
pruefe("die Einordnungs-Zeile zaehlt Erledigt nicht mehr als satzlos",
  grabFn("satzloseEinheiten").includes("lastSaetze(e).some(s => uebungMuskeln(s.name))"));

/* ---------- 2) Die Schwierigkeit wiegt mit ---------- */
const klettern = (datum, grad) => ({ datum, typ:"aktivitaet", sportart:"klettern",
  dauerMin:60, messwert:grad, saetze:[] });
{
  // Drei Einheiten auf 6a — der eigene Schnitt.
  const basis = [klettern("2026-08-01", "6a"), klettern("2026-08-03", "6a"), klettern("2026-08-05", "6a")];
  const schnitt = T.messwertSchnittJeSportart(basis, HEUTE);
  pruefe("ab drei Einheiten gibt es einen Schnitt", schnitt.klettern >= 0);
  pruefe("unter drei Einheiten nicht",
    T.messwertSchnittJeSportart(basis.slice(0, 2), HEUTE).klettern === undefined);
  pruefe("ein Grad ueber dem eigenen Schnitt wiegt 10 % mehr",
    T.messwertFaktor(klettern(HEUTE, "6a+"), schnitt) === 1.1);
  pruefe("ein Grad darunter wiegt weniger",
    T.messwertFaktor(klettern(HEUTE, "5c"), schnitt) === 0.9);
  pruefe("der eigene uebliche Grad ist neutral",
    T.messwertFaktor(klettern(HEUTE, "6a"), schnitt) === 1);
  pruefe("ohne Messwert neutral",
    T.messwertFaktor(klettern(HEUTE, null), schnitt) === 1);
  pruefe("ohne Schnitt neutral",
    T.messwertFaktor(klettern(HEUTE, "8a"), {}) === 1);
  pruefe("Yogas Beweglichkeit ist KEINE Intensitaet",
    T.messwertFaktor({ datum:HEUTE, typ:"aktivitaet", sportart:"yoga",
                       dauerMin:60, messwert:120, saetze:[] }, { yoga:60 }) === 1);
  pruefe("Vorschau-Eintraege stiften keinen Schnitt",
    T.messwertSchnittJeSportart(basis.map(e => Object.assign({}, e, { vorschau:true })), HEUTE)
      .klettern === undefined);
  pruefe("der Faktor bleibt im 10-Prozent-Deckel",
    T.messwertFaktor(klettern(HEUTE, "8c"), schnitt) === 1.1 &&
    T.messwertFaktor(klettern(HEUTE, "3"), schnitt) === 0.9);
}
pruefe("beide Last-Rechnungen wiegen die Schwierigkeit",
  grabFn("muskelLast").includes("messwertFaktor(e, messwerte)") &&
  grabFn("muskelLastAbklingend").includes("messwertFaktor(e, messwerte)"));

/* ---------- 3) Rat und Fortschritt ---------- */
{
  const rat = T.messwertRat(["klettern", "laufen"], { forearm:1.4, latissimus:0.5 });
  pruefe("heisse Hauptmuskeln ergeben einen Rat",
    rat.length === 1 && rat[0].sportart === "klettern" && rat[0].muskeln.join() === "Unterarme");
  pruefe("der Text raet zur Stufe darunter, ohne zu alarmieren",
    T.messwertRatText(rat).includes("eine Stufe unter deinem üblichen Grad") &&
    !/Warnung|Gefahr|Verletzung/.test(T.messwertRatText(rat)));
  pruefe("ohne heisse Muskeln kein Rat",
    T.messwertRat(["klettern"], { forearm:0.8 }).length === 0);
  pruefe("Sportarten ohne Intensitaets-Mass geben nie einen Rat",
    T.messwertRat(["laufen", "yoga"], { forearm:2 }).length === 0);
}
{
  const verlauf = [klettern("2026-05-20", "5c"), klettern("2026-05-25", "5c"),
                   klettern("2026-06-01", "5c"), klettern("2026-08-05", "6a")];
  const f = T.messwertFortschritt(verlauf, HEUTE);
  pruefe("ein hoeherer Grad im juengsten Fenster ist ein Fortschritt",
    f.length === 1 && f[0].jetzt === "6a" && f[0].vorher === "5c");
  pruefe("der Satz nennt beide Grade",
    T.messwertFortschrittText(f).includes("6a") && T.messwertFortschrittText(f).includes("5c"));
  pruefe("ohne Steigerung kein Satz",
    T.messwertFortschritt([klettern("2026-05-20", "6a"), klettern("2026-08-05", "6a")], HEUTE).length === 0);
  pruefe("nur ein junges Fenster allein ist kein Fortschritt (kein Vergleich)",
    T.messwertFortschritt([klettern("2026-08-05", "6a")], HEUTE).length === 0);
}
pruefe("beide Saetze haengen an den Hinweis-Zeilen der Muskelkarte",
  src.includes('id:"messwert-rat"') && src.includes('id:"messwert-fortschritt"'));

/* ---------- 4) Das Wachstum liest gewichtete Wochen ---------- */
pruefe("die Anpassungs-Wochen kommen aus muskelLast (gewichtet)",
  /wochen\.push\(muskelLast\(echt,/.test(grabFn("muskelAuslastung")));
pruefe("und muskelLast wiegt Umfang, Tempo und Grad",
  grabFn("muskelLast").includes("satzGewichtung(s,") &&
  grabFn("muskelLast").includes("paceFaktor(e, pace)") &&
  grabFn("muskelLast").includes("messwertFaktor(e, messwerte)"));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.250.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 250000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.250.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
