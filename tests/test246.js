/* 0.246.0-Test: "Wie die App von dir lernt" + Gut zu wissen aufgefrischt.

   Die Zusagen:
   1. EIN TEXT, DREI AUFTRITTE. Der Lern-Text steht als Register LERNEN_INFO
      genau einmal; die drei Stellen (i an der Grundlagen-Zeile, i an der
      Phasen-Karte, Abschnitt in "Gut zu wissen") bauen ihn NICHT selbst
      zusammen, sondern holen ihn ueber lernenInfoZeilen/-Html.
   2. NACH ZEITPUNKTEN GEORDNET, und die Kette ist vollstaendig: sofort,
      nach jedem Training, erste zehn, Woche fuer Woche, Monate, Ausdauer,
      lange Pause, immer weniger Fragen, was fest bleibt, was der Nutzer tut.
   3. KEINE RECHENWERTE nach aussen (0.234-Regel): keine Faktoren, keine
      Prozent-Deckel, keine internen Schwellen im Nutzer-Text.
   4. JE AUFTRITT EIGENE id — sonst schaltet ein "i" den falschen Block auf.
   5. GUT ZU WISSEN ist wieder wahr: die abgeschafften Handnoten 1-5 sind raus,
      der Abbruch verliert nichts mehr, die Muskelkarte ist erklaert.
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
  grabBlock("LERNEN_INFO", "[", "]"),
  // 0.247: die Beschriftung laeuft durch die Escape-Stelle der App.
  "function text(s){ return String(s).replace(/[&<>\"']/g, z => " +
    "({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[z])); }",
  grabFn("lernenInfoZeilen"),
  grabFn("lernenKnopfHtml"),
  "module.exports = { LERNEN_INFO, lernenInfoZeilen, lernenKnopfHtml };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Das Register ist vollstaendig und sauber ---------- */
pruefe("es gibt genug Zeitpunkte, um die Frage wirklich zu beantworten",
  T.LERNEN_INFO.length >= 8);
pruefe("jeder Eintrag hat Zeitpunkt UND Erklaerung",
  T.LERNEN_INFO.every(p => p && typeof p.wann === "string" && p.wann.length > 2 &&
                           typeof p.was === "string" && p.was.length > 40));
pruefe("kein Zeitpunkt kommt doppelt",
  new Set(T.LERNEN_INFO.map(p => p.wann)).size === T.LERNEN_INFO.length);
{
  const alles = T.LERNEN_INFO.map(p => p.wann + " " + p.was).join(" ");
  const muss = ["Sofort", "Nach jedem Training", "ersten zehn", "Woche fuer Woche",
                "Ueber Monate", "Ausdauer", "lange", "weniger Fragen"];
  // Umlaute im Test-Label vermeiden, im Quelltext stehen sie natuerlich richtig.
  const vorhanden = s => alles.includes(s.replace(/ue/g, "ü").replace(/Ue/g, "Ü"));
  muss.forEach(s => pruefe("der Zeitpunkt fehlt nicht: " + s, vorhanden(s) || alles.includes(s)));
  pruefe("die festen Leitplanken werden ehrlich genannt",
    alles.includes("NICHT mitwächst") && alles.includes("belegt"));
  pruefe("und was der Nutzer selbst tun muss",
    alles.includes("ehrlich antworten") && alles.includes("Grundlagen-Zeile"));

  /* 0.234-Regel: nach aussen Lagen, keine Rechenwerte. Zeitangaben ("zehn
     Trainings", "drei Monaten") sind erlaubt — Faktoren und Prozent-Deckel
     nicht, die gehoeren ins Innenleben. */
  pruefe("kein Prozentwert im Nutzer-Text", !/\d\s*(%|Prozent)/.test(alles));
  pruefe("kein Faktor mit Komma im Nutzer-Text", !/\b\d+,\d+\b/.test(alles));
  pruefe("keine internen Schwellen im Nutzer-Text",
    !alles.includes("1,3") && !alles.includes("Quote") && !alles.includes("Faktor"));
}

/* ---------- 2) EINE Quelle, drei Auftritte ---------- */
pruefe("die Zeilen kommen aus dem Register",
  T.lernenInfoZeilen().length === T.LERNEN_INFO.length &&
  T.lernenInfoZeilen()[0].includes(T.LERNEN_INFO[0].was));
/* 0.248: Statt eines Aufklapp-Blocks je Auftritt fuehrt das "i" jetzt in die
   eigene Ansicht `view-lernen` — der Inhalt entsteht dort EINMAL (test248). */
{
  const a = T.lernenKnopfHtml(null, "view-muskeln");
  const b = T.lernenKnopfHtml(null, "view-ergebnis");
  pruefe("das i fuehrt in die Lern-Ansicht und merkt sich den Rueckweg",
    a.includes("lernenOeffnen('view-muskeln')") &&
    b.includes("lernenOeffnen('view-ergebnis')"));
  pruefe("der Knopf ist beschriftet (ein nacktes i faende niemand)",
    a.includes("Wie die App von dir lernt") && a.includes('aria-label='));
  pruefe("er klappt nichts mehr auf", !a.includes("infoUmschalten") && !a.includes("hidden"));
}
pruefe("die Muskelkarte haengt ihn an die Grundlagen-Zeile",
  grabFn("grundlagenZeileHtml").includes('lernenKnopfHtml(grundlageKurz(g), "view-muskeln")'));
pruefe("die Phasen-Karte nach dem Training fuehrt zurueck aufs Ergebnis",
  grabFn("kalibrierungsKarteHtml").includes('lernenKnopfHtml(null, "view-ergebnis")'));
{
  const wissen = grabFn("wissenAbschnitte");
  pruefe("Gut zu wissen baut den Text NICHT selbst zusammen",
    wissen.includes('abschnitt("Wie die App von dir lernt", lernenInfoZeilen())'));
  pruefe("und die Lern-Ansicht ebenso wenig",
    grabFn("lernenOeffnen").includes("lernenInfoZeilen()"));
}

/* ---------- 3) Gut zu wissen ist wieder wahr ---------- */
{
  const wissen = grabFn("wissenAbschnitte");
  pruefe("die abgeschaffte Handnote steht nicht mehr im Regelwerk",
    !wissen.includes("bewertest du jede Übung von 1 bis 5") &&
    !wissen.includes("1 = viel zu leicht") && !wissen.includes("5 = nicht geschafft"));
  pruefe("stattdessen wird der echte Weg erklaert",
    wissen.includes("Du bewertest nichts mehr selbst") &&
    wissen.includes("liest die App an deinen Sätzen ab"));
  pruefe("die Muskel-Antworten bremsen nur",
    wissen.includes("bremsen, nie beschleunigen"));
  pruefe("was den Plan nicht anfasst, steht dabei",
    wissen.includes("Was den Plan NICHT anfasst"));
  pruefe("der Abbruch verliert nichts mehr (v220 nachgezogen)",
    !wissen.includes("Abbrechen verwirft das Training komplett") &&
    wissen.includes("Abbrechen verliert nichts"));
  pruefe("die Muskelkarte ist erklaert",
    wissen.includes('abschnitt("Muskelkarte & Belastung"') &&
    wissen.includes("Grün = bereit, Gelb = benutzt, Rot = zu viel") &&
    wissen.includes("klingt aus"));
  pruefe("Double Progression und Deload sind geblieben",
    wissen.includes("Double Progression") && wissen.includes("Deload"));
}

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.246.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 246000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.246.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
