/* v80-Test: Fehler-Fixes + neue Features. Extrahiert die ECHTEN Funktionen
   aus index.html und testet sie mit Stubs. Enthaelt die v79-Regressionen. */
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
function grabLine(marker){
  const i = src.indexOf(marker);
  if(i < 0) throw new Error("Zeile nicht gefunden: " + marker);
  return src.slice(i, src.indexOf("\n", i));
}

const code = [
  "const MAX_DAUER_S = 24 * 3600;",
  "const UEBUNGEN_DB = [" +
  "  { name:'Liegestütze', kat:'druck', geraet:'keine' }," +
  "  { name:'KH-Bankdrücken', kat:'druck', geraet:'kurzhantel', anteil:0.13 }," +
  "  { name:'Plank', kat:'rumpf', geraet:'keine', modus:'zeit' }" +
  "];",
  "const SPORTARTEN = [" +
  "  { id:'kraft', name:'Krafttraining', farbe:'#F2C14E', planTyp:'kraft', einheiten:'' }," +
  "  { id:'laufen', name:'Laufen', farbe:'#6FBF73', planTyp:'aktivitaet', strecke:{ einheit:'km', schritt:0.5, start:3 }, paceJe:1, einheiten:'' }," +
  "  { id:'tischtennis', name:'Tischtennis', farbe:'#C86BD6', planTyp:'aktivitaet', einheiten:'' }" +
  "];",
  "let sitzung = { daten: { plaene: [], protokoll: [], ziele: [] } };",
  "let toasts = [];",
  "let stufeWert = 1;",
  "function stufe(){ return stufeWert; }",
  "function speichern(){}",
  "function planListeZeichnen(){}",
  "function startOeffnen(){}",
  "function meldung(){}",
  "function zeigenToast(t, art){ toasts.push(t); }",
  "function frage(t, mit, cb){ cb(true); }",          // Rueckfragen: immer Ja
  "function dauerSchaetzen(){ return 30; }",
  "function aktivitaetText(){ return 'AKT'; }",
  grabFn("begrenzen"),
  grabFn("normName"),
  grabFn("neueId"),
  grabFn("neueUebung"),
  grabFn("findePlan"),
  grabFn("sportart"),
  grabFn("sportartName"),
  grabFn("sportartFarbe"),
  grabFn("planTypFuer"),
  grabFn("hatStrecke"),
  grabFn("text"),
  grabFn("datumKurz"),
  grabFn("heuteAlsText"),
  grabFn("wocheSeitEpoche"),
  grabFn("planAmTag"),
  grabLine("const NOTIZ_MUSTER"),
  grabFn("uebungAlsZeile"),
  grabFn("abschnittTextErzeugen"),
  grabFn("abschnittTextSetzen"),
  grabFn("abschnittNameSetzen"),
  grabFn("planSchieben"),
  grabFn("beispielplan"),
  grabFn("letztesMal"),
  grabFn("letztesMalText"),
  grabFn("kraftErledigt"),
  grabFn("protokollEintragHtml"),
  "module.exports = { get sitzung(){ return sitzung; }, get toasts(){ return toasts; }," +
  " leereToasts(){ toasts = []; }, setStufe(n){ stufeWert = n; }," +
  " neueUebung, abschnittTextErzeugen, abschnittTextSetzen, abschnittNameSetzen, planSchieben," +
  " beispielplan, letztesMalText, kraftErledigt, protokollEintragHtml, heuteAlsText };"
].join("\n");

const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bedingung){
  if(bedingung){ ok++; }
  else { fehler++; console.error("FEHLT: " + name); }
}

function testplan(){
  const u1 = T.neueUebung(); u1.name = "Liegestütze"; u1.saetze = 2; u1.wdh = 20; u1.wdhMin = 8; u1.wdhMax = 25; u1.gewicht = 0; u1.gewichtSchritt = 0;
  const u2 = T.neueUebung(); u2.name = "Plank"; u2.modus = "zeit"; u2.saetze = 3; u2.dauer = 45;
  const u3 = T.neueUebung(); u3.name = "KH-Bankdrücken"; u3.saetze = 3; u3.wdh = 10; u3.wdhMin = 8; u3.wdhMax = 12; u3.gewicht = 12.5; u3.gewichtSchritt = 1; u3.pause = 120; u3.notenHistorie = [2, 3];
  return { id: "p1", name: "Ganzkörper", sportart: "kraft", typ: "kraft", tage: [],
           uebungen: [u1, u2, u3], freitext: "" };
}

/* --- v79-Regressionen (Kurzfassung) --- */
let p = testplan();
T.sitzung.daten.plaene = [p];
const gerendert = T.abschnittTextErzeugen(p);
const idsVorher = p.uebungen.map(u => u.id).join(",");
T.abschnittTextSetzen("p1", gerendert);
pruefe("v79 Rundlauf unveraendert", p.uebungen.length === 3 &&
  p.uebungen.map(u => u.id).join(",") === idsVorher && p.uebungen[2].gewicht === 12.5);
T.abschnittTextSetzen("p1", gerendert + "\nKniebeugen");
pruefe("v79 nackte Zeile wird Uebung", p.uebungen.some(u => u.name === "Kniebeugen"));
T.abschnittNameSetzen("p1", "Laufen");
pruefe("v79 Sportart aus Ueberschrift", p.sportart === "laufen" && p.typ === "aktivitaet");
const pa = { id:"a", name:"A", sportart:"kraft", uebungen:[] };
const pb = { id:"b", name:"B", sportart:"laufen", uebungen:[] };
const pc = { id:"c", name:"C", sportart:"kraft", uebungen:[] };
T.sitzung.daten.plaene = [pa, pb, pc];
T.setStufe(1); T.planSchieben("c", -1);
pruefe("v79 flacher Tausch", T.sitzung.daten.plaene.map(x => x.id).join("") === "acb");

/* --- A1: Beispielplan hat alle Felder --- */
const bp = T.beispielplan();
pruefe("A1 Beispielplan: tage/sportart/typ", Array.isArray(bp.tage) && bp.sportart === "kraft" && bp.typ === "kraft");
pruefe("A1 Beispielplan: Wiederholungs-Felder", bp.wochenTakt === 1 && Array.isArray(bp.einzelTermine) && bp.freitext === "");
pruefe("A1 Beispielplan: Uebungen mit geraet", bp.uebungen.every(u => u.geraet === "keine"));

/* --- B5: Letztes Mal --- */
T.sitzung.daten.protokoll = [
  { datum:"2026-07-01", saetze:[ { uebungId:"x1", name:"Liegestütze", modus:"wdh", satz:1, wdh:10, gewicht:0 } ] },
  { datum:"2026-07-10", saetze:[ { uebungId:"x1", name:"Liegestütze", modus:"wdh", satz:1, wdh:12, gewicht:0 },
                                  { uebungId:"x1", name:"Liegestütze", modus:"wdh", satz:2, wdh:11, gewicht:0 } ] },
  { datum:"2026-07-12", saetze:[ { uebungId:"z9", name:"Plank", modus:"zeit", satz:1, dauer:45 } ] }
];
const uL = T.neueUebung(); uL.name = "Liegestütze"; uL.id = "anders";   // Name-Rueckfall greift
pruefe("B5 letzter Eintrag gewinnt", T.letztesMalText(uL) === "Letztes Mal (10.07.26): 12 / 11 Wdh");
const uZ = T.neueUebung(); uZ.name = "Plank"; uZ.modus = "zeit"; uZ.id = "z9";
pruefe("B5 Zeit-Uebung", T.letztesMalText(uZ) === "Letztes Mal (12.07.26): 45 s");
const uN = T.neueUebung(); uN.name = "Nie gemacht";
pruefe("B5 ohne Historie leer", T.letztesMalText(uN) === "");

/* --- C8: kraftErledigt protokolliert Sollwerte --- */
p = testplan(); p.id = "p9"; p.sportart = "kraft"; p.typ = "kraft";
T.sitzung.daten.plaene = [p];
T.sitzung.daten.protokoll = [];
T.kraftErledigt("p9");
pruefe("C8 Eintrag entstanden", T.sitzung.daten.protokoll.length === 1);
const e8 = T.sitzung.daten.protokoll[0];
pruefe("C8 Saetze = Summe der Soll-Saetze", e8 && e8.saetze.length === 8);   // 2+3+3
pruefe("C8 Gewicht uebernommen", e8 && e8.saetze.some(s => s.gewicht === 12.5));
pruefe("C8 sonder (kein fester Tag)", e8 && e8.sonder === true && e8.planId === "p9");

/* --- A2: Verlauf robust (Getan-Eintrag) --- */
const getan = { id:"g1", datum:"2026-07-20", plan:"", planId:null, sportart:"kraft",
                typ:"kraft", sonder:true, saetze:[], notiz:"", freitext:"30 Min spazieren", dauerMin:undefined };
const html = T.protokollEintragHtml(getan, true);
pruefe("A2 kein undefined im Verlauf", !html.includes("undefined"));
pruefe("A2 Freitext sichtbar", html.includes("30 Min spazieren"));
pruefe("A2 Titel-Rueckfall Notiz", html.includes("Notiz"));
const normal = { id:"n1", datum:"2026-07-19", plan:"Ganzkörper", sportart:"kraft", typ:"kraft",
                 sonder:false, saetze:[{},{},{}], notiz:"gut", dauerMin:32 };
const html2 = T.protokollEintragHtml(normal, true);
pruefe("A2 normaler Eintrag vollstaendig", html2.includes("32 min") && html2.includes("3 Sätze") && html2.includes("✎"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
