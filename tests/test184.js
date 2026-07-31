/* v184-Test: Die Muskelkarte sagt, was sie NICHT zaehlen kann.

   Der Befund aus dem dritten Persona-Durchgang (reine Ausdauer-Sportlerin):
   Ueber jeden Muskel stand „diese Woche noch nicht trainiert", obwohl sie
   dreimal gelaufen war. Zwei Zusagen stehen hier im Mittelpunkt:

   1. EIGENE AUSSAGE, KEIN FAKTOR — genau wie v161/v168/v176/v177 darf die
      Einordnung die Auslastungs-Rechnung nicht anfassen. Ein Lauf wird NICHT
      in Saetze umgerechnet (das waere die erfundene Genauigkeit, die v160 bei
      Koerpergewicht und BMI abgelehnt hat).
   2. GEMESSENE Saetze sind das Kriterium — nicht „hat ueberhaupt Saetze".
      Damit deckt die eine Zeile auch die Soll-Eintraege aus v158 („Erledigt",
      der Haken aus v174) ab, die ebenfalls nicht in die Quote eingehen.

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
/** v197: ein mehrzeiliges Objekt-Literal holen (fuer SPORT_LAST_MUSKELN). */
function grabLiteralV197(name){
  const decl = "const " + name + " = ";
  const i = src.indexOf(decl);
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  let start = i + decl.length;
  while(start < src.length && src[start] !== "{" && src[start] !== "[") start++;
  const auf = src[start], zu = auf === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const HEUTE = "2026-07-27";
const modul = { exports: {} };
new Function("module", "exports", [
  // Die Sportart-Namen kommen aus SPORTARTEN; hier reicht ein schlanker Ersatz,
  // die Zuordnung selbst prueft test145/test150.
  "const NAMEN = { laufen:'Laufen', schwimmen:'Schwimmen', kraft:'Krafttraining' };",
  "function sportartName(id){ return NAMEN[id]; }",
  grabConst("MUSKEL_HEAT_TAGE"),
  grabFn("tagDifferenz"),
  grabFn("echteSaetze"),
  /* v197: Ausdauer-Einheiten zaehlen jetzt ueber ihre Dauer mit — sie gehoeren
     damit NICHT mehr in die v184-Zeile. Die echten Funktionen werden mitgezogen,
     damit dieser Test die neue Grenze wirklich prueft (unten ergaenzt). */
  grabFn("istSollEintrag"),
  "const SPORT_LAST_MUSKELN = " + grabLiteralV197("SPORT_LAST_MUSKELN") + ";",
  "const AKTIVITAET_MINUTEN_JE_SATZ = 10, AKTIVITAET_MAX_SAETZE = 6;",
  grabFn("aktivitaetSaetze"),
  grabFn("alsEinheitZaehlbar"),
  grabFn("satzloseEinheiten"),
  grabFn("satzloseText"),
  "module.exports = { MUSKEL_HEAT_TAGE, satzloseEinheiten, satzloseText };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/** Ein Tag, `d` Tage vor HEUTE. */
function tag(d){ return new Date(Date.UTC(2026, 6, 27 - d)).toISOString().slice(0, 10); }
/** Eine Aktivitaet (Lauf o. ae.): Eintrag ohne jeden Satz. */
function lauf(d, sport){ return { datum: tag(d), sportart: sport || "laufen", typ:"aktivitaet", saetze:[] }; }
/** Ein echtes Krafttraining: gemessene Saetze. */
function kraft(d){
  return { datum: tag(d), sportart:"kraft", typ:"kraft",
           saetze:[{ name:"LH-Bankdrücken", wdh:8, gewicht:60 }] };
}
/** Ein „Erledigt"-Eintrag (v158) bzw. ein Haken (v174): nur Sollwerte. */
function soll(d){
  return { datum: tag(d), sportart:"kraft", typ:"kraft",
           saetze:[{ name:"LH-Bankdrücken", wdh:8, gewicht:60, soll:true }] };
}

/* ---------- 1) satzloseEinheiten — was gezaehlt wird ---------- */
pruefe("ohne Protokoll nichts zu sagen",
  A.satzloseEinheiten([], HEUTE).anzahl === 0 &&
  A.satzloseEinheiten(null, HEUTE).anzahl === 0 &&
  A.satzloseEinheiten(undefined, HEUTE).anzahl === 0);
pruefe("ein Lauf zaehlt", A.satzloseEinheiten([lauf(0)], HEUTE).anzahl === 1);
pruefe("drei Laeufe zaehlen drei",
  A.satzloseEinheiten([lauf(0), lauf(2), lauf(4)], HEUTE).anzahl === 3);
pruefe("ein echtes Krafttraining zaehlt NICHT mit",
  A.satzloseEinheiten([kraft(1)], HEUTE).anzahl === 0);
pruefe("gemischt wird nur die Aktivitaet gezaehlt",
  A.satzloseEinheiten([kraft(1), lauf(2), kraft(3)], HEUTE).anzahl === 1);

/* Das Kriterium ist GEMESSEN, nicht „hat Saetze" — sonst waere die v158-Luecke
   weiter unsichtbar. */
pruefe("ein Erledigt-Eintrag zaehlt mit (nur Sollwerte)",
  A.satzloseEinheiten([soll(1)], HEUTE).anzahl === 1);
pruefe("ein Eintrag mit soll:false gilt als gemessen", (() => {
  const e = kraft(1); e.saetze[0].soll = false;
  return A.satzloseEinheiten([e], HEUTE).anzahl === 0;
})());
pruefe("ein Eintrag mit gemischten Saetzen gilt als gemessen", (() => {
  const e = kraft(1); e.saetze.push({ name:"Kniebeuge", wdh:10, soll:true });
  return A.satzloseEinheiten([e], HEUTE).anzahl === 0;
})());

/* ---------- 2) Das Fenster ---------- */
pruefe("das Fenster ist dasselbe wie bei der Last", A.MUSKEL_HEAT_TAGE === 7);
pruefe("heute liegt drin", A.satzloseEinheiten([lauf(0)], HEUTE).anzahl === 1);
pruefe("der Rand liegt drin", A.satzloseEinheiten([lauf(7)], HEUTE).anzahl === 1);
pruefe("davor liegt draussen", A.satzloseEinheiten([lauf(8)], HEUTE).anzahl === 0);
pruefe("alte Laeufe ziehen die Zahl nicht hoch",
  A.satzloseEinheiten([lauf(1), lauf(30), lauf(90)], HEUTE).anzahl === 1);
pruefe("die Zukunft zaehlt nicht", A.satzloseEinheiten([lauf(-3)], HEUTE).anzahl === 0);
pruefe("ein eigenes Fenster wird beachtet",
  A.satzloseEinheiten([lauf(10)], HEUTE, 14).anzahl === 1);

/* ---------- 3) Die Sportarten ---------- */
pruefe("die Sportart wird gemerkt",
  A.satzloseEinheiten([lauf(0)], HEUTE).sportarten.join() === "laufen");
pruefe("dieselbe Sportart steht nur einmal drin",
  A.satzloseEinheiten([lauf(0), lauf(1), lauf(2)], HEUTE).sportarten.length === 1);
pruefe("zwei Sportarten in der Reihenfolge des ersten Auftretens",
  A.satzloseEinheiten([lauf(0, "laufen"), lauf(1, "schwimmen")], HEUTE)
    .sportarten.join() === "laufen,schwimmen");
pruefe("ein Eintrag ohne Sportart zaehlt, nennt aber keine", (() => {
  const e = lauf(0); delete e.sportart;
  const i = A.satzloseEinheiten([e], HEUTE);
  return i.anzahl === 1 && i.sportarten.length === 0;
})());
pruefe("kaputte Eintraege werfen nicht", (() => {
  try {
    return A.satzloseEinheiten([null, undefined, {}, { saetze:null }, lauf(1)], HEUTE).anzahl === 1;
  } catch(e){ return false; }
})());
pruefe("das Protokoll wird nicht angefasst (rein)", (() => {
  const p = [lauf(1), kraft(2)], vorher = JSON.stringify(p);
  A.satzloseEinheiten(p, HEUTE);
  return JSON.stringify(p) === vorher;
})());

/* ---------- 4) satzloseText ---------- */
pruefe("ohne Einordnung kein Text",
  A.satzloseText(null) === "" && A.satzloseText(undefined) === "" &&
  A.satzloseText({ anzahl:0, sportarten:[] }) === "");
const t1 = A.satzloseText(A.satzloseEinheiten([lauf(0)], HEUTE));
const t3 = A.satzloseText(A.satzloseEinheiten([lauf(0), lauf(1), lauf(2)], HEUTE));
pruefe("die Einzahl stimmt durchgehend",
  t1.includes("1 Einheit ") && t1.includes(" zählt ") && t1.includes("steht sie"));
pruefe("die Mehrzahl stimmt durchgehend",
  t3.includes("3 Einheiten") && t3.includes(" zählen ") && t3.includes("stehen sie"));
pruefe("die Sportart wird genannt", t3.includes("(Laufen)"));
pruefe("zwei Sportarten werden aufgezaehlt",
  A.satzloseText(A.satzloseEinheiten([lauf(0, "laufen"), lauf(1, "schwimmen")], HEUTE))
    .includes("(Laufen, Schwimmen)"));
pruefe("eine unbekannte Sportart erzeugt keine Luecke im Text", (() => {
  const s = A.satzloseText(A.satzloseEinheiten([lauf(0, "quidditch")], HEUTE));
  return s.includes("1 Einheit dieser Woche zählt") && !s.includes("()") && !s.includes("undefined");
})());
pruefe("der Text sagt, WORAUF die Karte rechnet", t3.includes("gemessenen Sätzen"));
pruefe("und wohin die Einheiten stattdessen gehoeren",
  t3.includes("Kalender") && t3.includes("Verlauf"));
pruefe("er warnt nicht und wertet nicht",
  !/zu viel|Warnung|Vorsicht|solltest/i.test(t3));

/* ---------- 5) Eigene Aussage, KEIN Faktor (wie v161/v168/v176/v177) ---------- */
["muskelLast", "muskelAuslastung", "muskelKapazitaet", "kapazitaetsFaktor",
 "auslastungStufe", "auslastungText", "auslastungsQuoten"].forEach(fn =>
  pruefe(fn + " weiss nichts von der Einordnung",
    !/satzlose/.test(grabFn(fn))));
pruefe("die Einordnung rechnet selbst keine Saetze aus einem Lauf",
  !/uebungMuskeln|kapazitaet|quote/.test(grabFn("satzloseEinheiten")));

/* ---------- 6) Verdrahtung ---------- */
const grundlagen = grabFn("grundlagenZeileHtml");
pruefe("die Grundlagen-Zeile holt die Einordnung",
  grundlagen.includes("satzloseText(satzloseEinheiten("));
pruefe("sie steht weiterhin auf derselben Quelle wie v167",
  grundlagen.includes("rechnungsGrundlage(") && grundlagen.includes("grundlageText("));
pruefe("eine stumme Einordnung erzeugt keine leere Zeile",
  /einordnung \?/.test(grundlagen));
/* Beide Zeilen sehen gleich aus und werden gleich escapet — das gehoert an EINE
   Stelle, sonst driftet die zweite irgendwann von der ersten weg. */
pruefe("beide Zeilen laufen durch dieselbe escapende Stelle",
  /const zeile = s =>[\s\S]*text\(s\)/.test(grundlagen) &&
  grundlagen.includes("zeile(grundlageText(g))") &&
  grundlagen.includes("zeile(einordnung)"));

const status = grabFn("muskelStatusText");
pruefe("ohne gemessene Saetze erklaert die Statuszeile keine Farbe",
  status.includes("bleibt die Karte grau"));
pruefe("dieser Fall haengt an der leeren Auslastung",
  /Object\.keys\(alle\)\.length === 0/.test(status));
pruefe("die alte Farb-Erklaerung bleibt fuer den Normalfall",
  status.includes("Farbe = wie oft zuletzt trainiert"));
pruefe("die Warnung hat weiter Vorrang vor beidem",
  status.indexOf("Über dem Richtwert") < status.indexOf("bleibt die Karte grau"));
pruefe("Nutzertext in der Statuszeile wird weiter escapet",
  status.includes("el.innerHTML = text("));
/* v177 wollte, dass eine neue Aussage KEINEN weiteren Aufruf an beiden Stellen
   kostet — die Einordnung haengt darum an der Grundlagen-Zeile. */
pruefe("das Hinweis-Register bleibt bei genau zwei Aufrufen",
  (status.match(/belastungsHinweiseHtml\(\)/g) || []).length === 2);
pruefe("die Einordnung steht NICHT zusaetzlich im Register",
  !/satzlose/.test(src.slice(src.indexOf("const BELASTUNGS_HINWEISE"),
                             src.indexOf("function belastungsHinweiseHtml"))));

/* ---------- 7) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v184",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 184);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.184", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
