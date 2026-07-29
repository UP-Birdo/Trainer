/* v182-Test: Ein Training loeschen nimmt seine FOLGEN mit zurueck.

   Nutzer-Wunsch: „… Trainings-Einheiten loeschen im Nachhinein, mitsamt all
   den Daten, die in dem Training gekommen sind — alles zurueck wie vor der
   Uebung, dem Training oder dem Plan." Dazu: im Kalender an einem Tag mit
   Training der Knopf „Training loeschen".

   Bis v181 verschwand nur der Protokoll-Eintrag; die Steigerung am Plan blieb.
   Geprueft wird:
   1. Der Schnappschuss wird VOR den Aenderungen genommen — und der FRUEHESTE
      zaehlt (eine Aktivitaet mit Uebungen laeuft durch beide Aufnahmestellen).
   2. Zurueckgenommen wird nur der JUENGSTE Eintrag eines Plans.
   3. Rueckgaengig stellt Eintrag UND Plan wieder her.
   4. Der Dialog sagt vorher, was passiert — in beiden Faellen.
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
  "const sitzung = { daten: { protokoll: [], plaene: [] } };",
  grabFn("planSchnappschuss"),
  grabFn("planStandMerken"),
  grabFn("letzterAmPlan"),
  grabFn("folgenZuruecknehmbar"),
  grabFn("folgenZurueck"),
  grabFn("folgenWieder"),
  grabFn("folgenSatz"),
  "module.exports = { sitzung, planSchnappschuss, planStandMerken, letzterAmPlan," +
  " folgenZuruecknehmbar, folgenZurueck, folgenWieder, folgenSatz };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const plan = () => ({ id:"p1", name:"Ganzkörper",
  uebungen:[{ id:"u1", name:"Bankdrücken", wdh:8, gewicht:60, notenHistorie:[] }] });
function neuStand(){
  A.sitzung.daten.plaene = [plan()];
  A.sitzung.daten.protokoll = [];
}

/* ---------- 1) Der Schnappschuss ---------- */
neuStand();
const e1 = { id:"e1", datum:"2026-07-01", planId:"p1" };
A.sitzung.daten.protokoll.push(e1);
A.planStandMerken(e1, A.sitzung.daten.plaene[0]);
pruefe("der Stand wird festgehalten", !!e1.planVorher);
pruefe("und ist eine echte Kopie, keine Referenz",
  e1.planVorher !== A.sitzung.daten.plaene[0]);
A.sitzung.daten.plaene[0].uebungen[0].gewicht = 65;
pruefe("spaetere Aenderungen wandern nicht mit", e1.planVorher.uebungen[0].gewicht === 60);
/* Der FRUEHESTE Stand zaehlt — sonst ueberschriebe die zweite Aufnahmestelle
   den echten Ausgangsstand. */
A.planStandMerken(e1, A.sitzung.daten.plaene[0]);
pruefe("ein zweiter Aufruf ueberschreibt NICHT", e1.planVorher.uebungen[0].gewicht === 60);
pruefe("ohne Plan passiert nichts",
  (() => { const x = { id:"x" }; A.planStandMerken(x, null); return !x.planVorher; })());
pruefe("ohne Eintrag faellt es nicht um",
  (() => { try { A.planStandMerken(null, plan()); return true; } catch(e){ return false; } })());

/* Aeltere Abzuege desselben Plans fallen weg (Speicher). */
neuStand();
const a1 = { id:"a1", datum:"2026-07-01", planId:"p1" };
const a2 = { id:"a2", datum:"2026-07-08", planId:"p1" };
const fremd = { id:"f1", datum:"2026-07-02", planId:"p2" };
A.sitzung.daten.protokoll = [a1, fremd, a2];
A.planStandMerken(a1, A.sitzung.daten.plaene[0]);
A.planStandMerken(fremd, { id:"p2", uebungen:[] });
A.planStandMerken(a2, A.sitzung.daten.plaene[0]);
pruefe("nur der juengste Abzug desselben Plans bleibt", !a1.planVorher && !!a2.planVorher);
pruefe("ein anderer Plan bleibt unberuehrt", !!fremd.planVorher);

/* ---------- 2) Nur der juengste Eintrag ---------- */
neuStand();
const b1 = { id:"b1", datum:"2026-07-01", planId:"p1", planVorher: plan() };
const b2 = { id:"b2", datum:"2026-07-08", planId:"p1", planVorher: plan() };
A.sitzung.daten.protokoll = [b1, b2];
pruefe("der juengste kann zurueck", A.letzterAmPlan(A.sitzung.daten.protokoll, b2));
pruefe("der aeltere nicht", !A.letzterAmPlan(A.sitzung.daten.protokoll, b1));
pruefe("ohne Abzug gar nicht",
  !A.letzterAmPlan([{ id:"x", planId:"p1" }], { id:"x", planId:"p1" }));
pruefe("ohne Plan-Bezug auch nicht",
  !A.letzterAmPlan([{ id:"x", planVorher: plan() }], { id:"x", planVorher: plan() }));
pruefe("ein Eintrag, der nicht in der Liste steht, zaehlt nicht",
  !A.letzterAmPlan([b1], b2));
/* Ein spaeterer Eintrag OHNE Abzug (Erledigt-Haken, Nachtragen) hat den Plan
   nicht angefasst — er blockiert die Ruecknahme deshalb nicht. */
A.sitzung.daten.protokoll = [b2, { id:"c1", datum:"2026-07-09", planId:"p1" }];
pruefe("ein spaeterer Eintrag ohne Folgen blockiert nicht",
  A.letzterAmPlan(A.sitzung.daten.protokoll, b2));
pruefe("ein spaeterer eines ANDEREN Plans auch nicht",
  A.letzterAmPlan([b2, { id:"d1", datum:"2026-07-09", planId:"p2", planVorher: plan() }], b2));

/* ---------- 3) Zurueck und wieder ---------- */
neuStand();
const t = { id:"t1", datum:"2026-07-01", planId:"p1", planVorher: plan() };
A.sitzung.daten.protokoll = [t];
A.sitzung.daten.plaene[0].uebungen[0].gewicht = 65;   // die Steigerung des Trainings
A.sitzung.daten.plaene[0].uebungen[0].notenHistorie = [3];
const stand = A.folgenZurueck(t);
pruefe("der Plan geht auf den Stand davor zurueck",
  A.sitzung.daten.plaene[0].uebungen[0].gewicht === 60);
pruefe("auch die Notenhistorie",
  A.sitzung.daten.plaene[0].uebungen[0].notenHistorie.length === 0);
pruefe("und der Stand von JETZT kommt zurueck (fuer Rueckgaengig)",
  stand && stand.uebungen[0].gewicht === 65);
A.folgenWieder(stand);
pruefe("Rueckgaengig stellt die Steigerung wieder her",
  A.sitzung.daten.plaene[0].uebungen[0].gewicht === 65);
pruefe("und die Notenhistorie auch",
  A.sitzung.daten.plaene[0].uebungen[0].notenHistorie.length === 1);
pruefe("folgenWieder ohne Stand faellt nicht um",
  (() => { try { A.folgenWieder(null); return true; } catch(e){ return false; } })());
/* Gibt es den Plan nicht mehr, wird nichts angefasst. */
A.sitzung.daten.plaene = [];
pruefe("ohne Plan gibt es nichts zurueckzunehmen", A.folgenZurueck(t) === null);
pruefe("und folgenWieder legt keinen Plan neu an",
  (() => { A.folgenWieder(stand); return A.sitzung.daten.plaene.length === 0; })());

/* ---------- 4) Der Satz im Dialog ---------- */
neuStand();
const s1 = { id:"s1", datum:"2026-07-01", planId:"p1", planVorher: plan() };
const s2 = { id:"s2", datum:"2026-07-08", planId:"p1", planVorher: plan() };
pruefe("ohne Abzug steht gar nichts da",
  A.folgenSatz([], A.sitzung.daten.plaene, { id:"x" }) === "");
pruefe("beim juengsten wird die Ruecknahme versprochen",
  /geht dabei auf den Stand vor diesem Training zurück/.test(
    A.folgenSatz([s1, s2], A.sitzung.daten.plaene, s2)));
pruefe("beim aelteren wird ehrlich das Gegenteil gesagt",
  /Der Plan bleibt, wie er ist/.test(A.folgenSatz([s1, s2], A.sitzung.daten.plaene, s1)));
pruefe("die beiden Saetze sind verschieden",
  A.folgenSatz([s1, s2], A.sitzung.daten.plaene, s2) !==
  A.folgenSatz([s1, s2], A.sitzung.daten.plaene, s1));

/* ---------- 5) Die Aufnahmestellen ---------- */
const bewertung = grabFn("bewertungOeffnen");
pruefe("der Bewertungs-Trichter nimmt den Stand auf",
  /planStandMerken\(eintrag, sitzung\.daten\.plaene\.find\(p => p\.id === plan\.id\)\)/.test(bewertung));
pruefe("und zwar VOR dem Zeigen der Bewertung",
  bewertung.indexOf("planStandMerken") < bewertung.indexOf('zeige("view-bewertung")'));
const ablegen = grabFn("aktivitaetAblegen");
pruefe("die reine Aktivitaet nimmt ihn auch auf", /planStandMerken\(eintrag,/.test(ablegen));
pruefe("und zwar VOR zieleAnwenden (das hebt Strecke und Dauer)",
  ablegen.indexOf("planStandMerken") < ablegen.indexOf("zieleAnwenden(eintragPlan"));
pruefe("der echte Plan wird abgezogen, nicht die Kopie",
  /sitzung\.daten\.plaene\.find\(p => p\.id === eintragPlan\.id\)/.test(ablegen));

/* ---------- 6) Verdrahtung in den Loesch-Wegen ---------- */
const loeschen = grabFn("eintragLoeschen");
pruefe("das x im Verlauf nimmt die Folgen mit", /const planStand = folgenZurueck\(e\);/.test(loeschen));
pruefe("und zwar VOR dem Entfernen des Eintrags",
  loeschen.indexOf("folgenZurueck(e)") < loeschen.indexOf("protokoll.splice"));
pruefe("der Dialog kuendigt es an", /folgenSatz\(sitzung\.daten\.protokoll/.test(loeschen));
pruefe("Rueckgaengig holt beides zurueck",
  /folgenWieder\(planStand\)/.test(loeschen) && /protokoll\.push\(e\)/.test(loeschen));
pruefe("die Meldung sagt, dass mehr als der Eintrag weg ist",
  /Steigerung zurückgenommen/.test(loeschen));
/* Der Wisch-Weg (v175) darf sich nicht anders verhalten — er laeuft ueber das
   Register, damit er keine Liste beim Namen kennen muss. */
const einzeln = grabFn("listenEinzelLoeschen");
pruefe("der Wisch-Weg fragt das Register nach Folgen",
  /d\.folgenZurueck \? d\.folgenZurueck\(eintrag\) : null/.test(einzeln));
pruefe("und stellt sie beim Rueckgaengig wieder her",
  /if\(d\.folgenWieder\) d\.folgenWieder\(folgen\);/.test(einzeln));
pruefe("nur der Verlauf traegt die Folgen im Register",
  (src.match(/folgenZurueck: e => folgenZurueck\(e\)/g) || []).length === 1);

/* ---------- 7) Der Kalender-Weg ---------- */
const tag = grabFn("tagOeffnen");
pruefe("ein Tag mit Training bietet das Loeschen an",
  /text:"Training löschen: "/.test(tag));
pruefe("eine Zeile je Training", /proto\.filter\(e => e\.id\)\.forEach/.test(tag));
pruefe("es laeuft durch dieselbe Funktion wie das x",
  /eintragLoeschen\(e\.id, kalenderZeichnen\)/.test(tag));
pruefe("danach bleibt man im Kalender",
  /function eintragLoeschen\(id, danach\)/.test(loeschen) &&
  /const zeichnen = danach \|\| verlaufOeffnen;/.test(loeschen));

/* ---------- 8) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v182",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 182);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.182", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
