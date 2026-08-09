/* 0.234.0-Test: Der Fragenkatalog je Muskel + Worte statt Rechenwerte.

   Die Zusagen:
   1. JEDER Muskel hat eine eigene, AUSFORMULIERTE Check-Frage — ein kleiner
      Funktionstest zum Selbermachen, wie ein Arzt fragt. Kurz-Check und
      Wohlbefinden-Tab stellen dieselben Fragen.
   2. RECHENWERTE STEHEN NIRGENDS: Der Stand kommt in Worten (fitnessWort),
      der Korridor sagt in einem Satz, WO man steht (korridorWort), die
      Kalibrierung begruendet ohne Zahlen.
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
function grabObjekt(name){
  const i = src.indexOf("const " + name + " = {");
  if(i < 0) throw new Error("Objekt nicht gefunden: " + name);
  return src.slice(i, src.indexOf("};", i) + 2);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabObjekt("MUSKEL_CHECK_FRAGEN"),
  "const MUSKEL_ORDER = " + /order: (\[[^\]]+\])/.exec(src)[1].replace(/\n/g, "") + ";",
  "const MUSKEL_INFO = { neck:{ name:'Kopfwender (Hals)' } };",
  grabFn("muskelCheckFrage"), grabFn("fitnessWort"),
  grabFn("volumenKorridor"), grabFn("korridorWort"),
  "module.exports = { MUSKEL_CHECK_FRAGEN, MUSKEL_ORDER, muskelCheckFrage, fitnessWort, korridorWort };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Der Katalog ---------- */
pruefe("JEDER Muskel der Karte hat seine Frage",
  A.MUSKEL_ORDER.every(m => typeof A.MUSKEL_CHECK_FRAGEN[m] === "string"));
pruefe("keine Frage fuer einen Muskel, den es nicht gibt",
  Object.keys(A.MUSKEL_CHECK_FRAGEN).every(m => A.MUSKEL_ORDER.includes(m)));
pruefe("jede Frage ist ausformuliert (Bewegung + Frage, keine Formel)",
  A.MUSKEL_ORDER.every(m => A.MUSKEL_CHECK_FRAGEN[m].length > 40 && A.MUSKEL_CHECK_FRAGEN[m].endsWith("?")));
pruefe("jede Frage enthaelt eine Handlung zum Ausprobieren",
  A.MUSKEL_ORDER.every(m => /—/.test(A.MUSKEL_CHECK_FRAGEN[m])));
pruefe("die Fragen sind je Muskel verschieden",
  new Set(A.MUSKEL_ORDER.map(m => A.MUSKEL_CHECK_FRAGEN[m])).size === A.MUSKEL_ORDER.length);
/* Keine Diagnose-Sprache — die App fragt, sie befundet nicht. */
pruefe("keine Diagnose-Woerter in den Fragen",
  A.MUSKEL_ORDER.every(m => !/Riss|Zerrung|Entzündung|Verletzung|Syndrom/i.test(A.MUSKEL_CHECK_FRAGEN[m])));
pruefe("ein unbekannter Muskel bekommt den ehrlichen Rueckfall",
  A.muskelCheckFrage("neu_muskel").indexOf("bewusst durch") > 0);
pruefe("der Rueckfall nutzt den Namen, wenn er bekannt ist",
  A.muskelCheckFrage("neck") === A.MUSKEL_CHECK_FRAGEN.neck);

/* ---------- 2) Worte statt Zahlen ---------- */
pruefe("der Stand kommt in Worten",
  A.fitnessWort(0.65) === "ganz am Anfang" && A.fitnessWort(0.8) === "im Aufbau" &&
  A.fitnessWort(0.9) === "gefestigt" && A.fitnessWort(1.05) === "weit entwickelt");
pruefe("kaputte Werte werfen nicht", typeof A.fitnessWort(null) === "string");
pruefe("der Korridor sagt WO man steht",
  A.korridorWort(0, 20).indexOf("unbelastet") > 0 &&
  A.korridorWort(4, 20).indexOf("Luft") > 0 &&
  A.korridorWort(12, 20).indexOf("produktiven") > 0 &&
  A.korridorWort(22, 20).indexOf("Richtwert") > 0 &&
  A.korridorWort(27, 20).indexOf("Verletzungsrisiko") > 0);
pruefe("die Grenzen stimmen mit dem Korridor ueberein",
  A.korridorWort(7.9, 20).indexOf("Luft") > 0 && A.korridorWort(8, 20).indexOf("produktiven") > 0 &&
  A.korridorWort(25.9, 20).indexOf("Richtwert") > 0 && A.korridorWort(26, 20).indexOf("Grenze") > 0);
pruefe("ohne Kapazitaet kein Satz", A.korridorWort(5, 0) === "");

/* ---------- 3) Verdrahtung ---------- */
/* 0.242: Der Kurz-Check ist der Muskel-Check-Wizard geworden. */
const karte = grabFn("muskelCheckSchritt");
pruefe("der Kurz-Check stellt die Frage des Muskels", karte.includes("muskelCheckFrage(m)"));
pruefe("der Wohlbefinden-Tab stellt dieselbe Frage",
  grabFn("beschwerdeFragen").includes("aktionsMenue(muskelCheckFrage(key)"));
/* Die Zahlen sind wirklich von der Oberflaeche verschwunden. */
pruefe("keine Fitness-Zahl mehr in der Grundlagen-Zeile",
  !grabFn("grundlageText").includes("Fitness-Zahl") &&
  grabFn("grundlageText").includes('"Stand: " + g.stand'));
pruefe("die Kalibrierung begruendet ohne Zahlen",
  !grabFn("kalibrierungAnwenden").includes("v.schnitt"));
pruefe("die Korridor-Zeile baut keine Zahlen mehr zusammen",
  !grabFn("korridorZeileHtml").includes("kor.mindest +") &&
  grabFn("korridorZeileHtml").includes("korridorWort(a.saetze, a.kapazitaet)"));

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("APP_VERSION passt zu VERSION", (() => {
  const [, mi, pa] = /const VERSION = "([\d.]+)";/.exec(src)[1].split(".");
  return Number(/const APP_VERSION = (\d+);/.exec(src)[1]) === Number(mi) * 1000 + Number(pa);
})());
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.234.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
