/* v169-Test: die Uebungs-Erklaerung ist aus dem Training erreichbar.

   Befund aus dem Persona-Durchgang: Die Texte gab es seit v143/v152 fuer JEDE
   Uebung — aber nur ueber Mehr -> Werkzeuge -> Bibliothek, und die gibt es
   erst ab Stufe 3. Im Training war der Uebungsname ein totes <div>.

   Geprueft werden die drei Zusagen dieses Baus:
   1. Zu JEDER Uebung und JEDEM Drill gibt es etwas zu lesen — der Tipp laeuft
      also nirgends ins Leere (das ist der Vertrag: wer eine Uebung aufnimmt,
      schreibt den Text mit).
   2. Wo NICHTS hinterlegt ist, wird der Name auch NICHT antippbar — ein
      Dialog mit leerem Inhalt waere schlimmer als gar keine Geste.
   3. Beide Anzeigestellen (Training und Vorschau) fragen dieselbe Quelle.
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

const modul = { exports: {} };
new Function("module", "exports", [
  grabLiteral("UEBUNGEN_DB"),
  grabLiteral("UEBUNG_INFO", "{"),
  grabLiteral("UEBUNG_TEXT", "{"),
  grabLiteral("SPORT_INFO", "{"),
  grabLiteral("SPORT_TEXT", "{"),
  grabLiteral("AUFWAERMEN"),
  grabLiteral("DEHNEN"),
  grabFn("drillTipp"),
  grabFn("drillText"),
  grabFn("jsArg"),
  grabFn("uebungErklaerung"),
  grabFn("uebungErklaerbar"),
  "module.exports = { UEBUNGEN_DB, UEBUNG_TEXT, SPORT_TEXT, AUFWAERMEN, DEHNEN," +
  " drillTipp, drillText, jsArg, uebungErklaerung, uebungErklaerbar };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Der Tipp laeuft nirgends ins Leere ---------- */
pruefe("es gibt ueberhaupt Kraftuebungen", A.UEBUNGEN_DB.length >= 100);
A.UEBUNGEN_DB.forEach(u => {
  pruefe("Kraftuebung erklaerbar: " + u.name, A.uebungErklaerbar(u.name));
});
const drills = Object.keys(A.SPORT_TEXT);
pruefe("es gibt Sportart-Drills", drills.length >= 50);
pruefe("jeder beschriebene Drill ist auch erklaerbar",
  drills.every(n => A.uebungErklaerbar(n)));

/* ---------- 2) Ohne Text keine Geste ---------- */
pruefe("eine unbekannte Uebung ist nicht erklaerbar",
  !A.uebungErklaerbar("Kabel-Zwiebelzupfen im Sitzen"));
pruefe("und liefert leeren Text statt eines leeren Dialogs",
  A.uebungErklaerung("Kabel-Zwiebelzupfen im Sitzen") === "");
pruefe("leerer Name ist nicht erklaerbar", !A.uebungErklaerbar(""));
pruefe("null ist nicht erklaerbar", !A.uebungErklaerbar(null));
pruefe("erklaerbar und Erklaerung sagen immer dasselbe",
  A.UEBUNGEN_DB.concat(A.AUFWAERMEN, A.DEHNEN)
    .every(u => A.uebungErklaerbar(u.name) === (A.uebungErklaerung(u.name) !== "")));

/* ---------- 3) Aufbau des Dialog-Textes ---------- */
const bsp = A.UEBUNGEN_DB.find(u => A.drillTipp(u.name) && A.drillText(u.name));
pruefe("es gibt eine Uebung mit Tipp UND Beschreibung", !!bsp);
const teile = A.uebungErklaerung(bsp.name).split("\n\n");
pruefe("der Name steht als Erstes", teile[0] === bsp.name);
pruefe("dann der Kurz-Tipp", teile[1] === A.drillTipp(bsp.name));
pruefe("dann die Beschreibung", teile[2] === A.drillText(bsp.name));
pruefe("mehr Bloecke sind es nicht", teile.length === 3);
/* Fehlt eine der beiden Quellen, entfaellt ihr Block ERSATZLOS — nie ein
   Leerblock, der im Dialog als klaffende Luecke stuende. */
pruefe("nirgends ein Leerblock im Dialog-Text",
  A.UEBUNGEN_DB.concat(A.AUFWAERMEN, A.DEHNEN)
    .every(u => A.uebungErklaerung(u.name).indexOf("\n\n\n") < 0));
pruefe("und auch bei den Drills nicht",
  drills.every(n => A.uebungErklaerung(n).indexOf("\n\n\n") < 0));

/* ---------- 4) jsArg schuetzt eigene Uebungsnamen ---------- */
pruefe("Apostroph wird entschaerft", A.jsArg("Thomas' Uebung").indexOf("\\'") >= 0);
pruefe("Backslash wird verdoppelt", A.jsArg("a\\b") === "a\\\\b");
pruefe("Anfuehrungszeichen verlaesst das Attribut nicht",
  A.jsArg('a"b').indexOf('"') < 0);
pruefe("kaufmaennisches Und zerlegt keine Entities",
  A.jsArg("a&b") === "a&amp;b");
pruefe("kleiner-als oeffnet kein Tag", A.jsArg("a<b").indexOf("<") < 0);
pruefe("harmloser Name bleibt unveraendert", A.jsArg("LH-Bankdrücken") === "LH-Bankdrücken");
pruefe("null wird zu leer", A.jsArg(null) === "");

/* ---------- 5) Beide Anzeigestellen haengen an derselben Quelle ---------- */
pruefe("das Training setzt den Namen ueber uebungsnameSetzen",
  /function uebungsnameSetzen\(/.test(src));
pruefe("und nicht mehr direkt per textContent",
  src.indexOf('getElementById("uebungsname").textContent') < 0);
pruefe("beide Zweige des Trainings gehen darueber (Plan-Uebung und Aufwaermen)",
  (src.match(/uebungsnameSetzen\(/g) || []).length >= 3);   // 1x Definition + 2x Aufruf
pruefe("die Vorschau fragt dieselbe Funktion",
  /uebungErklaerbar\(titel\)/.test(src));
pruefe("die Vorschau ruft den Dialog mit entschaerftem Namen",
  /jsArg\(titel\)/.test(src) && /uebungErklaerungZeigen\(/.test(src));
pruefe("der Dialog laeuft ueber meldung (kein alert)",
  /function uebungErklaerungZeigen\([\s\S]*?meldung\(/.test(src) && src.indexOf("alert(") < 0);
pruefe("es gibt einen sichtbaren Hinweis (.tippbar im Stylesheet)",
  /\.tippbar\{[^}]*cursor:pointer/.test(src));

/* ---------- 6) Version ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v169",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 169);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.169", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
