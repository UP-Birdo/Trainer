/* 0.228.0-Test: Wohlbefinden je Muskel + eine Faerbung fuer den ganzen Koerper.

   Nutzer-Wunsch (dreimal gestellt): „Bei der Muskelkarte fehlt mir neben
   Erkunden noch Wohlbefinden, damit ich einen Muskel anklicken und sagen kann,
   wie der sich anfuehlt — und dass das entsprechend in die Rechnung einfliesst."
   Dazu: „Faerbe in der Muskelkarte den Koerper auch so bunt ein."

   Die Zusagen:
   1. EIN ORT. Erfasst wird auf der Karte, eine Ebene, fuenf Antworten.
   2. NUR WARNEN. Der Faktor senkt die Kapazitaet, nie hebt er sie.
   3. ES KLINGT AUS. Nach BESCHWERDE_TAGE zaehlt die Meldung nicht mehr.
   4. EINE FAERBUNG. Auch die grosse Karte malt die Gruen-Gelb-Rot-Skala.
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
function grabZeile(name){
  const i = src.indexOf("const " + name + " =");
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  return src.slice(i, src.indexOf("\n", i));
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("tagDifferenz"),
  grabZeile("BESCHWERDE_TAGE"),
  src.slice(src.indexOf("const BESCHWERDE_FAKTOR = {"), src.indexOf("};", src.indexOf("const BESCHWERDE_FAKTOR = {")) + 2),
  grabFn("beschwerdeSetzen"), grabFn("beschwerdeStand"),
  grabFn("beschwerdeFaktor"), grabFn("beschwerdeText"),
  "module.exports = { BESCHWERDE_TAGE, beschwerdeSetzen, beschwerdeStand, beschwerdeFaktor, beschwerdeText };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const HEUTE = "2026-08-10";

/* ---------- 1) Eintragen ---------- */
let liste = A.beschwerdeSetzen([], HEUTE, "quadriceps", "kater", 2);
pruefe("die Meldung landet in der Liste", liste.length === 1 && liste[0].wert === 2);
liste = A.beschwerdeSetzen(liste, HEUTE, "quadriceps", "kater", 1);
pruefe("dieselbe Art am selben Tag korrigiert statt zu verdoppeln",
  liste.length === 1 && liste[0].wert === 1);
liste = A.beschwerdeSetzen(liste, HEUTE, "quadriceps", "schmerz", 2);
pruefe("Schmerz und Kater sind getrennte Arten", liste.length === 2);
liste = A.beschwerdeSetzen(liste, HEUTE, "latissimus", "kater", 1);
pruefe("und je Muskel eigene Zeilen", liste.length === 3);
const geloescht = A.beschwerdeSetzen(liste, HEUTE, "quadriceps", "kater", 0);
pruefe("der Wert 0 loescht die Meldung", geloescht.length === 2);
pruefe("das Original bleibt unberuehrt", liste.length === 3);

/* ---------- 2) Ausklingen ---------- */
const alt = [{ datum:"2026-08-01", muskel:"abs", art:"kater", wert:3 }];
pruefe("eine alte Meldung zaehlt nicht mehr", A.beschwerdeStand(alt, "abs", "kater", HEUTE) === 0);
const frisch = [{ datum:"2026-08-08", muskel:"abs", art:"kater", wert:2 }];
pruefe("eine frische schon", A.beschwerdeStand(frisch, "abs", "kater", HEUTE) === 2);
pruefe("das Fenster ist genau BESCHWERDE_TAGE lang",
  A.beschwerdeStand([{ datum:"2026-08-06", muskel:"abs", art:"kater", wert:2 }], "abs", "kater", HEUTE) === 2 &&
  A.beschwerdeStand([{ datum:"2026-08-05", muskel:"abs", art:"kater", wert:2 }], "abs", "kater", HEUTE) === 0);
pruefe("der staerkste Wert im Fenster zaehlt",
  A.beschwerdeStand([{ datum:"2026-08-09", muskel:"abs", art:"kater", wert:1 },
                     { datum:"2026-08-08", muskel:"abs", art:"kater", wert:3 }], "abs", "kater", HEUTE) === 3);
pruefe("ein Datum in der Zukunft zaehlt nicht",
  A.beschwerdeStand([{ datum:"2026-08-20", muskel:"abs", art:"kater", wert:3 }], "abs", "kater", HEUTE) === 0);
pruefe("fremde Muskeln bleiben draussen", A.beschwerdeStand(frisch, "calves", "kater", HEUTE) === 0);

/* ---------- 3) Die Wirkung ---------- */
pruefe("ohne Meldung kein Effekt", A.beschwerdeFaktor([], "abs", HEUTE) === 1);
pruefe("ohne Liste auch nicht", A.beschwerdeFaktor(null, "abs", HEUTE) === 1);
const kater1 = A.beschwerdeFaktor([{ datum:HEUTE, muskel:"abs", art:"kater", wert:1 }], "abs", HEUTE);
const kater2 = A.beschwerdeFaktor([{ datum:HEUTE, muskel:"abs", art:"kater", wert:2 }], "abs", HEUTE);
pruefe("Muskelkater senkt die Kapazitaet", kater1 < 1 && kater2 < kater1);
const schmerz1 = A.beschwerdeFaktor([{ datum:HEUTE, muskel:"abs", art:"schmerz", wert:1 }], "abs", HEUTE);
const schmerz2 = A.beschwerdeFaktor([{ datum:HEUTE, muskel:"abs", art:"schmerz", wert:2 }], "abs", HEUTE);
pruefe("Schmerz wiegt schwerer als Kater", schmerz1 < kater1 && schmerz2 < kater2);
/* Die eine Richtung, die der Nutzer ausgeschlossen hat. */
pruefe("der Faktor geht NIE ueber 1",
  [[], [{ datum:HEUTE, muskel:"abs", art:"kater", wert:0 }],
   [{ datum:HEUTE, muskel:"abs", art:"schmerz", wert:99 }]]
    .every(l => A.beschwerdeFaktor(l, "abs", HEUTE) <= 1));
pruefe("und nicht ins Bodenlose", schmerz2 >= 0.7);
pruefe("bei beidem gilt das staerkere Signal",
  A.beschwerdeFaktor([{ datum:HEUTE, muskel:"abs", art:"kater", wert:1 },
                      { datum:HEUTE, muskel:"abs", art:"schmerz", wert:2 }], "abs", HEUTE) === schmerz2);

/* ---------- 4) Der Satz dazu ---------- */
pruefe("ohne Meldung kein Satz", A.beschwerdeText([], "abs", HEUTE) === "");
const txtSchmerz = A.beschwerdeText([{ datum:HEUTE, muskel:"abs", art:"schmerz", wert:2 }], "abs", HEUTE);
pruefe("starker Schmerz sagt: nicht trainieren", txtSchmerz.indexOf("nicht trainieren") > 0);
pruefe("und verweist an den Arzt, ohne zu diagnostizieren",
  txtSchmerz.indexOf("Arzt") > 0 && !/Verletzung|Riss|Entzündung/.test(txtSchmerz));
pruefe("Schmerz hat Vorrang vor Kater im Text",
  A.beschwerdeText([{ datum:HEUTE, muskel:"abs", art:"kater", wert:2 },
                    { datum:HEUTE, muskel:"abs", art:"schmerz", wert:1 }], "abs", HEUTE).indexOf("Schmerzen") > 0);

/* ---------- 5) Verdrahtung: Erfassung ---------- */
pruefe("der dritte Tab steht in der Karte", src.includes('id="muskel-modus-wohl"'));
pruefe("er schaltet den Modus", src.includes("muskelModus('wohl')"));
pruefe("der Modus faerbt die Knoepfe mit", grabFn("muskelModusAnwenden").includes('m === "wohl"'));
const tippen = grabFn("muskelTippen");
pruefe("ein Tipp im Modus fragt nach", tippen.includes('muskelStatus.modus === "wohl"') && tippen.includes("beschwerdeFragen(key)"));
const fragen = grabFn("beschwerdeFragen");
pruefe("es gibt fuenf Antworten auf einer Ebene",
  (fragen.match(/\{ text:/g) || []).length === 5);
pruefe("Alles gut loescht BEIDE Arten",
  fragen.includes('beschwerdeSetzen(d.beschwerden, heute, key, "kater", 0)') &&
  fragen.includes('beschwerdeSetzen(d.beschwerden, heute, key, "schmerz", 0)'));
pruefe("gespeichert wird sofort", fragen.includes("speichern()"));
pruefe("und alles Abgeleitete zieht mit", fragen.includes("fortschrittNeuZeichnen()"));
pruefe("der Datenvertrag ist additiv",
  grabFn("datenNachruesten").includes("if(!Array.isArray(daten.beschwerden)) daten.beschwerden = []"));

/* ---------- 6) Verdrahtung: Rechnung ---------- */
pruefe("die Kapazitaet kennt den Faktor",
  grabFn("muskelKapazitaet").includes("beschwerdeFaktor(beschwerden, muskel, heute)"));
/* Ein gemeldeter Muskel OHNE Last muss trotzdem auftauchen — sonst bliebe er
   gruen, obwohl gerade gemeldet wurde, dass er wehtut. */
pruefe("ein gemeldeter Muskel ohne Last kommt dazu",
  grabFn("muskelAuslastung").includes("beschwerdeFaktor(beschwerden, e.muskel, heute) < 1"));
pruefe("alle drei Aufrufer reichen die Beschwerden durch",
  (src.match(/sitzung\.daten\.tageswerte, sitzung\.daten\.beschwerden\)/g) || []).length === 3);
pruefe("die Detail-Karte nennt den Grund", grabFn("muskelAuswahlZeichnen").includes("beschwerdeText("));
pruefe("die Statuszeile erklaert den Modus", grabFn("muskelStatusText").includes('muskelStatus.modus === "wohl"'));

/* ---------- 7) Verdrahtung: eine Faerbung ---------- */
pruefe("die grosse Karte malt die Auslastung",
  src.includes('if(muskelStatus.modus === "erkunden") muskelMalen(a); else muskelLastZeichnen(a);'));
const gross = grabFn("muskelLastZeichnen");
pruefe("und zwar den ganzen Koerper", gross.includes("MUSKEL_ORDER, 205, [], quoten"));
pruefe("mit derselben Mal-Funktion wie ueberall", gross.includes("muskelnAufCanvas("));
pruefe("die Legende ist dieselbe wie in der Statistik",
  grabFn("muskelLegendeZeichnen").includes("lastLegendeHtml()"));
pruefe("und steht in beiden Auslastungs-Modi",
  grabFn("muskelModusAnwenden").includes('leg.hidden = (m === "erkunden")'));

/* ---------- 8) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("APP_VERSION passt zu VERSION", (() => {
  const [, mi, pa] = /const VERSION = "([\d.]+)";/.exec(src)[1].split(".");
  return Number(/const APP_VERSION = (\d+);/.exec(src)[1]) === Number(mi) * 1000 + Number(pa);
})());
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.228.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
