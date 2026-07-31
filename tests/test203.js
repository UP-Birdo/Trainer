/* v203-Test: Etappe 3 der Uebungs-Entscheidung — der erste Start fuehrt in die
   UEBUNGS-AUSWAHL, nicht mehr in den Assistenten (Nutzer-Entscheidung).

   Die Richtungs-Entscheidung der 49. Runde lautete: nicht „erst einen Plan
   bauen, dann trainieren", sondern „eine Uebung eintragen und loslegen". Bis
   v202 war der Assistent auf Stufe 5 der einzige Weg, den ein neuer Nutzer zu
   sehen bekam — genau das dreht diese Version um.

   Die drei Zusagen, die den Bau bestimmen:
   1. AB STUFE 3 in die Uebungs-Auswahl. Stufe 1/2 gehen weiter auf ihr Zuhause,
      dort IST der Notizblock die Eingabe (ein Picker davor waere ein Umweg).
   2. ENTFERNT IST NICHT GELOESCHT. Der Assistent bleibt unter „Mehr ->
      Werkzeuge", `view-wizard` und `WIZARD_FRAGEN` sind unangetastet — was
      geloescht ist, ist teuer zurueckzuholen (v149/v150/v171/v178/v181/v186).
   3. Ein neuer Nutzer erfaehrt, DASS es ihn gibt — einmalig beim Uebergang,
      nicht als dauerhafter Satz im Leer-Zustand (dort steht EINE Aktion, v129).
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

/* Der Weg wird ECHT gefahren: `erstenWegOeffnen` ist rein genug, um ihn mit
   Stubs zu beobachten — welche Ansicht ruft er je Stufe auf? */
const modul = { exports: {} };
new Function("module", "exports", [
  "let gerufen = [];",
  "function startOeffnen(){ gerufen.push('start'); }",
  "function uebungAlleinAnlegen(){ gerufen.push('uebungsauswahl'); }",
  "function einrichtungOeffnen(){ gerufen.push('assistent'); }",
  "function zeigenToast(t, art){ gerufen.push('toast:' + t); }",
  grabFn("erstenWegOeffnen"),
  "module.exports = { erstenWegOeffnen, weg(n){ gerufen = []; erstenWegOeffnen(n); return gerufen; } };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Wohin fuehrt der erste Start? ---------- */
pruefe("Stufe 1 bleibt beim Notizblock", A.weg(1).join(",") === "start");
pruefe("Stufe 2 auch", A.weg(2).join(",") === "start");
pruefe("Stufe 3 fuehrt in die Uebungs-Auswahl", A.weg(3)[0] === "uebungsauswahl");
pruefe("Stufe 4 ebenfalls", A.weg(4)[0] === "uebungsauswahl");
pruefe("Stufe 5 ebenfalls", A.weg(5)[0] === "uebungsauswahl");
pruefe("KEINE Stufe startet den Assistenten",
  [1,2,3,4,5].every(n => !A.weg(n).includes("assistent")));

/* ---------- 2) Der Hinweis auf den Assistenten ---------- */
const fuenf = A.weg(5);
pruefe("Stufe 5 erfaehrt, wo der Assistent steht",
  fuenf.some(g => /^toast:/.test(g) && /Assistent/.test(g)));
pruefe("und der Hinweis nennt den Ort", fuenf.some(g => /Werkzeuge/.test(g)));
pruefe("er kommt NACH der Auswahl (sonst redet er ins Leere)",
  fuenf.indexOf("uebungsauswahl") < fuenf.findIndex(g => /^toast:/.test(g)));
pruefe("die anderen Stufen bekommen ihn nicht (dort gibt es ihn nicht)",
  [1,2,3,4].every(n => !A.weg(n).some(g => /^toast:/.test(g))));

/* ---------- 3) Entfernt ist nicht geloescht ---------- */
pruefe("die Wizard-Ansicht steht unveraendert da",
  src.includes('id="view-wizard"') && src.includes("const WIZARD_FRAGEN"));
pruefe("seine Bau-Funktionen auch",
  src.includes("function plaeneErstellen(") && src.includes("function aktivitaetsPlaeneBauen("));
pruefe("und er ist weiter aufrufbar",
  src.includes('onclick="einrichtungOeffnen()">Assistent starten'));
pruefe("gebunden an Stufe 5, wie seit v193",
  grabFn("einstWerkzeugeOeffnen").includes("stufe() >= 5"));
/* Die Ersteinrichtung selbst ruft ihn nicht mehr. */
pruefe("der alte Erst-Aufruf ist weg", !src.includes("if(n >= 5) einrichtungOeffnen();"));
pruefe("die Stufen-Wahl delegiert an den einen Weg",
  grabFn("simpelheitWaehlen").includes("erstenWegOeffnen(n)"));
pruefe("und der Erst-Flow laeuft nur EINMAL (die Merker-Fahne faellt)",
  grabFn("simpelheitWaehlen").includes("simpelheitErstmalig = false"));

/* ---------- 4) Was der Weg voraussetzt ---------- */
/* Die Uebungs-Auswahl ist ab Stufe 3 erlaubt — sonst liefe der erste Start in
   den Sicht-Filter und landete wieder auf Start. */
pruefe("die Uebungs-Auswahl ist ab Stufe 3 erreichbar",
  /"view-uebung-picker": 3/.test(src));
pruefe("der Einzel-Modus legt keinen Plan an, sondern eine Uebung",
  grabFn("uebungAlleinAnlegen").includes("uebungEinzelModus = true"));
pruefe("er kommt ohne vorhandenes Profil aus (eine Sportart wird nur dann gesetzt)",
  grabFn("uebungAlleinAnlegen").includes("if(meine.length === 1) planSportartSetzen(meine[0]);"));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v203",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 203);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.203", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
