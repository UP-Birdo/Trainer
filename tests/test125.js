/* v125-Test: Plan mit kurzem Tipp oeffnen + Muskel-Map an den gelisteten Uebungen.
   Testbarer Kern ist `planTippen` (Gate: auf Stufe 1/2 gibt es die Liste nicht,
   dort darf nichts geoeffnet werden) gegen einen Stub. Der Rest ist Markup/Touch
   -> strukturelle Quelltext-Checks, u. a. die Trennung Kurz-Tipp / Langdruck.
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

const code = [
  "let stufeWert = 5, geoeffnet = [], gehakt = [];",
  "function stufe(){ return stufeWert; }",
  "function editorOeffnen(id){ geoeffnet.push(id); }",
  // v128: planTippen kennt jetzt den Mehrfach-Auswahlmodus — hier gestubbt.
  "let planAuswahlModus = false;",
  "function planAuswahlUmschalten(id){ gehakt.push(id); }",
  grabFn("planTippen"),
  "module.exports = { planTippen, setStufe(n){ stufeWert = n; }, offen(){ return geoeffnet; }," +
  " setAuswahl(b){ planAuswahlModus = b; }, gehakt(){ return gehakt; } };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) planTippen: ab Stufe 3 oeffnen, darunter nichts (dort ist die Karte selbst der Editor). */
T.setStufe(5); T.planTippen("p1");
pruefe("Stufe 5 oeffnet den Plan", T.offen().join() === "p1");
T.setStufe(3); T.planTippen("p2");
pruefe("Stufe 3 oeffnet den Plan", T.offen().join() === "p1,p2");
T.setStufe(2); T.planTippen("p3");
pruefe("Stufe 2 oeffnet nichts", T.offen().join() === "p1,p2");
T.setStufe(1); T.planTippen("p4");
pruefe("Stufe 1 oeffnet nichts", T.offen().join() === "p1,p2");
/* v128: Im Auswahl-Modus hakt derselbe Tipp an, statt zu oeffnen. */
T.setStufe(5); T.setAuswahl(true); T.planTippen("p5");
pruefe("Auswahl-Modus hakt an statt zu oeffnen",
  T.gehakt().join() === "p5" && T.offen().join() === "p1,p2");
T.setAuswahl(false); T.planTippen("p6");
pruefe("nach dem Modus oeffnet es wieder", T.offen().join() === "p1,p2,p6");

/* 2) Verdrahtung Kurz-Tipp an Karte UND schlanker Zeile. */
/* Die Klassen-Liste waechst mit (v128 haengt „plan-gewaehlt" an) — darum nicht
   auf den exakten Klassen-String pruefen, sondern auf Karte + Tipp-Handler. */
pruefe("volle Karte traegt den Tipp",
  /karte stat-tap[\s\S]{0,120}data-plan="' \+ p\.id \+ '" onclick="planTippen/.test(src));
pruefe("schlanke Zeile traegt den Tipp",
  /karte plan-zeile stat-tap[\s\S]{0,120}data-plan="' \+ p\.id \+ '" onclick="planTippen/.test(src));
/* v202: Die beiden Karten-Knoepfe baut jetzt `planKnoepfeHtml` (die Hauptaktion
   haengt am Typ) — geprueft wird weiter dieselbe Zusage: JEDER Knopf auf der
   Karte stoppt die Weiterreichung, sonst loeste er zusaetzlich das Oeffnen aus. */
const knoepfe = grabFn("planKnoepfeHtml");
pruefe("Start-Knopf stoppt das Bubbling",
  knoepfe.includes('onclick="event.stopPropagation();'));
pruefe("Erledigt-Knopf stoppt das Bubbling",
  (knoepfe.match(/event\.stopPropagation\(\);/g) || []).length >= 1 &&
  !/<button(?![^>]*stopPropagation)[^>]*onclick/.test(knoepfe));

/* 3) Langdruck darf nach dem Loslassen keinen Kurz-Tipp ausloesen. */
const binden = grabFn("langdruckBinden");
pruefe("Klick nach dem Langdruck wird geschluckt",
  binden.includes('el.addEventListener("click", schlucken, true)') &&
  binden.includes("e.stopPropagation()"));
pruefe("die Wache baut sich selbst ab",
  binden.includes('el.removeEventListener("click", schlucken, true)') && /setTimeout\(ab, \d+\)/.test(binden));

/* 4) Muskel-Map an der gelisteten (eingeklappten) Uebung. */
pruefe("Kopf-Figur wird gebaut", src.includes("const kopfFigur ="));
pruefe("Kopf-Figur steckt im Kopf", /const kopf = '<div class="uebung-kopf"[\s\S]{0,120}kopfFigur/.test(src));
// v139: Die Wache steckt jetzt im gemeinsamen Bauer miniFigurHtml.
pruefe("nur bei erkannten Muskeln",
  /kopfFigur = miniFigurHtml\(info, "uebung-mini"\)/.test(src) &&
  grabFn("miniFigurHtml").includes("!info.muskeln.length"));
pruefe("eigene Groesse im Kopf", /\.uebung-kopf \.uebung-mini\{width:\d+px\}/.test(src));
pruefe("aufgeklappte Figur groesser als vorher (60px)",
  /\.uebung-figur \.mini-figur\{width:(6[1-9]|[7-9]\d|\d{3})px\}/.test(src));
// v132: Der Post-Pass liegt jetzt im gemeinsamen Helfer miniFigurenZeichnen.
pruefe("Zeichner erfasst alle Figuren der Liste",
  grabFn("editorZeichnen").includes('miniFigurenZeichnen("#uebung-liste")'));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
