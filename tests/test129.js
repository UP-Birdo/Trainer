/* v129-Test: Leer-Zustand entruempelt, alle Anlege-Wege im „+".
   Kern ist die reine `planNeuWege(stufe, sportarten)` — welche Wege das Menue
   anbietet. Dazu strukturelle Checks: im Leer-Zustand nur EINE Aktion, der feste
   Intervall-Knopf unter der Liste ist weg.
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
  // Nur Laufen und Kampfsport tragen intervall:true (wie in SPORTARTEN).
  "const SP = { kraft:{}, laufen:{ intervall:true }, kampfsport:{ intervall:true }, yoga:{}, klettern:{} };",
  "function sportart(id){ return SP[id] || {}; }",
  grabFn("planNeuWege"),
  "module.exports = { planNeuWege };"
].join("\n"))(modul, modul.exports);
const planNeuWege = modul.exports.planNeuWege;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const w = (s, sp) => planNeuWege(s, sp).join(",");

/* 1) planNeuWege — Stufe und Profil entscheiden.
   v180: „nachtragen" ist hier ENTFALLEN — nachgetragen wird jetzt im Kalender
   am jeweiligen Tag (`tagOeffnen`). Das „+"-Menue legt NEUES an, und ein
   Training von vorgestern ist kein neuer Plan. Alle anderen Wege und ihre
   Reihenfolge bleiben unveraendert; test180 prueft den neuen Weg. */
/* v193 (Nutzer-Ansage): „Beispielplan laden und Plan mit Assistent erst mal raus
   aus den Menuees — dort soll nur Plan erstellen oder Uebung eintragen stehen."
   Damit bietet das „+" auf JEDER Stufe und bei JEDEM Profil genau zwei Wege an.
   Die v129-Zusage dahinter bleibt dieselbe: eine ueberschaubare Auswahl, keine
   Knopfleiste unter der Liste. Wo die drei entfallenen Wege geblieben sind,
   prueft test193 (Ersteinrichtung bzw. „Mehr -> Werkzeuge"). */
pruefe("Stufe 5 mit Kraft: nur Uebung + eigener Plan", w(5, ["kraft"]) === "uebung,eigen");
pruefe("Stufe 3 genauso", w(3, ["kraft"]) === "uebung,eigen");
pruefe("Stufe 4 genauso", w(4, ["kraft"]) === "uebung,eigen");
pruefe("ohne Kraft genauso", w(5, ["yoga"]) === "uebung,eigen");
/* v194 (Korrektur des Nutzers): Entfernt wurden NUR Assistent und Beispielplan.
   Der Intervall-Weg bleibt und haengt weiter an seiner Bedingung (v118). */
pruefe("Intervall-Sportart bringt den Intervall-Weg",
  w(5, ["kraft","laufen"]) === "uebung,eigen,intervall");
pruefe("zwei Intervall-Sportarten bringen ihn nur EINMAL",
  w(5, ["laufen","kampfsport"]) === "uebung,eigen,intervall");
pruefe("ohne Sportarten bleibt es dabei", w(5, []) === "uebung,eigen");
pruefe("undefined faellt nicht um", w(5, undefined) === "uebung,eigen");
pruefe("Nachtragen ist aus dem Plus-Menue verschwunden",
  planNeuWege(5, ["kraft","laufen"]).indexOf("nachtragen") < 0);
pruefe("eigener Plan ist immer dabei",
  planNeuWege(3, []).includes("eigen") && planNeuWege(5, ["yoga"]).includes("eigen"));
pruefe("die Uebung steht an erster Stelle", planNeuWege(5, ["kraft"])[0] === "uebung");

/* 2) Leer-Zustand: nur EINE Aktion. */
const liste = grabFn("planListeZeichnen");
pruefe("Leer-Zustand ohne Beispielplan-Knopf", !liste.includes("beispielLaden()"));
pruefe("Leer-Zustand ohne Intervall-Knopf", !liste.includes("intervallPlanNeu()"));
/* v193: Die eine Aktion ist jetzt auf JEDER Stufe dieselbe — die einzelne Uebung.
   Vorher stand hier ab Stufe 5 der Assistent; der ist aus den Anlege-Wegen
   ausgezogen, also darf ihn auch der Leer-Zustand nicht mehr bewerben. */
pruefe("Leer-Zustand ohne Assistent", !liste.includes("einrichtungOeffnen()"));
pruefe("Leer-Zustand fuehrt zur einzelnen Uebung", liste.includes('uebungAlleinAnlegen()">Übung eintragen'));
// Nur den Leer-Zustands-Block ansehen (er endet mit dem return), nicht den Rest
// der Funktion — dort stehen die Knoepfe der Karten/Zeilen.
const leerBlock = (liste.split("Noch nichts angelegt")[1] || "").split("return;")[0];
pruefe("Leer-Zustand rendert genau einen Knopf",
  leerBlock.split("<button").length - 1 === 1);
pruefe("und keine Stufen-Verzweigung mehr", !leerBlock.includes("stufe()"));

/* 3) Das Menue haengt an der reinen Auswahl. */
const menue = grabFn("planNeuMenue");
pruefe("Menue nutzt planNeuWege", menue.includes("planNeuWege(stufe()"));
pruefe("alle Wege sind verdrahtet",   // v194: Uebung, eigener Plan, Intervall
  ["uebung:", "eigen:", "intervall:"].every(k => menue.includes(k)));
pruefe("und kein toter Eintrag bleibt zurueck (v180/v193)",
  !menue.includes("nachtragen") && !menue.includes("assistent:") && !menue.includes("beispiel:"));
pruefe("Stufe 1/2 legt weiter direkt einen Abschnitt an", menue.includes("abschnittAnlegen()"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
