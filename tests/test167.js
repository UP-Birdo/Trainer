/* v167-Test: Schlaf in der Belastungs-Rechnung, Grundlagen-Zeile, Mindestmass.

   Zwei Zusagen stehen hier im Mittelpunkt, beide vom Nutzer vorgegeben:
   1. KEIN WERT, KEIN EFFEKT — fehlende Daten duerfen die Rechnung nie
      veraendern, weder nach oben noch nach unten.
   2. Die SAETZE sind gemessen und werden immer gezeigt; gesperrt wird nur das
      URTEIL (Warnung, rote Einfaerbung), bis genug Trainings da sind.
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

const HEUTE = "2026-07-27";
const modul = { exports: {} };
new Function("module", "exports", [
  "function heuteAlsText(){ return '" + HEUTE + "'; }",
  "const MUSKEL_INFO = { pectoral:{ name:'Großer Brustmuskel' } };",
  "const MUSKEL_KAPAZITAET = { pectoral:18 };",
  "const KAPAZITAET_STANDARD = 14;",
  "function zahlKurz(n){ return String(Math.round(n * 10) / 10); }",
  grabFn("tagDifferenz"),
  grabFn("alterJahre"),
  grabConst("SCHLAF_TAGE"),
  grabConst("SCHLAF_MINDEST"),
  grabLiteral("SCHLAF_STUFEN"),
  grabConst("WARNUNG_MINDEST_TRAININGS"),
  grabFn("schlafSchnitt"),
  grabFn("schlafFaktor"),
  /* v168: Das Befinden geht nach demselben Muster ein. Hier wird immer ohne
     Befinden-Eintraege gerechnet, der Faktor ist also 1 — die v167-Zusagen
     gelten damit unveraendert weiter. */
  grabConst("BEFINDEN_MINDEST"),
  grabLiteral("BEFINDEN_STUFEN"),
  grabFn("befindenSchnitt"),
  grabFn("befindenFaktor"),
  grabFn("kapazitaetsFaktor"),
  grabFn("muskelKapazitaet"),
  grabFn("basisReicht"),
  /* v189: Die Grundlagen-Zeile nennt jetzt auch die gemessenen Pausen. In
     dieser Datei tragen die Test-Trainings keine, der Posten steht hier also
     immer unter „fehlt" — die v167-Zusagen bleiben unveraendert. Gebaut wird
     die Aussage in test189. */
  "const MUSKEL_HEAT_TAGE = 7;",
  grabFn("echteSaetze"),
  grabFn("pausenGemessen"),
  grabFn("rechnungsGrundlage"),
  grabFn("grundlageText"),
  grabFn("auslastungStufe"),
  grabFn("auslastungText"),
  "module.exports = { SCHLAF_TAGE, SCHLAF_MINDEST, SCHLAF_STUFEN, WARNUNG_MINDEST_TRAININGS," +
  " schlafSchnitt, schlafFaktor, kapazitaetsFaktor, muskelKapazitaet, basisReicht," +
  " rechnungsGrundlage, grundlageText, auslastungStufe, auslastungText };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/** Schlaf-Eintraege: `tage` = wie viele Tage zurueck, alle mit demselben Wert. */
function naechte(tage, wert){
  return tage.map(d => {
    const tag = new Date(Date.UTC(2026, 6, 27 - d));
    return { art:"schlaf", datum: tag.toISOString().slice(0, 10), wert };
  });
}
function trainings(n){
  return Array.from({ length:n }, (_, i) => ({ datum:"2026-07-" + String(10 + i).padStart(2, "0") }));
}

/* ---------- 1) Grenzwerte sind plausibel ---------- */
pruefe("das Fenster ist dasselbe wie bei der Last (7 Tage)", A.SCHLAF_TAGE === 7);
pruefe("eine einzelne Nacht reicht nicht", A.SCHLAF_MINDEST >= 2);
pruefe("die Wirkung ist gedeckelt (hoechstens 10 Prozent Ausschlag)",
  A.SCHLAF_STUFEN.every(s => s.faktor >= 0.9 && s.faktor <= 1.1));
pruefe("die Stufen steigen mit dem Schlaf",
  A.SCHLAF_STUFEN.every((s, i) => i === 0 || s.faktor >= A.SCHLAF_STUFEN[i-1].faktor));
pruefe("es gibt einen neutralen Bereich",
  A.SCHLAF_STUFEN.some(s => s.faktor === 1));

/* ---------- 2) schlafSchnitt — kein Wert, kein Effekt ---------- */
pruefe("ohne Eintraege kein Schnitt", A.schlafSchnitt([], HEUTE) === null);
pruefe("ohne Liste kein Schnitt",
  A.schlafSchnitt(null, HEUTE) === null && A.schlafSchnitt(undefined, HEUTE) === null);
pruefe("zu wenige Eintraege ergeben KEINEN Schnitt",
  A.schlafSchnitt(naechte([0, 1], 5), HEUTE) === null);
pruefe("ab der Mindestzahl wird gerechnet",
  A.schlafSchnitt(naechte([0, 1, 2], 6), HEUTE) === 6);
pruefe("der Schnitt stimmt", (() => {
  const l = naechte([0], 6).concat(naechte([1], 7), naechte([2], 8));
  return A.schlafSchnitt(l, HEUTE) === 7;
})());
pruefe("Naechte AUSSERHALB des Fensters zaehlen nicht",
  A.schlafSchnitt(naechte([0, 1, 20], 6), HEUTE) === null);
pruefe("und ziehen den Schnitt nicht mit", (() => {
  const l = naechte([0, 1, 2], 8).concat(naechte([30], 0));
  return A.schlafSchnitt(l, HEUTE) === 8;
})());
pruefe("andere Tageswerte stoeren nicht",
  A.schlafSchnitt(naechte([0,1,2], 6).concat([{ art:"befinden", datum:"2026-07-27", wert:5 }]), HEUTE) === 6);
pruefe("kaputte Eintraege werfen nicht",
  A.schlafSchnitt([null, { art:"schlaf" }].concat(naechte([0,1,2], 7)), HEUTE) === 7);
pruefe("null Stunden ist ein gueltiger Wert",
  A.schlafSchnitt(naechte([0,1,2], 0), HEUTE) === 0);

/* ---------- 3) schlafFaktor ---------- */
pruefe("ohne Schnitt kein Effekt",
  A.schlafFaktor(null) === 1 && A.schlafFaktor(undefined) === 1);
pruefe("kein Effekt auch bei Unsinn", A.schlafFaktor(NaN) === 1);
pruefe("wenig Schlaf senkt", A.schlafFaktor(5) < 1 && A.schlafFaktor(6) < 1);
pruefe("mittlerer Schlaf senkt weniger", A.schlafFaktor(6.5) > A.schlafFaktor(5));
pruefe("guter Schlaf ist neutral", A.schlafFaktor(7.5) === 1 && A.schlafFaktor(8.5) === 1);
pruefe("viel Schlaf gibt einen kleinen Bonus", A.schlafFaktor(10) > 1);
pruefe("nie mehr als 10 Prozent nach unten", A.schlafFaktor(0) >= 0.9);

/* ---------- 4) Der Kapazitaetsfaktor: fehlende Daten aendern NICHTS ---------- */
const profil = { geburtsjahr:2000 }, einr = { erfahrung:"fortgeschritten" };
const ohne = A.kapazitaetsFaktor(profil, einr, HEUTE);
pruefe("ohne Tageswerte wie vor v167 (Aufruf mit alter Stelligkeit)",
  A.kapazitaetsFaktor(profil, einr, HEUTE, undefined) === ohne);
pruefe("leere Tageswerte aendern nichts",
  A.kapazitaetsFaktor(profil, einr, HEUTE, []) === ohne);
pruefe("zu wenige Naechte aendern nichts",
  A.kapazitaetsFaktor(profil, einr, HEUTE, naechte([0, 1], 4)) === ohne);
// v168: Befinden geht ebenfalls ein — aber nach derselben Regel. Zu wenige
// Eintraege aendern weiterhin nichts; die Wirkung selbst prueft test168.
pruefe("zu wenige Befinden-Eintraege aendern nichts",
  A.kapazitaetsFaktor(profil, einr, HEUTE,
    [0,1].map(d => ({ art:"befinden", datum:"2026-07-2" + (7-d), wert:1 }))) === ohne);
pruefe("ein gutes Befinden aendert nichts",
  A.kapazitaetsFaktor(profil, einr, HEUTE,
    [0,1,2].map(d => ({ art:"befinden", datum:"2026-07-2" + (7-d), wert:5 }))) === ohne);
pruefe("ein schlechtes Befinden SENKT die Kapazitaet",
  A.kapazitaetsFaktor(profil, einr, HEUTE,
    [0,1,2].map(d => ({ art:"befinden", datum:"2026-07-2" + (7-d), wert:1 }))) < ohne);
pruefe("schlechter Schlaf SENKT die Kapazitaet",
  A.kapazitaetsFaktor(profil, einr, HEUTE, naechte([0,1,2], 5)) < ohne);
pruefe("guter Schlaf hebt sie leicht",
  A.kapazitaetsFaktor(profil, einr, HEUTE, naechte([0,1,2], 10)) > ohne);
pruefe("normaler Schlaf laesst sie, wie sie ist",
  A.kapazitaetsFaktor(profil, einr, HEUTE, naechte([0,1,2], 8)) === ohne);
pruefe("das schlaegt auf die Muskel-Kapazitaet durch",
  A.muskelKapazitaet("pectoral", profil, einr, HEUTE, naechte([0,1,2], 5)) <
  A.muskelKapazitaet("pectoral", profil, einr, HEUTE));

/* ---------- 5) Das Mindestmass fuer das URTEIL ---------- */
pruefe("ohne Trainings reicht die Basis nicht",
  A.basisReicht([]) === false && A.basisReicht(null) === false);
pruefe("knapp darunter reicht sie nicht",
  A.basisReicht(trainings(A.WARNUNG_MINDEST_TRAININGS - 1)) === false);
pruefe("ab der Grenze reicht sie",
  A.basisReicht(trainings(A.WARNUNG_MINDEST_TRAININGS)) === true);
pruefe("Eintraege ohne Datum zaehlen nicht mit",
  A.basisReicht(trainings(A.WARNUNG_MINDEST_TRAININGS - 1).concat([{}, {}])) === false);
pruefe("die Grenze zaehlt Trainings INSGESAMT, nicht im 7-Tage-Fenster",
  grabFn("basisReicht").indexOf("tagDifferenz") < 0);

/* ---------- 6) Der Text: Zahlen immer, Urteil nur mit Basis ---------- */
const hoch = { saetze:22, kapazitaet:18, quote:1.22, tageSeit:1, erholt:false };
const zuviel = { saetze:26, kapazitaet:18, quote:1.44, tageSeit:1, erholt:false };
const ruhig = { saetze:6, kapazitaet:18, quote:0.33, tageSeit:3, erholt:true };
pruefe("mit Basis wird gewarnt", A.auslastungText("pectoral", zuviel, true).includes("über dem Richtwert"));
pruefe("ohne Basis NICHT", !A.auslastungText("pectoral", zuviel, false).includes("über dem Richtwert"));
pruefe("ohne Basis stehen die Zahlen trotzdem da",
  A.auslastungText("pectoral", zuviel, false).includes("26") &&
  A.auslastungText("pectoral", zuviel, false).includes("18"));
pruefe("und es wird ehrlich gesagt, warum kein Urteil kommt",
  A.auslastungText("pectoral", zuviel, false).includes("fehlen ihr Trainings"));
pruefe("auch die Stufe hoch wird ohne Basis zurueckgehalten",
  !A.auslastungText("pectoral", hoch, false).includes("am Richtwert"));
pruefe("Unauffaelliges bleibt auch ohne Basis unauffaellig",
  A.auslastungText("pectoral", ruhig, false).includes("erholt und bereit"));
pruefe("ohne Angabe gilt weiter die alte Bedeutung (Warnung an)",
  A.auslastungText("pectoral", zuviel).includes("über dem Richtwert"));
pruefe("ohne Daten bleibt der Satz wie vorher",
  A.auslastungText("pectoral", null, false).includes("noch nicht trainiert"));

/* ---------- 7) Die Grundlagen-Zeile ---------- */
// v168: „vollstaendig" heisst jetzt auch MIT Befinden-Eintraegen.
const befindenVoll = [0,1,2].map(d => ({ art:"befinden", datum:"2026-07-2" + (7-d), wert:4 }));
const gVoll = A.rechnungsGrundlage(trainings(14), profil, einr,
                                   naechte([0,1,2], 7).concat(befindenVoll), HEUTE);
pruefe("sie zaehlt die Trainings", gVoll.trainings === 14);
pruefe("und weiss, dass die Basis reicht", gVoll.reicht === true);
pruefe("Erfahrung, Alter, Schlaf und Befinden stehen als vorhanden drin",
  ["Erfahrung", "Alter", "Schlaf", "Befinden"].every(x => gVoll.hat.includes(x)));
pruefe("nichts fehlt", gVoll.fehlt.length === 0);
pruefe("und es wird nichts angenommen", gVoll.annahme === false);

const gLeer = A.rechnungsGrundlage(trainings(2), {}, {}, [], HEUTE);
pruefe("ohne Angaben fehlt alles",
  ["Erfahrung", "Alter", "Schlaf", "Befinden"].every(x => gLeer.fehlt.includes(x)));
pruefe("und nichts steht als vorhanden da", gLeer.hat.length === 0);
pruefe("die duenne Basis wird erkannt", gLeer.reicht === false);
pruefe("die stille Annahme wird gemeldet", gLeer.annahme === true);

const tVoll = A.grundlageText(gVoll), tLeer = A.grundlageText(gLeer);
pruefe("der volle Text nennt die Trainings", tVoll.includes("14 Trainings"));
pruefe("und sagt nichts von fehlenden Daten", !tVoll.includes("Ohne "));
pruefe("und verlangt keine weiteren Trainings", !tVoll.includes("Für eine Warnung"));
pruefe("der leere Text nennt, was fehlt", tLeer.includes("Ohne Erfahrung, Alter, Schlaf, Befinden."));
pruefe("er sagt, dass es genauer wuerde", tLeer.includes("genauer"));
pruefe("er macht die stille Wiedereinsteiger-Annahme sichtbar",
  tLeer.includes("Wiedereinsteiger"));
pruefe("und nennt die fehlenden Trainings mit Zahl",
  tLeer.includes("ab " + A.WARNUNG_MINDEST_TRAININGS));
pruefe("die Einzahl stimmt", A.grundlageText(A.rechnungsGrundlage(trainings(1), {}, {}, [], HEUTE)).includes("1 Training ·") ||
  A.grundlageText(A.rechnungsGrundlage(trainings(1), {}, {}, [], HEUTE)).includes("1 Training."));
pruefe("ohne Grundlage kein Text", A.grundlageText(null) === "");

/* ---------- 8) Verdrahtung ---------- */
pruefe("die Auslastung bekommt die Tageswerte",
  grabFn("auslastungsQuoten").includes("sitzung.daten.tageswerte"));
pruefe("die Einfaerbung bleibt ohne Basis aus",
  grabFn("auslastungsQuoten").includes("if(!basisReicht(sitzung.daten.protokoll)) return {};"));
pruefe("die Detail-Karte reicht die Basis durch",
  grabFn("muskelAuswahlZeichnen").includes("auslastungText(key, a, reicht)"));
pruefe("und faerbt ohne Basis neutral",
  grabFn("muskelAuswahlZeichnen").includes('reicht ? auslastungStufe(a) : "gut"'));
pruefe("die Statuszeile warnt nur mit Basis",
  grabFn("muskelStatusText").includes("basisReicht(sitzung.daten.protokoll)"));
pruefe("die Grundlagen-Zeile steht auf der Muskelkarte",
  grabFn("muskelStatusText").includes("grundlagenZeileHtml()"));
pruefe("sie kommt aus rechnungsGrundlage",
  grabFn("grundlagenZeileHtml").includes("rechnungsGrundlage(") &&
  grabFn("grundlagenZeileHtml").includes("grundlageText("));
pruefe("Nutzertext in der Statuszeile wird escapet",
  grabFn("muskelStatusText").includes("el.innerHTML = text("));

/* ---------- 9) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v167",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 167);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.167", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
