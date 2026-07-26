/* v133-Test: Runden-Training als Umschalter im Plan-Editor.
   Testbar sind die Zustands-Funktionen gegen einen Mini-Editor-Plan:
   `planIntervallSetzen` (an/aus), `editorIvSetzen`/`editorIvStufe` (Grenzen,
   Schrittweiten) und dass die Plan-Dauer IMMER den Phasen folgt. Dazu die
   Runden-Anzeige auf der Plan-Karte (bis v146: Einstellungs-Zeile) und die
   Verdrahtung im Markup.
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
  const i = src.indexOf("const " + name + " = ");
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  return src.slice(i, src.indexOf("\n", i));
}

const modul = { exports: {} };
new Function("module", "exports", [
  "let editorPlan = null;",
  "function editorZeichnen(){}",
  "function begrenzen(w,min,max){ return Math.min(max, Math.max(min, w)); }",
  "function uhrText(s){ return String(s); }",
  grabConst("IV_GRENZEN"),
  grabFn("intervallPhasen"), grabFn("intervallGesamt"), grabFn("intervallText"),
  grabFn("planIntervallSetzen"), grabFn("editorIvDauerNachziehen"),
  grabFn("editorIvSetzen"), grabFn("editorIvStufe"),
  "module.exports = { planIntervallSetzen, editorIvSetzen, editorIvStufe," +
  " setPlan(p){ editorPlan = p; }, plan(){ return editorPlan; } };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Umschalten an/aus. */
T.setPlan({ typ:"aktivitaet", sportart:"laufen", dauer:1800 });
T.planIntervallSetzen(true);
pruefe("an: Standardwerte gesetzt",
  T.plan().intervall.runden === 8 && T.plan().intervall.belastung === 30 && T.plan().intervall.pause === 15);
pruefe("an: Dauer folgt den Phasen (8x30 + 7x15 = 345)", T.plan().dauer === 345);
T.planIntervallSetzen(true);
pruefe("nochmal an aendert nichts", T.plan().intervall.runden === 8);
T.planIntervallSetzen(false);
pruefe("aus: Intervall weg", T.plan().intervall === null);
pruefe("aus: Dauer bleibt stehen (kein Datenverlust)", T.plan().dauer === 345);

/* 2) Werte setzen — Grenzen und Dauer-Nachzug. */
T.planIntervallSetzen(true);
T.editorIvSetzen("runden", 10);
pruefe("Runden gesetzt", T.plan().intervall.runden === 10);
pruefe("Dauer nachgezogen (10x30 + 9x15 = 435)", T.plan().dauer === 435);
T.editorIvSetzen("runden", 0);
pruefe("Runden mindestens 1", T.plan().intervall.runden === 1);
T.editorIvSetzen("runden", 999);
pruefe("Runden hoechstens 60", T.plan().intervall.runden === 60);
T.editorIvSetzen("belastung", 1);
pruefe("Belastung mindestens 5", T.plan().intervall.belastung === 5);
T.editorIvSetzen("pause", 0);
pruefe("Pause darf 0 sein", T.plan().intervall.pause === 0);
T.editorIvSetzen("pause", -5);
pruefe("Pause nie negativ", T.plan().intervall.pause === 0);
T.editorIvSetzen("belastung", "45");
pruefe("Text-Eingabe wird gelesen", T.plan().intervall.belastung === 45);
T.editorIvSetzen("belastung", "abc");
pruefe("Unsinn faellt auf die Untergrenze", T.plan().intervall.belastung === 5);

/* 3) Schrittweiten: Runden einzeln, Sekunden in 5ern. */
T.setPlan({ typ:"aktivitaet", sportart:"laufen", intervall:{ runden:8, belastung:30, pause:15 } });
T.editorIvStufe("runden", 1);
pruefe("Runden +1", T.plan().intervall.runden === 9);
T.editorIvStufe("belastung", 1);
pruefe("Belastung +5", T.plan().intervall.belastung === 35);
T.editorIvStufe("pause", -1);
pruefe("Pause -5", T.plan().intervall.pause === 10);

/* 4) Ohne Intervall passiert nichts (Guards). */
T.setPlan({ typ:"aktivitaet", sportart:"laufen", dauer:600 });
T.editorIvSetzen("runden", 5);
T.editorIvStufe("runden", 1);
pruefe("ohne Intervall kein Zugriff", !T.plan().intervall && T.plan().dauer === 600);

/* 5) Verdrahtung im Markup und in den Nachbar-Funktionen. */
pruefe("Umschalter im Editor", src.includes('id="akt-art-block"') &&
  src.includes('onclick="planIntervallSetzen(false)"') && src.includes('onclick="planIntervallSetzen(true)"'));
pruefe("Umschalter nur bei Intervall-Sportarten",
  src.includes('document.getElementById("akt-art-block").hidden = !sp.intervall'));
pruefe("Dauer-Block weicht den Runden",
  src.includes('document.getElementById("akt-dauer-block").hidden = istIv'));
pruefe("Sportart-Wechsel raeumt das Intervall weg",
  src.includes("if(!sportart(id).intervall) editorPlan.intervall = null"));
/* v147: `planEinstText` ist entfallen — die Einstellungs-Zeile traegt nur noch
   den Plan-Namen. Die Runden stehen weiterhin dort, wo sie hingehoeren: auf der
   Plan-Karte in der Uebersicht (dieselbe `intervallText`). */
pruefe("Plan-Karte nennt die Runden",
  grabFn("planListeZeichnen").includes("p.intervall ? intervallText(p)"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
