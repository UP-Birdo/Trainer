/* 0.248.0-Test: Wiederholungen zaehlen mit, Gut zu wissen klappt, das "i"
   oeffnet eine eigene Ansicht.

   Die Zusagen:
   1. JEDE WIEDERHOLUNG ZAEHLT — aber nur, wo sie etwas aussagt. Bis
      WDH_SATZ_BAND bleibt der Faktor exakt 1 (die Eichung der Kapazitaeten und
      jeder alte Datenstand bleiben unberuehrt); darueber zaehlt jede Wdh
      anteilig, der sehr lange ununterbrochene Satz bekommt hoechstens 10 %
      Zuschlag, und ein Deckel faengt Tippfehler ab.
      Der Nutzer-Fall: 1 x 100 Wdh muss MEHR wiegen als 5 x 20 Wdh.
   2. `satzGewichtung` nimmt den Faktor auf, ohne eine der v161/v189-Zusagen zu
      brechen (Note, relative Intensitaet, Pause bleiben Wert fuer Wert).
   3. GUT ZU WISSEN ist eine Klapp-Liste: nur Ueberschriften, genau EINE offen,
      eine andere zu oeffnen schliesst die vorige. Ein Index haelt den Zustand.
   4. DAS "i" OEFFNET `view-lernen` — eigene Ansicht mit Zurueck-Knopf, die
      sich den Rueckweg merkt.
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

/* 0.249: Der Faktor ist generisch geworden (`umfangFaktor`, gilt auch fuer
   Zeit-Saetze — test249). Die 0.248-Zusagen hier gelten Wert fuer Wert weiter;
   nur die Konstanten-Namen sind mitgezogen. */
const modul = { exports: {} };
new Function("module", "exports", [
  grabZahl("WDH_SATZ_BAND"), grabZahl("ZEIT_SATZ_BAND"),
  grabZahl("UMFANG_LANG_BONUS"), grabZahl("UMFANG_FAKTOR_MAX"),
  grabBlock("NOTE_GEWICHT", "{", "}"), grabBlock("PAUSE_STUFEN", "[", "]"),
  grabFn("umfangFaktor"), grabFn("wdhFaktor"), grabFn("zeitFaktor"),
  grabFn("satzUmfangFaktor"), grabFn("pauseFaktor"), grabFn("satzGewichtung"),
  "module.exports = { wdhFaktor, satzGewichtung, WDH_SATZ_BAND, WDH_FAKTOR_MAX: UMFANG_FAKTOR_MAX };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Der Wiederholungs-Faktor ---------- */
pruefe("im ueblichen Band bleibt alles beim Alten",
  T.wdhFaktor(1) === 1 && T.wdhFaktor(8) === 1 && T.wdhFaktor(12) === 1 &&
  T.wdhFaktor(T.WDH_SATZ_BAND) === 1);
pruefe("kein Wert, kein Effekt",
  T.wdhFaktor(undefined) === 1 && T.wdhFaktor(null) === 1 && T.wdhFaktor(0) === 1 &&
  T.wdhFaktor(-5) === 1 && T.wdhFaktor("keine Zahl") === 1);
pruefe("knapp ueber dem Band zaehlt jede Wdh weiter",
  T.wdhFaktor(21) === 1.05 && T.wdhFaktor(30) === 1.5 && T.wdhFaktor(40) === 2);
pruefe("erst der SEHR lange Satz bekommt den Zuschlag",
  T.wdhFaktor(40) === 2 && T.wdhFaktor(41) > 41 / T.WDH_SATZ_BAND);
pruefe("der Zuschlag bleibt bei hoechstens 10 Prozent",
  T.wdhFaktor(60) <= 60 / T.WDH_SATZ_BAND * 1.1 + 0.001 &&
  T.wdhFaktor(60) >= 60 / T.WDH_SATZ_BAND * 1.1 - 0.001);
pruefe("ein Tippfehler kann das Modell nicht sprengen",
  T.wdhFaktor(9999) === T.WDH_FAKTOR_MAX && T.wdhFaktor(500) === T.WDH_FAKTOR_MAX);
pruefe("der Faktor waechst nie rueckwaerts",
  [1, 10, 20, 21, 30, 50, 100, 300].every((n, i, a) =>
    i === 0 || T.wdhFaktor(n) >= T.wdhFaktor(a[i - 1])));

/* ---------- 2) Der Fall des Nutzers ---------- */
{
  const satz = (wdh) => ({ note:3, wdh });
  const einer = T.satzGewichtung(satz(100), 0);
  const fuenf = 5 * T.satzGewichtung(satz(20), 0);
  pruefe("ein Satz mit 100 Wdh wiegt mehr als fuenf mit je 20",
    einer > fuenf);
  pruefe("und beides liegt in einer plausiblen Groessenordnung",
    einer > 5 && einer < 7 && fuenf === 5);
  /* Oberhalb des Bandes zaehlt die Rechnung die Wiederholungen anteilig — zwei
     Saetze zu 50 sind damit genau so viel wie einer zu 100. Das ist gewollt:
     Der Zuschlag gilt der LAENGE des Satzes, und beide sind lang. */
  pruefe("oberhalb des Bandes zaehlt die reine Wiederholungszahl",
    2 * T.satzGewichtung(satz(50), 0) === einer);
  pruefe("acht Wiederholungen bleiben ein Satz",
    T.satzGewichtung(satz(8), 0) === 1 && T.satzGewichtung(satz(20), 0) === 1);
}

/* ---------- 3) Die alten Zusagen stehen ---------- */
{
  const satz = (o) => Object.assign({ name:"x" }, o);
  pruefe("v161: die Note bleibt Wert fuer Wert",
    T.satzGewichtung(satz({ note:1 }), 0) === 0.5 &&
    T.satzGewichtung(satz({ note:3 }), 0) === 1 &&
    T.satzGewichtung(satz({ note:5 }), 0) === 1.3);
  pruefe("v161: die relative Intensitaet bleibt",
    T.satzGewichtung(satz({ gewicht:40 }), 80) === 0.8);
  pruefe("v189: die Pause bleibt",
    T.satzGewichtung(satz({ note:3, pause:30 }), 0) === 1.1 &&
    T.satzGewichtung(satz({ note:3, pause:300 }), 0) === 0.95);
  pruefe("alle drei Faktoren wirken zusammen",
    T.satzGewichtung(satz({ note:5, pause:30, wdh:40 }), 0) === 2.86);   // 1.3 * 1.1 * 2
  pruefe("eine Zeit-Uebung ohne wdh bleibt unveraendert",
    T.satzGewichtung(satz({ note:3, dauer:90 }), 0) === 1);
}
// 0.249: der Umfang laeuft ueber satzUmfangFaktor (auch Zeit-Saetze, test249).
pruefe("die Last-Rechnungen ziehen den Faktor ueber satzGewichtung mit",
  grabFn("satzGewichtung").includes("satzUmfangFaktor(satz)") &&
  grabFn("muskelLast").includes("satzGewichtung(s, maxGew[s.name] || 0)") &&
  grabFn("muskelLastAbklingend").includes("satzGewichtung(s, maxGew[s.name] || 0)"));

/* ---------- 4) Gut zu wissen klappt ---------- */
pruefe("die Abschnitte sind ein Register, kein Fliesstext",
  /function wissenAbschnitte\(\)/.test(src) &&
  grabFn("wissenAbschnitte").includes("return ["));
{
  const zeichnen = grabFn("wissenZeichnen");
  pruefe("gezeichnet werden Ueberschriften als Knoepfe",
    zeichnen.includes("wissen-kopf") && zeichnen.includes("wissenUmschalten(") &&
    zeichnen.includes("aria-expanded="));
  pruefe("der Inhalt kommt NUR beim offenen Abschnitt",
    /offen \?[\s\S]*a\.zeilen\.map/.test(zeichnen));
  pruefe("der Zustand haengt an genau EINEM Index (also nie zwei offen)",
    zeichnen.includes("wissenOffen === i") &&
    grabFn("wissenUmschalten").includes("wissenOffen = wissenOffen === i ? -1 : i"));
  pruefe("beim Oeffnen der Ansicht ist alles zu",
    grabFn("wissenOeffnen").includes("wissenOffen = -1"));
}
pruefe("die Ueberschrift hat ihr CSS als volle Zeile", src.includes(".wissen-kopf{"));

/* ---------- 5) Veraltetes ist raus ---------- */
{
  const wissen = grabFn("wissenAbschnitte");
  pruefe("das laengst entfernte Feld Getan wird nicht mehr erklaert",
    !wissen.includes("„Getan“ hält auf den einfachen Stufen"));
  pruefe("stattdessen steht dort der Haken an der Zeile",
    wissen.includes("Haken an der Zeile"));
  pruefe("Drills steigern sich nicht mehr ueber die abgeschaffte Bewertung",
    !wissen.includes("Drills steigern sich über die Bewertung"));
}

/* ---------- 6) Das "i" oeffnet eine eigene Ansicht ---------- */
pruefe("es gibt die Ansicht mit Zurueck-Knopf",
  src.includes('<section id="view-lernen"') &&
  /id="view-lernen"[\s\S]{0,400}onclick="lernenSchliessen\(\)"[^>]*data-zurueck/.test(src));
pruefe("sie ist ab dem Training erlaubt (reine Auskunft, Leitplanke 8)",
  /"view-lernen": "training"/.test(src));
pruefe("die Navigation kennt sie", src.includes('"view-lernen":"nav-statistik"'));
{
  const auf = grabFn("lernenOeffnen");
  pruefe("sie merkt sich den Rueckweg", auf.includes('lernenZurueck = zurueck || "view-muskeln"'));
  pruefe("sie zeigt beide Teile",
    auf.includes("Womit die App gerade rechnet") && auf.includes("lernenInfoZeilen()"));
  pruefe("und wird wirklich gezeigt", auf.includes('zeige("view-lernen")'));
  pruefe("zurueck geht dorthin, wo man herkam",
    grabFn("lernenSchliessen").includes("zeige(lernenZurueck)"));
}
pruefe("der alte Aufklapp-Weg ist restlos abgebaut",
  !src.includes("lernenInfoKnopfHtml") && !src.includes("lernenInfoHtml") &&
  !src.includes('id="info-lernen"'));

/* ---------- 7) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.248.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 248000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.248.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
