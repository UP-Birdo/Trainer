/* v191-Test: Ausdauer-Plaene mit WECHSELNDEN Einheiten (Nutzer-Ansage, auf
   Rueckfrage geklaert: „ein Plan mit wechselnden Einheiten statt immer
   derselben Dauer").

   Die Zusagen:
   1. Die Folge ist FEST und wiederholt sich — kein Zufall, man soll sehen
      koennen, was als Naechstes kommt.
   2. Nur Ausdauer-Sportarten koennen das, und nur mit Schalter am Plan. Ein
      Intervall-Plan ist ausgenommen (der IST schon eine Einheitenform, v118).
   3. Die Laenge rechnet sich aus der Plan-Vorgabe; ohne Schalter aendert sich
      NICHTS an der bisherigen Anzeige.
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
function grabSportarten(){
  const i = src.indexOf("const SPORTARTEN = [");
  let tiefe = 0;
  for(let k = src.indexOf("[", i); k < src.length; k++){
    if(src[k] === "[") tiefe++;
    else if(src[k] === "]"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("SPORTARTEN unausgeglichen");
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabSportarten(),
  grabFn("sportart"),
  "function zahlKurz(n){ return String(n).replace('.', ','); }",
  grabBlock("AUSDAUER_EINHEITEN", "{", "}"),
  grabBlock("AUSDAUER_FOLGE", "[", "]"),
  grabFn("einheitFuer"),
  grabFn("planWechselnd"),
  grabFn("planGetan"),
  grabFn("einheitText"),
  "module.exports = { AUSDAUER_EINHEITEN, AUSDAUER_FOLGE, einheitFuer, planWechselnd," +
  " planGetan, einheitText, SPORTARTEN };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const laufplan = o => Object.assign({ id:"p1", sportart:"laufen", typ:"aktivitaet",
  strecke:10, dauer:3600, wechselnd:true }, o);

/* ---------- 1) Das Register ---------- */
pruefe("es gibt fuenf Einheiten", Object.keys(A.AUSDAUER_EINHEITEN).length === 5);
pruefe("jede hat Name, Kurztext, Faktor und Haerte-Angabe",
  Object.values(A.AUSDAUER_EINHEITEN).every(e =>
    e.name && e.kurz && typeof e.faktor === "number" && typeof e.hart === "boolean"));
pruefe("der Grundlagen-Lauf IST die Plan-Vorgabe (Faktor 1)",
  A.AUSDAUER_EINHEITEN.grundlage.faktor === 1);
pruefe("der lange Lauf ist laenger", A.AUSDAUER_EINHEITEN.lang.faktor > 1);
pruefe("Tempo und Regeneration sind kuerzer",
  A.AUSDAUER_EINHEITEN.tempo.faktor < 1 && A.AUSDAUER_EINHEITEN.regeneration.faktor < 1);
pruefe("kein Faktor ist 0 oder negativ",
  Object.values(A.AUSDAUER_EINHEITEN).every(e => e.faktor > 0));
pruefe("die Regeneration ist NICHT als hart markiert",
  A.AUSDAUER_EINHEITEN.regeneration.hart === false);

/* ---------- 2) Die Folge ---------- */
pruefe("jede Folge-Position kennt ihre Einheit",
  A.AUSDAUER_FOLGE.every(id => !!A.AUSDAUER_EINHEITEN[id]));
pruefe("die Folge ist nicht leer", A.AUSDAUER_FOLGE.length >= 3);
/* Polarisiert: der weit ueberwiegende Teil locker, ein kleiner Teil hart. */
const harte = A.AUSDAUER_FOLGE.filter(id => A.AUSDAUER_EINHEITEN[id].hart).length;
pruefe("hoechstens ein Drittel der Einheiten ist hart",
  harte / A.AUSDAUER_FOLGE.length <= 0.34);
pruefe("aber mindestens eine ist es", harte >= 1);
pruefe("die Grundlage kommt am haeufigsten vor",
  A.AUSDAUER_FOLGE.filter(id => id === "grundlage").length >= 2);

pruefe("beim ersten Mal kommt die erste Einheit", A.einheitFuer(0) === A.AUSDAUER_FOLGE[0]);
pruefe("danach der Reihe nach",
  A.AUSDAUER_FOLGE.every((id, i) => A.einheitFuer(i) === id));
pruefe("nach dem Ende beginnt sie von vorn",
  A.einheitFuer(A.AUSDAUER_FOLGE.length) === A.AUSDAUER_FOLGE[0] &&
  A.einheitFuer(A.AUSDAUER_FOLGE.length + 1) === A.AUSDAUER_FOLGE[1]);
pruefe("sie ist bei gleicher Zahl immer dieselbe (kein Zufall)",
  A.einheitFuer(7) === A.einheitFuer(7) && A.einheitFuer(12) === A.einheitFuer(12));
pruefe("kaputte Zahlen werfen nicht",
  !!A.einheitFuer(-3) && !!A.einheitFuer(null) && !!A.einheitFuer("x") && !!A.einheitFuer(2.7));

/* ---------- 3) Wer darf wechseln? ---------- */
pruefe("ein Laufplan mit Schalter darf", A.planWechselnd(laufplan()) === true);
pruefe("ohne Schalter nicht", A.planWechselnd(laufplan({ wechselnd:false })) === false);
pruefe("ein Plan ohne das Feld nicht (Altbestand)", (() => {
  const p = laufplan(); delete p.wechselnd; return A.planWechselnd(p) === false;
})());
pruefe("ein Intervall-Plan ist ausgenommen (v118)",
  A.planWechselnd(laufplan({ intervall:{ runden:8, belastung:30, pause:15 } })) === false);
pruefe("Yoga darf nicht (keine Ausdauer-Klasse)",
  A.planWechselnd(laufplan({ sportart:"yoga" })) === false);
pruefe("Tischtennis darf nicht",
  A.planWechselnd(laufplan({ sportart:"tischtennis" })) === false);
pruefe("alle Ausdauer-Sportarten duerfen",
  A.SPORTARTEN.filter(s => s.fortschritt === "ausdauer")
    .every(s => A.planWechselnd(laufplan({ sportart:s.id })) === true));
pruefe("kaputte Eingaben werfen nicht",
  A.planWechselnd(null) === false && A.planWechselnd({}) === false);
pruefe("es kommt ein echter Wahrheitswert",
  typeof A.planWechselnd(laufplan()) === "boolean");

/* ---------- 4) planGetan ---------- */
const proto = [{ planId:"p1" }, { planId:"p2" }, { planId:"p1" }, null, {}];
pruefe("zaehlt nur die Eintraege DIESES Plans", A.planGetan("p1", proto) === 2);
pruefe("ein unbekannter Plan hat null", A.planGetan("p9", proto) === 0);
pruefe("ohne Protokoll null",
  A.planGetan("p1", null) === 0 && A.planGetan("p1", []) === 0);

/* ---------- 5) Der Text ---------- */
pruefe("ohne wechselnde Einheiten kommt nichts",
  A.einheitText(laufplan({ wechselnd:false }), 0) === null);
pruefe("die erste Einheit nennt Name, Strecke und Kurztext", (() => {
  const t = A.einheitText(laufplan(), 0);
  return t.startsWith("Grundlagen · 10 km · ") && t.includes("unterhalten");
})());
pruefe("der lange Lauf rechnet die Strecke hoch",
  A.einheitText(laufplan(), 4).indexOf("15 km") > 0);
pruefe("Tempo rechnet sie herunter",
  A.einheitText(laufplan(), 1).indexOf("6 km") > 0);
pruefe("Nachkommastellen bleiben lesbar (ein Zeichen nach dem Komma)",
  A.einheitText(laufplan({ strecke:5 }), 4).indexOf("7,5 km") > 0);
pruefe("ohne Strecke wird die DAUER genommen", (() => {
  const t = A.einheitText(laufplan({ strecke:0, dauer:3600 }), 0);
  return t.indexOf("60 min") > 0;
})());
pruefe("ohne Strecke UND ohne Dauer bleibt der Name mit Kurztext", (() => {
  const t = A.einheitText(laufplan({ strecke:0, dauer:0 }), 0);
  return t.startsWith("Grundlagen · ") && !t.includes("km") && !t.includes("min");
})());
pruefe("die Einheit der Sportart wird uebernommen (Schwimmen in m)",
  A.einheitText(laufplan({ sportart:"schwimmen", strecke:1000 }), 0).indexOf(" m") > 0);
pruefe("es kommt immer ein String oder null",
  typeof A.einheitText(laufplan(), 3) === "string" &&
  A.einheitText(laufplan({ sportart:"yoga" }), 0) === null);

/* ---------- 6) Verdrahtung ---------- */
pruefe("die Plan-Karte zeigt die naechste Einheit",
  /einheitText\(p, planGetan\(p\.id, sitzung\.daten\.protokoll\)\) \|\| planZielText\(p\)/.test(src));
pruefe("die Stoppuhr zeigt sie auch",
  grabFn("stoppuhrOeffnen").includes("einheitText(plan, planGetan(plan.id"));
pruefe("ohne wechselnde Einheiten bleibt die alte Anzeige",
  grabFn("stoppuhrOeffnen").includes('"Geplant: " + planZielText(plan)'));
pruefe("ein Intervall-Plan zeigt weiter seine Runden-Kurzform",
  /p\.intervall \? intervallText\(p\)/.test(src));
const feld = grabFn("wechselFeldZeichnen");
pruefe("der Schalter steht nur bei Ausdauer-Sportarten",
  feld.includes('sp.fortschritt === "ausdauer"'));
pruefe("er zeigt die ganze Folge als Vorschau", feld.includes("AUSDAUER_FOLGE.map"));
pruefe("er ist im Editor verdrahtet",
  grabFn("aktivitaetsFelderZeichnen").includes("wechselFeldZeichnen(p, sp)"));
pruefe("der Umschalter kippt das Feld am Plan",
  grabFn("aktWechselUmschalten").includes("editorPlan.wechselnd = !editorPlan.wechselnd"));
pruefe("ein Sportart-Wechsel raeumt das Feld auf",
  /sportart\(id\)\.fortschritt !== "ausdauer"\) editorPlan\.wechselnd = false/.test(src));
pruefe("der Assistent schaltet es bei Ausdauer ein",
  grabFn("aktivitaetsPlaeneBauen").includes('wechselnd: !iv && sp.fortschritt === "ausdauer"'));
pruefe("aber nicht bei Runden-Plaenen",
  grabFn("aktivitaetsPlaeneBauen").includes("!iv &&"));

/* ---------- 7) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v191",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 191);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.191", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
