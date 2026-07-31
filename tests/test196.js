/* v196-Test: Statistiken oeffnen sich (Nutzer-Ansagen aus der 48. Runde).

   Die Zusagen:
   1. Die Trainings-Kachel oeffnet den vollen Verlauf — wie Kalender und
      Koerpergewicht. Der Knopf „Ganzen Verlauf zeigen" entfaellt dafuer.
      Das Mehrfach-Loeschen steht dort schon (Register `LISTEN_TYPEN`, v163).
   2. Beim Koerpergewicht steht die Kurve OBEN, die Liste darunter — und
      darueber ein Zoom-Schalter (Woche / Monat / Jahr / Alles).
   3. Der Zoom ist so gebaut, dass ihn andere Kurven erben koennen:
      `zeitraumFilter` ist rein und kennt nur Eintraege mit `datum`.
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

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("tageVerschieben"),
  grabFn("text"),
  grabBlock("ZOOM_STUFEN", "[", "]"),
  "const zoomStand = {};",
  grabFn("zoomStufe"),
  grabFn("zeitraumFilter"),
  grabFn("zoomLeisteHtml"),
  grabFn("zoomSetzen"),
  grabFn("gewichtKurveHtml"),
  "module.exports = { ZOOM_STUFEN, zoomStufe, zeitraumFilter, zoomLeisteHtml, zoomSetzen," +
  " gewichtKurveHtml, zoomStand };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const e = (datum, kg) => ({ datum: datum, kg: kg });

/* ---------- 1) Die Trainings-Kachel oeffnet den Verlauf ---------- */
pruefe("die Kachel ist antippbar",
  /id="stat-trainings"[^>]*onclick="verlaufOeffnen\(\)"/.test(src) ||
  /class="karte stat-karte stat-tap" id="stat-trainings"[\s\S]{0,80}verlaufOeffnen/.test(src));
pruefe("sie traegt die Tap-Klasse", /class="karte stat-karte stat-tap" id="stat-trainings"/.test(src));
const vorschau = grabFn("protokollZeichnen");
pruefe("der alte Knopf ist entfallen", !vorschau.includes("Ganzen Verlauf zeigen"));
pruefe("stattdessen steht die Gesamtzahl da", vorschau.includes("Trainings insgesamt"));
pruefe("die Vorschau bleibt bei fuenf Eintraegen", vorschau.includes("slice(0, 5)"));
/* Das Ziel gibt es, und es kann Mehrfach-Loeschen (Register aus v163). */
pruefe("die Verlauf-Ansicht existiert", src.includes('id="view-verlauf"'));
pruefe("und haengt im Loesch-Register", /verlauf: \{[\s\S]{0,200}ansicht:\s*"view-verlauf"/.test(src));
pruefe("verlaufOeffnen zeichnet und zeigt",
  grabFn("verlaufOeffnen").includes("verlaufListeZeichnen()") &&
  grabFn("verlaufOeffnen").includes('zeige("view-verlauf")'));
pruefe("die Liste bietet die Mehrfach-Auswahl an",
  grabFn("verlaufListeZeichnen").includes('listenKopfHtml("verlauf")'));

/* ---------- 2) Der Zoom ---------- */
pruefe("es gibt vier Stufen", A.ZOOM_STUFEN.length === 4);
pruefe("Woche, Monat, Jahr, Alles",
  A.ZOOM_STUFEN.map(z => z.id).join(",") === "woche,monat,jahr,alle");
pruefe("nur die letzte Stufe ist unbegrenzt",
  A.ZOOM_STUFEN.filter(z => z.tage === null).length === 1 &&
  A.ZOOM_STUFEN[A.ZOOM_STUFEN.length - 1].tage === null);
pruefe("die Stufen werden groesser",
  A.ZOOM_STUFEN[0].tage < A.ZOOM_STUFEN[1].tage && A.ZOOM_STUFEN[1].tage < A.ZOOM_STUFEN[2].tage);
pruefe("eine unbekannte Stufe faellt auf Alles zurueck", A.zoomStufe("quatsch").id === "alle");
pruefe("ohne Angabe ebenso", A.zoomStufe().id === "alle");

const daten = [e("2026-01-01", 80), e("2026-07-01", 79), e("2026-07-25", 78.5),
               e("2026-07-30", 78), e("2026-07-31", 77.8)];
const heute = "2026-07-31";
pruefe("Woche nimmt die letzten sieben Tage (heute inklusive)",
  A.zeitraumFilter(daten, 7, heute).length === 3);
pruefe("Monat reicht weiter zurueck als Woche",
  A.zeitraumFilter(daten, 31, heute).length === 4 &&
  A.zeitraumFilter(daten, 31, heute).length > A.zeitraumFilter(daten, 7, heute).length);
pruefe("Jahr nimmt hier alles", A.zeitraumFilter(daten, 365, heute).length === 5);
pruefe("Alles filtert nicht", A.zeitraumFilter(daten, null, heute).length === 5);
pruefe("ohne heute wird nicht gefiltert", A.zeitraumFilter(daten, 7, null).length === 5);
pruefe("die Reihenfolge bleibt",
  A.zeitraumFilter(daten, 365, heute).map(x => x.datum).join(",") ===
  daten.map(x => x.datum).join(","));
pruefe("das Original wird nicht veraendert", daten.length === 5);
pruefe("leere Liste faellt nicht um",
  A.zeitraumFilter([], 7, heute).length === 0 && A.zeitraumFilter(null, 7, heute).length === 0);
pruefe("kaputte Eintraege fliegen raus, ohne zu werfen",
  A.zeitraumFilter([null, { kg:70 }, e(heute, 70)], 7, heute).length === 1);
/* Ein Eintrag von heute muss IMMER drin sein — sonst waere die Kurve leer,
   sobald man auf Woche stellt. */
pruefe("heute ist in jeder Stufe dabei",
  A.ZOOM_STUFEN.every(z => A.zeitraumFilter([e(heute, 70)], z.tage, heute).length === 1));

/* ---------- 3) Die Leiste ---------- */
const leiste = A.zoomLeisteHtml("gewicht", "gewichtStatistikZeichnen");
pruefe("die Leiste hat vier Knoepfe", (leiste.match(/<button/g) || []).length === 4);
pruefe("ohne Wahl ist Alles aktiv", /muskel-an[^>]*>Alles</.test(leiste.replace(/\n/g, "")));
A.zoomSetzen("gewicht", "monat");
const leiste2 = A.zoomLeisteHtml("gewicht", "gewichtStatistikZeichnen");
pruefe("nach der Wahl ist Monat aktiv", /muskel-an[^>]*>Monat</.test(leiste2.replace(/\n/g, "")));
pruefe("genau EIN Knopf ist aktiv", (leiste2.match(/muskel-an/g) || []).length === 1);
pruefe("jede Kurve merkt sich ihre eigene Stufe",
  A.zoomLeisteHtml("tageswert", "x").indexOf("muskel-an\" onclick=\"zoomSetzen('tageswert','alle'") >= 0 ||
  /muskel-an[^>]*>Alles</.test(A.zoomLeisteHtml("tageswert", "x").replace(/\n/g, "")));
pruefe("die Zeichen-Funktion wird mitgegeben", leiste.includes("gewichtStatistikZeichnen()"));
A.zoomSetzen("gewicht", "alle");

/* ---------- 4) Die Kurve steht an zwei Orten, aber nur einmal im Code ---------- */
pruefe("unter zwei Eintraegen wird nichts gemalt",
  A.gewichtKurveHtml([e(heute, 70)], new Set()).includes("Ab zwei Einträgen"));
pruefe("leere Liste faellt nicht um", A.gewichtKurveHtml(null, null).includes("Ab zwei Einträgen"));
const svg = A.gewichtKurveHtml([e("2026-07-30", 80), e("2026-07-31", 78)], new Set(["2026-07-31"]));
pruefe("mit zwei Eintraegen kommt ein SVG", svg.indexOf("<svg") === 0);
pruefe("beide Punkte sind drin", (svg.match(/<circle/g) || []).length === 2);
pruefe("ein Trainingstag wird hervorgehoben", svg.includes("var(--signal)"));
pruefe("ohne Trainingstage faellt sie nicht um",
  A.gewichtKurveHtml([e("2026-07-30", 80), e("2026-07-31", 78)], null).indexOf("<svg") === 0);
const stat = grabFn("gewichtStatistikZeichnen");
pruefe("die Kachel nutzt die gemeinsame Funktion", stat.includes("gewichtKurveHtml(eintraege"));
pruefe("und die Detail-Ansicht auch", stat.includes("gewichtKurveHtml(sicht"));
pruefe("die Detail-Ansicht filtert nach der Zoom-Stufe", stat.includes("zeitraumFilter(eintraege, stufe.tage"));
pruefe("und zeigt die Leiste darueber", stat.includes('zoomLeisteHtml("gewicht"'));
pruefe("ein leerer Zeitraum wird benannt", stat.includes("In diesem Zeitraum kein Eintrag"));
pruefe("im Markup steht die Kurve ueber der Liste",
  src.indexOf('id="gewicht-diagramm-detail"') < src.indexOf('id="gewicht-liste"'));

/* ---------- 5) Version ---------- */
pruefe("APP_VERSION steht genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("und ist mindestens 196",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 196);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
