/* 0.227.0-Test: Drei Farben statt einer Richtung. (62. Runde, Nachtrag.)

   Nutzer-Ansage: „Gruene Muskeln sind bereit zum Trainieren — abgekuehlt, weil
   sie nicht genutzt wurden. Danach Gelb, auch in Stufen: wurde benutzt. Und
   sobald die Warnung kommt, dass zu viel trainiert wurde, soll es rot werden,
   bis tiefrot, mit einer fetten Warnung."

   Die Zusagen:
   1. NULLPUNKT. Quote 0 ist eine AUSSAGE (bereit, gruen), nicht die Abwesenheit
      einer. „Keine Daten" (undefined) bleibt die Signalfarbe wie bisher.
   2. DIE SCHWELLEN BLEIBEN. 1,0 = Richtwert (gelb), 1,3 = deutlich darueber
      (tiefrot) — dieselben Grenzen wie `auslastungStufe` seit v160.
   3. ROT IST EIN URTEIL. Ohne ausreichende Basis (v167) wird die Quote unter die
      rote Schwelle gedeckelt — statt wie bisher das ganze Objekt zu leeren, was
      mit der neuen Skala „alles gruen" hiesse.
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
  "const MUSKEL_INFO = { quadriceps:{name:'Oberschenkel'}, latissimus:{name:'Latissimus'}, calves:{name:'Waden'}, abs:{name:'Bauch'} };",
  grabFn("farbMischung"), grabFn("lastFarbe"), grabFn("lastWarnungText"),
  "module.exports = { farbMischung, lastFarbe, lastWarnungText };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const GRUEN = [90, 164, 105], GELB = [244, 199, 78], ROT = [217, 92, 71];
const f = q => A.lastFarbe(q, GELB, ROT, GRUEN);
const gleich = (a, b) => a.join() === b.join();

/* ---------- 1) Der Nullpunkt ---------- */
pruefe("ohne Last ist der Muskel gruen", gleich(f(0), GRUEN));
pruefe("am Richtwert ist er gelb", gleich(f(1), GELB));
pruefe("deutlich darueber tiefrot", gleich(f(1.3), ROT));
pruefe("und darueber bleibt es dabei", gleich(f(3), ROT));
/* Keine Daten ist etwas anderes als keine Last. */
pruefe("ohne Quote bleibt es bei der Signalfarbe", gleich(f(undefined), GELB));
pruefe("auch bei null als Wert", gleich(f(null), GELB));
pruefe("kaputte Werte werfen nicht", gleich(f("viel"), GELB));
/* Ohne Gruen-Ton (alte Aufrufer) bleibt die Darstellung, wie sie war. */
pruefe("ohne Gruen-Ton keine gruene Figur", gleich(A.lastFarbe(0, GELB, ROT), GELB));

/* ---------- 2) In Stufen, nicht in Spruengen ---------- */
const gruenAnteil = q => f(q)[1] - f(q)[0];   // Gruen zieht G ueber R, Rot umgekehrt
pruefe("zwischen bereit und Richtwert wird es stetig gelber",
  gruenAnteil(0) > gruenAnteil(0.5) && gruenAnteil(0.5) > gruenAnteil(0.9));
pruefe("die Mitte liegt wirklich dazwischen",
  f(0.5)[0] > f(0)[0] && f(0.5)[0] < f(1)[0]);
pruefe("zwischen Richtwert und Warnung wird es stetig roter",
  f(1.1)[1] > f(1.2)[1] && f(1.2)[1] > f(1.3)[1]);
pruefe("negative Quoten gelten als ruhig", gleich(f(-1), GRUEN));

/* ---------- 3) Die fette Warnung ---------- */
pruefe("ohne Ueberlastung keine Warnung", A.lastWarnungText({ quadriceps:0.9, abs:1.2 }) === "");
pruefe("kein Objekt, keine Warnung", A.lastWarnungText(null) === "");
const eine = A.lastWarnungText({ quadriceps:1.4 });
pruefe("ein ueberlasteter Muskel wird benannt", eine.indexOf("Oberschenkel") === 0);
pruefe("und die Ansage ist deutlich", eine.indexOf("nicht weiter trainieren") > 0);
const drei = A.lastWarnungText({ quadriceps:1.4, latissimus:1.5, calves:1.9, abs:2.0 });
pruefe("mehrere werden zusammengefasst", drei.indexOf("und weitere") > 0);
pruefe("die Grenze liegt bei 1,3, nicht bei 1,0",
  A.lastWarnungText({ abs:1.29 }) === "" && A.lastWarnungText({ abs:1.3 }) !== "");

/* ---------- 4) Verdrahtung ---------- */
pruefe("der Gruen-Ton kommt aus dem Stylesheet", src.includes('function muskelOkRgb(){ return themeRgb("--ok"'));
const canvas = grabFn("muskelnAufCanvas");
pruefe("die Figur malt mit allen drei Farben", canvas.includes("muskelOkRgb()"));
/* Ein fehlender Eintrag heisst „keine Last", nicht „keine Daten" — sonst waere
   ein ausgeruhter Muskel gelb statt gruen. */
pruefe("fehlende Quote heisst null, wenn Quoten da sind",
  canvas.includes("quoten ? (quoten[key] || 0) : undefined"));
const quoten = grabFn("auslastungsQuoten");
pruefe("ohne Konto gibt es KEIN Quoten-Objekt", quoten.includes("return null"));
pruefe("ohne Basis wird gedeckelt statt geleert",
  quoten.includes("basisReicht(sitzung.daten.protokoll) ? Infinity : 0.99"));
pruefe("der Deckel liegt unter der roten Schwelle", quoten.includes("0.99"));
const koerper = grabFn("koerperVorschauZeichnen");
pruefe("die Statistik-Figur malt ALLE Muskeln", koerper.includes("MUSKEL_ORDER, quoten"));
pruefe("die Legende ist zurueck", koerper.includes("lastLegendeHtml()"));
pruefe("und die Warnung steht darunter", koerper.includes("lastWarnungText("));
pruefe("die Legende nennt alle drei Stufen", (() => {
  const l = grabFn("lastLegendeHtml");
  return l.includes("bereit") && l.includes("benutzt") && l.includes("zu viel");
})());

/* ---------- 5) Der Dialog laesst niemanden feststecken ---------- */
const dialog = grabFn("frage");
pruefe("ein Tipp neben das Fenster schliesst", dialog.includes("hintergrund.onclick = e =>"));
pruefe("nur der Hintergrund selbst, nicht das Fenster", dialog.includes("e.target === hintergrund"));
pruefe("die Handler werden beim Schliessen abgeraeumt",
  dialog.includes("ja.onclick = null; nein.onclick = null"));
pruefe("OK und Abbrechen laufen ueber denselben Weg",
  dialog.includes("schliessen(true)") && dialog.includes("schliessen(false)"));

/* ---------- 6) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("APP_VERSION passt zu VERSION", (() => {
  const [, mi, pa] = /const VERSION = "([\d.]+)";/.exec(src)[1].split(".");
  return Number(/const APP_VERSION = (\d+);/.exec(src)[1]) === Number(mi) * 1000 + Number(pa);
})());
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.227.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
