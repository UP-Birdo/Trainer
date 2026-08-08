/* v132-Test: Muskel-Map des GANZEN Plans.
   Kern ist die reine `planMuskeln` — sammelt ueber alle Uebungen und sortiert
   jeden Muskel nach seiner Seite (vorne/hinten), ohne Doppelte. Dazu
   `planFigurenHtml` (leer, wenn nichts erkannt) und die Verdrahtung.
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
  // Mini-Welt: zwei Brust-/Bein-Muskeln vorne, Latissimus hinten.
  "const MUSKEL_SEITE = { pectoralis:'front', quadriceps:'front', latissimus:'back', trapezius:'back' };",
  "const TREFFER = {" +
  "  'Bankdruecken': { ansicht:'front', muskeln:['pectoralis'] }," +
  "  'Kniebeugen':   { ansicht:'front', muskeln:['quadriceps'] }," +
  "  'Klimmzuege':   { ansicht:'back',  muskeln:['latissimus','pectoralis'] }," +   // gemischt!
  "  'Rudern':       { ansicht:'back',  muskeln:['latissimus','trapezius'] }," +
  "  'Cardio':       { ansicht:'front', muskeln:[] } };",
  "function uebungMuskeln(name){ return TREFFER[name] || null; }",
  "function text(s){ return String(s); }",
  grabFn("planMuskeln"), grabFn("planFigurenHtml"),
  "module.exports = { planMuskeln, planFigurenHtml };"
].join("\n"))(modul, modul.exports);
const { planMuskeln, planFigurenHtml } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const plan = (...namen) => ({ uebungen: namen.map(n => ({ name:n })) });

/* 1) planMuskeln — sammeln, nach Seite trennen, ohne Doppelte. */
let m = planMuskeln(plan("Bankdruecken"));
pruefe("eine Uebung vorne", m.front.join() === "pectoralis" && m.back.length === 0);
m = planMuskeln(plan("Bankdruecken", "Kniebeugen"));
pruefe("zwei Uebungen sammeln sich", m.front.join() === "pectoralis,quadriceps");
m = planMuskeln(plan("Bankdruecken", "Bankdruecken"));
pruefe("keine Doppelten", m.front.join() === "pectoralis");
/* Der Knackpunkt: die Uebung zeigt „back", trifft aber AUCH einen Front-Muskel —
   jeder Muskel muss auf seiner eigenen Seite landen, nicht auf der der Uebung. */
m = planMuskeln(plan("Klimmzuege"));
pruefe("gemischte Uebung wird aufgeteilt (hinten)", m.back.join() === "latissimus");
pruefe("gemischte Uebung wird aufgeteilt (vorne)", m.front.join() === "pectoralis");
m = planMuskeln(plan("Klimmzuege", "Rudern"));
pruefe("mehrere hinten ohne Doppelte", m.back.join() === "latissimus,trapezius");
m = planMuskeln(plan("Unbekannt", "Freitext"));
pruefe("unbekannte Uebungen zaehlen nicht", m.front.length === 0 && m.back.length === 0);
m = planMuskeln(plan("Cardio"));
pruefe("Uebung ohne Muskeln zaehlt nicht", m.front.length === 0 && m.back.length === 0);
m = planMuskeln({ uebungen: [] });
pruefe("leerer Plan", m.front.length === 0 && m.back.length === 0);
pruefe("Plan ohne uebungen-Feld wirft nicht", planMuskeln({}).front.length === 0);
pruefe("kein Plan wirft nicht", planMuskeln(null).front.length === 0);
pruefe("kaputte Uebung wirft nicht", planMuskeln({ uebungen:[null, {}] }).front.length === 0);

/* 2) planFigurenHtml — zwei Figuren oder gar nichts. */
const html = planFigurenHtml(plan("Bankdruecken", "Klimmzuege"));
pruefe("zwei Figuren", (html.match(/data-mf-ansicht/g) || []).length === 2);
pruefe("vorne zuerst", html.indexOf('"front"') < html.indexOf('"back"'));
pruefe("Muskeln stehen drin", html.includes("pectoralis") && html.includes("latissimus"));
pruefe("ohne Treffer gar nichts", planFigurenHtml(plan("Unbekannt")) === "");

/* 3) Verdrahtung: Plan-Karte, Editor, gemeinsamer Post-Pass. */
pruefe("Plan-Karte zeigt die Figuren", /planFigurenHtml\(p\)/.test(src));
pruefe("Karte hat Text links, Figuren rechts", src.includes('<div class="plan-kopfzeile"><div class="plan-text">'));
pruefe("Plan-Liste zeichnet sie nach", src.includes('miniFigurenZeichnen("#plan-liste")'));
pruefe("Editor hat einen eigenen Block", src.includes('id="editor-muskeln"'));
pruefe("Editor blendet ihn ohne Treffer aus",
  src.includes('document.getElementById("editor-muskeln").hidden = !planFiguren'));
pruefe("gemeinsamer Post-Pass existiert", src.includes("function miniFigurenZeichnen("));
// v223: Breite als `--fb` (die Figur multipliziert sie mit der Skala ihrer Ansicht).
pruefe("CSS fuer die Plan-Figuren", /\.plan-figuren \.mini-figur\{--fb:\d+px\}/.test(src));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
