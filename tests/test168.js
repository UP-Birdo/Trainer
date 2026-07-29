/* v168-Test: Tages-Check — konkrete Fragen statt Selbsteinschaetzung.

   Nutzer-Einwand: „sein Wohlbefinden in Zahlen zu fassen ist kompliziert fuer
   den Anwender." Das Befinden ist deshalb ein ABGELEITETER Wert geworden.
   Geprueft wird ueber das ECHTE Fragen-Register (eine neue Frage wird hier
   automatisch mitgeprueft) plus die drei Zusagen dieses Baus:
   1. Uebersprungene Fragen erzeugen KEINE Zeile („kein Wert, kein Effekt").
   2. Muskelkater trifft die MUSKELN SEINER REGION, nicht den globalen Faktor.
   3. Alles davon gilt erst ab Stufe 4 (Leitplanke 8).
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

const HEUTE = "2026-07-29";
const modul = { exports: {} };
new Function("module", "exports", [
  // MUSKEL_ORDER kommt in der App aus der aktiven Karte (kein Literal an der
  // Stelle) — hier direkt die Reihenfolge aus MUSKELKARTEN holen.
  "const MUSKEL_ORDER = " + /order: (\[[\s\S]*?\])/.exec(src)[1] + ";",
  grabLiteral("MUSKEL_INFO", "{"),
  grabLiteral("CHECK_SKALEN", "{"),
  grabLiteral("TAGES_FRAGEN"),
  grabLiteral("TAGESWERTE"),
  grabConst("CHECK_KATER_ABZUG"),
  grabConst("CHECK_KATER_MAX"),
  grabConst("CHECK_KATER_TAGE"),
  grabConst("SCHLAF_TAGE"),
  grabConst("BEFINDEN_MINDEST"),
  grabLiteral("BEFINDEN_STUFEN"),
  grabFn("tagDifferenz"),
  grabFn("checkFragen"),
  grabFn("checkRegionen"),
  grabFn("befindenAusCheck"),
  grabFn("checkZeilen"),
  grabFn("katerRegionen"),
  grabFn("katerMuskeln"),
  grabFn("befindenSchnitt"),
  grabFn("befindenFaktor"),
  grabFn("tageswerteFuer"),
  grabFn("tageswertDef"),
  "module.exports = { TAGES_FRAGEN, TAGESWERTE, CHECK_SKALEN, MUSKEL_INFO, BEFINDEN_STUFEN," +
  " CHECK_KATER_TAGE, checkFragen, checkRegionen, befindenAusCheck, checkZeilen," +
  " katerRegionen, katerMuskeln, befindenSchnitt, befindenFaktor, tageswerteFuer, tageswertDef };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const MANN = { geschlecht:"m" }, FRAU = { geschlecht:"w" };

/* ---------- 1) Das Fragen-Register ---------- */
pruefe("es gibt mehrere Fragen", A.TAGES_FRAGEN.length >= 4);
pruefe("keine doppelten Kennungen",
  new Set(A.TAGES_FRAGEN.map(f => f.id)).size === A.TAGES_FRAGEN.length);
A.TAGES_FRAGEN.forEach(f => {
  pruefe(f.id + ": hat einen Fragetext", typeof f.frage === "string" && f.frage.length > 3);
  pruefe(f.id + ": nutzt eine bekannte Skala", !!A.CHECK_SKALEN[f.skala]);
  pruefe(f.id + ": senkt das Befinden, statt es zu heben", f.abzug > 0);
  pruefe(f.id + ": hat eine eigene Kurve in den Tageswerten",
    A.TAGESWERTE.some(w => w.id === f.id));
});
pruefe("alle Skalen beginnen bei Nein/0",
  Object.keys(A.CHECK_SKALEN).every(k => A.CHECK_SKALEN[k][0].wert === 0));
pruefe("Ja/Nein hat zwei Stufen, die dreistufige drei",
  A.CHECK_SKALEN.janein.length === 2 && A.CHECK_SKALEN.stufe3.length === 3);

/* ---------- 2) Profil-abhaengige Fragen ---------- */
const fuerFrau = A.checkFragen(FRAU).map(f => f.id);
const fuerMann = A.checkFragen(MANN).map(f => f.id);
pruefe("die Perioden-Frage kommt nur bei passendem Profil",
  fuerFrau.includes("periode") && !fuerMann.includes("periode"));
pruefe("ohne Profil wird sie nicht gestellt",
  !A.checkFragen(null).map(f => f.id).includes("periode"));
pruefe("alle anderen Fragen gelten fuer alle",
  A.TAGES_FRAGEN.filter(f => !f.nurWenn).every(f => fuerMann.includes(f.id)));
pruefe("und der Tageswert dazu erscheint genauso selektiv",
  A.tageswerteFuer(FRAU).some(w => w.id === "periode") &&
  !A.tageswerteFuer(MANN).some(w => w.id === "periode"));

/* ---------- 3) Regionen ---------- */
const regionen = A.checkRegionen();
pruefe("es gibt Regionen zur Auswahl", regionen.length >= 5);
pruefe("keine Dubletten", new Set(regionen).size === regionen.length);
pruefe("jede Region kommt aus der Muskelkarte",
  regionen.every(r => Object.keys(A.MUSKEL_INFO).some(m => A.MUSKEL_INFO[m].region === r)));
pruefe("und jeder Muskel hat seine Region dabei",
  Object.keys(A.MUSKEL_INFO).every(m => regionen.includes(A.MUSKEL_INFO[m].region)));

/* ---------- 4) Befinden aus den Antworten ---------- */
pruefe("ohne Befund ist das Befinden top", A.befindenAusCheck({}) === 5);
pruefe("auch ohne Antworten-Objekt", A.befindenAusCheck(null) === 5);
pruefe("ein Befund senkt", A.befindenAusCheck({ kopfschmerz:1 }) < 5);
pruefe("mehr Befunde senken mehr",
  A.befindenAusCheck({ kopfschmerz:1, krank:1 }) < A.befindenAusCheck({ kopfschmerz:1 }));
pruefe("die staerkere Stufe senkt staerker",
  A.befindenAusCheck({ erschoepft:2 }) < A.befindenAusCheck({ erschoepft:1 }));
pruefe("eine Nein-Antwort senkt nicht", A.befindenAusCheck({ erschoepft:0, krank:0 }) === 5);
pruefe("das Ergebnis bleibt zwischen 1 und 5", (() => {
  const alles = {};
  A.TAGES_FRAGEN.forEach(f => { alles[f.id] = 2; });
  alles.kater = A.checkRegionen();
  const b = A.befindenAusCheck(alles);
  return b >= 1 && b <= 5;
})());
pruefe("Muskelkater senkt das Befinden", A.befindenAusCheck({ kater:["Beine"] }) < 5);
pruefe("aber gedeckelt — viele Regionen senken nicht endlos",
  A.befindenAusCheck({ kater:["Beine","Brust"] }) ===
  A.befindenAusCheck({ kater:A.checkRegionen() }));
pruefe("das Ergebnis ist eine ganze Zahl",
  Number.isInteger(A.befindenAusCheck({ stress:1, kopfschmerz:1 })));

/* ---------- 5) checkZeilen — nur Beantwortetes wird gespeichert ---------- */
const zeilen = A.checkZeilen({ kopfschmerz:1, kater:["Brust"] }, HEUTE, MANN);
const arten = zeilen.map(z => z.art);
pruefe("die beantwortete Frage wird gespeichert", arten.includes("kopfschmerz"));
pruefe("die uebersprungenen NICHT",
  !arten.includes("erschoepft") && !arten.includes("stress") && !arten.includes("krank"));
pruefe("die Region wird einzeln gespeichert", arten.includes("kater:Brust"));
pruefe("die Anzahl der Regionen bekommt eine eigene Zeile", arten.includes("kater"));
pruefe("und das abgeleitete Befinden auch", arten.includes("befinden"));
pruefe("jede Zeile traegt das Datum", zeilen.every(z => z.datum === HEUTE));
pruefe("jede Zeile traegt einen Wert", zeilen.every(z => typeof z.wert === "number"));
pruefe("das gespeicherte Befinden stimmt mit der Rechnung ueberein",
  zeilen.find(z => z.art === "befinden").wert ===
  A.befindenAusCheck({ kopfschmerz:1, kater:["Brust"] }));
pruefe("ohne Muskelkater steht dort eine 0",
  A.checkZeilen({ krank:1 }, HEUTE, MANN).find(z => z.art === "kater").wert === 0);
pruefe("eine Nein-Antwort wird gespeichert (Nein ist eine Aussage)",
  A.checkZeilen({ krank:0 }, HEUTE, MANN).map(z => z.art).includes("krank"));
pruefe("die Perioden-Antwort landet nur bei passendem Profil",
  A.checkZeilen({ periode:1 }, HEUTE, FRAU).map(z => z.art).includes("periode") &&
  !A.checkZeilen({ periode:1 }, HEUTE, MANN).map(z => z.art).includes("periode"));
pruefe("gar nichts beantwortet ergibt nur die Zusammenfassungen",
  A.checkZeilen({}, HEUTE, MANN).map(z => z.art).join(",") === "kater,befinden");

/* ---------- 6) Muskelkater trifft SEINE Muskeln ---------- */
const katerListe = [
  { datum:HEUTE, art:"kater:Brust", wert:1 },
  { datum:"2026-07-01", art:"kater:Beine", wert:1 }   // laengst vorbei
];
const heiss = A.katerRegionen(katerListe, HEUTE);
pruefe("frischer Muskelkater zaehlt", heiss.has("Brust"));
pruefe("alter nicht mehr", !heiss.has("Beine"));
pruefe("ohne Daten ist die Menge leer",
  A.katerRegionen([], HEUTE).size === 0 && A.katerRegionen(null, HEUTE).size === 0);
pruefe("andere Tageswerte werden nicht als Kater gelesen",
  A.katerRegionen([{ datum:HEUTE, art:"kater", wert:3 }], HEUTE).size === 0);
pruefe("eine 0 ist kein Muskelkater",
  A.katerRegionen([{ datum:HEUTE, art:"kater:Brust", wert:0 }], HEUTE).size === 0);
const muskeln = A.katerMuskeln(heiss);
pruefe("Brust-Kater trifft den Brustmuskel", muskeln.has("pectoral"));
pruefe("aber nicht die Beine", !muskeln.has("quadriceps"));
pruefe("ohne Regionen keine Muskeln", A.katerMuskeln(new Set()).size === 0);
pruefe("und robust gegen fehlende Eingabe", A.katerMuskeln(null).size === 0);
pruefe("das Fenster ist kurz — Muskelkater haelt keine Woche",
  A.CHECK_KATER_TAGE <= 3);

/* ---------- 7) Befinden im Kapazitaetsfaktor: kein Wert, kein Effekt ---------- */
function befindenTage(tage, wert){
  return tage.map(d => {
    const tag = new Date(Date.UTC(2026, 6, 29 - d));
    return { art:"befinden", datum: tag.toISOString().slice(0, 10), wert };
  });
}
pruefe("ohne Eintraege kein Schnitt",
  A.befindenSchnitt([], HEUTE) === null && A.befindenSchnitt(null, HEUTE) === null);
pruefe("zu wenige Eintraege ergeben keinen Schnitt",
  A.befindenSchnitt(befindenTage([0,1], 2), HEUTE) === null);
pruefe("ab der Mindestzahl wird gerechnet",
  A.befindenSchnitt(befindenTage([0,1,2], 4), HEUTE) === 4);
pruefe("alte Eintraege zaehlen nicht mit",
  A.befindenSchnitt(befindenTage([0,1,30], 3), HEUTE) === null);
pruefe("ohne Schnitt kein Effekt",
  A.befindenFaktor(null) === 1 && A.befindenFaktor(undefined) === 1);
pruefe("schlechtes Befinden senkt", A.befindenFaktor(2) < 1);
pruefe("gutes Befinden ist neutral", A.befindenFaktor(4) === 1 && A.befindenFaktor(5) === 1);
pruefe("die Wirkung ist gedeckelt (hoechstens 10 Prozent)",
  A.BEFINDEN_STUFEN.every(s => s.faktor >= 0.9 && s.faktor <= 1.1));
pruefe("das Befinden hebt die Kapazitaet NIE — anders als Schlaf gibt es keinen Bonus",
  A.BEFINDEN_STUFEN.every(s => s.faktor <= 1));

/* ---------- 8) Verdrahtung ---------- */
pruefe("der Kapazitaetsfaktor rechnet das Befinden mit",
  grabFn("kapazitaetsFaktor").includes("befindenFaktor(befindenSchnitt(tageswerte, heute))"));
pruefe("die Grundlagen-Zeile nennt es",
  grabFn("rechnungsGrundlage").includes('.push("Befinden")'));
pruefe("Muskelkater steht als EIGENER Satz, nicht in der Quote",
  grabFn("muskelAuswahlZeichnen").includes("katerMuskeln(katerRegionen(") &&
  !grabFn("muskelAuslastung").includes("kater"));
pruefe("das Plus oeffnet bei Check-Werten den Check",
  grabFn("tageswertFormularZeigen").includes("tageswertDef(tageswertArt).check"));
pruefe("der Check startet immer leer",
  grabFn("tagesCheckOeffnen").includes("checkAntworten = { kater: [] }"));
pruefe("nochmal antippen nimmt die Antwort zurueck",
  grabFn("tagesCheckAntwort").includes("delete checkAntworten[id]"));
pruefe("gespeichert wird ueber checkZeilen und werteSetzen",
  grabFn("tagesCheckSpeichern").includes("checkZeilen(checkAntworten") &&
  grabFn("tagesCheckSpeichern").includes("werteSetzen(sitzung.daten.tageswerte"));
pruefe("ohne jede Antwort wird nichts gespeichert",
  grabFn("tagesCheckSpeichern").includes("if(!beantwortet)"));
pruefe("die Auswahl im Tageswerte-Feld richtet sich nach dem Profil",
  grabFn("tageswertZeichnen").includes("tageswerteFuer(sitzung.daten.profil)"));

/* ---------- 9) Leitplanke 8: nichts fragen auf Stufe 1/2 ---------- */
pruefe("der Tages-Check ist erst ab Stufe 4 erlaubt", src.includes('"view-tagescheck": 4'));
pruefe("die Ansicht existiert", src.includes('<section id="view-tagescheck"'));
pruefe("und laesst sich wegwischen (v164)",
  src.slice(src.indexOf('<section id="view-tagescheck"'),
            src.indexOf("</section>", src.indexOf('<section id="view-tagescheck"'))).includes("data-zurueck"));
pruefe("der Einstieg prueft die Stufe", grabFn("tagesCheckOeffnen").includes('viewErlaubt("view-tagescheck")'));

/* ---------- 10) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v168",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 168);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.168", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
