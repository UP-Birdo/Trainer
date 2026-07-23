/* v79-Test: Notizblock-Umbau (jede Zeile = Uebung, Sportart aus Ueberschrift,
   flaches Verschieben auf Stufe 1/2). Extrahiert die ECHTEN Funktionen aus
   index.html und testet sie mit Stubs. */
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
  // Sportarten-Stub: eine Kraft-, eine Strecken- und eine Zeit-Sportart
  "const SPORTARTEN = [" +
  "  { id:'kraft', name:'Krafttraining', farbe:'#F2C14E', planTyp:'kraft', einheiten:'' }," +
  "  { id:'laufen', name:'Laufen', farbe:'#6FBF73', planTyp:'aktivitaet', strecke:{ einheit:'km', schritt:0.5, start:3 }, paceJe:1, einheiten:'' }," +
  "  { id:'tischtennis', name:'Tischtennis', farbe:'#C86BD6', planTyp:'aktivitaet', einheiten:'' }" +
  "];",
  "let sitzung = { daten: { plaene: [] } };",
  "let toasts = [];",
  "let stufeWert = 1;",
  "function stufe(){ return stufeWert; }",
  "function speichern(){}",
  "function planListeZeichnen(){}",
  "function zeigenToast(t, art){ toasts.push(t); }",
  grabFn("begrenzen"),
  grabFn("normName"),
  grabFn("neueId"),
  grabFn("neueUebung"),
  grabFn("findePlan"),
  grabFn("sportart"),
  grabFn("planTypFuer"),
  grabFn("hatStrecke"),
  grabLine("const NOTIZ_MUSTER"),
  grabFn("uebungAlsZeile"),
  grabFn("abschnittTextErzeugen"),
  grabFn("abschnittTextSetzen"),
  grabFn("abschnittNameSetzen"),
  grabFn("notizZeileSaetzeSetzen"),
  grabFn("planSchieben"),
  "module.exports = { get sitzung(){ return sitzung; }, get toasts(){ return toasts; }," +
  " leereToasts(){ toasts = []; }, setStufe(n){ stufeWert = n; }," +
  " neueUebung, abschnittTextErzeugen, abschnittTextSetzen, abschnittNameSetzen," +
  " notizZeileSaetzeSetzen, planSchieben };"
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

/* 1) Rendern */
let p = testplan();
T.sitzung.daten.plaene = [p];
const gerendert = T.abschnittTextErzeugen(p);
pruefe("Render Wdh-Zeile", gerendert.includes("Sätze 2 Wdh 20 Liegestütze"));
pruefe("Render Zeit-Zeile", gerendert.includes("Sätze 3 Zeit 45 Plank"));

/* 2) Rundlauf: parse(render) laesst alles unveraendert */
const idsVorher = p.uebungen.map(u => u.id).join(",");
T.abschnittTextSetzen("p1", gerendert);
pruefe("Rundlauf: 3 Uebungen", p.uebungen.length === 3);
pruefe("Rundlauf: IDs erhalten", p.uebungen.map(u => u.id).join(",") === idsVorher);
pruefe("Rundlauf: Gewicht/Pause/Historie erhalten",
  p.uebungen[2].gewicht === 12.5 && p.uebungen[2].pause === 120 && p.uebungen[2].notenHistorie.join(",") === "2,3");
pruefe("Rundlauf: idempotent", T.abschnittTextErzeugen(p) === gerendert);

/* 3) v79: NACKTE Zeile = neue Uebung mit Standardwerten */
T.leereToasts();
T.abschnittTextSetzen("p1", gerendert + "\nKniebeugen\nschulterkreisen morgens");
const kb = p.uebungen.find(u => u.name === "Kniebeugen");
const sk = p.uebungen.find(u => u.name === "schulterkreisen morgens");
pruefe("Nackte Zeile wird Uebung", !!kb && !!sk);
pruefe("Standardwerte (3 Saetze, 10 Wdh)", kb && kb.saetze === 3 && kb.wdh === 10 && kb.modus === "wdh");
pruefe("Kein erfundenes Gewicht", kb && kb.gewicht === 0 && kb.gewichtSchritt === 0);
pruefe("Toast fuer neue Uebungen", T.toasts.some(t => t.includes("Kniebeugen")));

/* 4) v79: nackte Zeile mit BEKANNTEM Namen trifft vorhandene Uebung (Werte bleiben) */
p = testplan(); p.id = "p2";
T.sitzung.daten.plaene = [p];
T.abschnittTextSetzen("p2", "liegestütze\nSätze 3 Zeit 45 Plank\nSätze 3 Wdh 10 KH-Bankdrücken");
const lg = p.uebungen.find(u => u.name === "Liegestütze");
pruefe("Nackter Name trifft vorhandene Uebung (kanonisch)", !!lg);
pruefe("Werte bleiben ohne Muster unveraendert", lg && lg.saetze === 2 && lg.wdh === 20);

/* 5) Muster setzt Werte; Doppelte bleiben Text; Leerzeilen fliegen raus */
T.abschnittTextSetzen("p2", "Sätze 4 Wdh 12 Liegestütze\n\nSätze 9 Wdh 9 liegestütze\nSätze 3 Zeit 45 Plank\nSätze 3 Wdh 10 KH-Bankdrücken");
pruefe("Muster aktualisiert Werte", p.uebungen[0].saetze === 4 && p.uebungen[0].wdh === 12);
pruefe("Doppelter Name bleibt Text", p.freitext.includes("Sätze 9 Wdh 9 liegestütze"));
pruefe("Keine Duplikat-Uebung", p.uebungen.filter(u => u.name === "Liegestütze").length === 1);

/* 6) Zeile loeschen = Uebung weg */
T.leereToasts();
T.abschnittTextSetzen("p2", "Sätze 4 Wdh 12 Liegestütze");
pruefe("Fehlende Zeilen entfernen Uebungen", p.uebungen.length === 1);
pruefe("Toast fuer entfernte Uebungen", T.toasts.some(t => t.includes("entfernt")));

/* 7) Sportart aus der Ueberschrift */
p = testplan(); p.id = "p3"; p.sportart = "kraft"; p.typ = "kraft";
T.sitzung.daten.plaene = [p];
T.leereToasts();
T.abschnittNameSetzen("p3", "Laufen");
pruefe("Ueberschrift Laufen -> sportart laufen", p.sportart === "laufen" && p.typ === "aktivitaet");
pruefe("Aktivitaets-Felder angelegt", typeof p.dauer === "number" && p.zeitEinheit === "min" && p.strecke === 3 && !!p.steigerung);
pruefe("Toast zur Erkennung", T.toasts.some(t => t.includes("Laufen")));
T.abschnittNameSetzen("p3", "Morgenrunde");
pruefe("Umbenennen laesst Sportart stehen", p.sportart === "laufen" && p.name === "Morgenrunde");
T.abschnittNameSetzen("p3", "tischtennis");
pruefe("Klein geschriebene Sportart erkannt", p.sportart === "tischtennis");

/* 8) Saetze-Setter Stufe 2 */
p = testplan(); p.id = "p4";
T.sitzung.daten.plaene = [p];
T.notizZeileSaetzeSetzen("p4", p.uebungen[0].id, "5");
pruefe("Saetze-Feld setzt Saetze", p.uebungen[0].saetze === 5);
T.notizZeileSaetzeSetzen("p4", p.uebungen[0].id, "");
pruefe("Leeres Saetze-Feld laesst Wert stehen", p.uebungen[0].saetze === 5);

/* 9) planSchieben: flach auf Stufe 1/2, gruppiert ab Stufe 3 */
const pa = { id:"a", name:"A", sportart:"kraft", uebungen:[] };
const pb = { id:"b", name:"B", sportart:"laufen", uebungen:[] };
const pc = { id:"c", name:"C", sportart:"kraft", uebungen:[] };
T.sitzung.daten.plaene = [pa, pb, pc];
T.setStufe(1);
T.planSchieben("c", -1);   // flach: C tauscht mit direktem Nachbarn B
pruefe("Stufe 1: flacher Tausch", T.sitzung.daten.plaene.map(x => x.id).join("") === "acb");
T.sitzung.daten.plaene = [pa, pb, pc];
T.setStufe(5);
T.planSchieben("c", -1);   // gruppiert: C ueberspringt B (andere Sportart) und tauscht mit A
pruefe("Stufe 5: Tausch innerhalb der Sportart", T.sitzung.daten.plaene.map(x => x.id).join("") === "cba");

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
