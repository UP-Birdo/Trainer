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

/* 1) planNeuWege — Stufe und Profil entscheiden. */
pruefe("Stufe 5 mit Kraft: Assistent + eigen + Beispiel + nachtragen",
  w(5, ["kraft"]) === "assistent,eigen,beispiel,nachtragen");
pruefe("Stufe 3 ohne Assistent", w(3, ["kraft"]) === "eigen,beispiel,nachtragen");
pruefe("Stufe 4 ohne Assistent", w(4, ["kraft"]) === "eigen,beispiel,nachtragen");
pruefe("ohne Kraft kein Beispielplan", w(5, ["yoga"]) === "assistent,eigen,nachtragen");
pruefe("Intervall-Sportart bringt den Intervall-Weg",
  w(5, ["kraft","laufen"]) === "assistent,eigen,beispiel,intervall,nachtragen");
pruefe("zweite Intervall-Sportart bringt ihn nur EINMAL",
  w(5, ["laufen","kampfsport"]) === "assistent,eigen,intervall,nachtragen");
pruefe("ohne Sportarten bleibt das Noetigste", w(5, []) === "assistent,eigen,nachtragen");
pruefe("undefined faellt nicht um", w(5, undefined) === "assistent,eigen,nachtragen");
pruefe("Nachtragen steht immer am Ende",
  planNeuWege(5, ["kraft","laufen"]).slice(-1)[0] === "nachtragen");
pruefe("eigener Plan ist immer dabei",
  planNeuWege(3, []).includes("eigen") && planNeuWege(5, ["yoga"]).includes("eigen"));

/* 2) Leer-Zustand: nur EINE Aktion. */
const liste = grabFn("planListeZeichnen");
pruefe("Leer-Zustand ohne Beispielplan-Knopf", !liste.includes("beispielLaden()"));
pruefe("Leer-Zustand ohne Intervall-Knopf", !liste.includes("intervallPlanNeu()"));
pruefe("Stufe 5 zeigt Trainingsplanung", liste.includes(">Trainingsplanung</button>"));
pruefe("darunter Eigenen Plan als Hauptaktion",
  /stufe\(\) >= 5[\s\S]{0,220}planAnlegen\(\)">Eigenen Plan/.test(liste));
// Nur den Leer-Zustands-Block ansehen (er endet mit dem return), nicht den Rest
// der Funktion — dort stehen die Knoepfe der Karten/Zeilen. Im Quelltext stehen
// ZWEI Knoepfe, aber als die beiden Zweige EINES Ternaers: zur Laufzeit rendert
// genau einer (Stufe 5 Assistent, darunter Eigener Plan).
const leerBlock = (liste.split("Noch kein Plan angelegt")[1] || "").split("return;")[0];
pruefe("Leer-Zustand rendert genau einen Knopf",
  leerBlock.split("<button").length - 1 === 2 &&
  /\?[\s\S]*<button[\s\S]*:[\s\S]*<button/.test(leerBlock));

/* 3) Das Menue haengt an der reinen Auswahl. */
const menue = grabFn("planNeuMenue");
pruefe("Menue nutzt planNeuWege", menue.includes("planNeuWege(stufe()"));
pruefe("alle fuenf Wege sind verdrahtet",
  ["assistent:", "eigen:", "beispiel:", "intervall:", "nachtragen:"].every(k => menue.includes(k)));
pruefe("Stufe 1/2 legt weiter direkt einen Abschnitt an", menue.includes("abschnittAnlegen()"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
