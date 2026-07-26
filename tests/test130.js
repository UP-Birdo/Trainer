/* v130-Test: zwei Fehler.
   (1) Das `hidden`-Attribut wurde von eigenen display-Regeln ausgehebelt — auf
       Stufe 3 blieb dadurch der Statistik-Tab in der Leiste stehen.
   (2) Im hellen Modus hatte die iOS-Leiste keinen Hintergrund.
   Beides ist CSS; getestet wird die Regel selbst plus die Logik dahinter
   (`navTabsFuerStufe` — sie war korrekt und muss es bleiben).
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
new Function("module", "exports",
  [grabFn("navTabsFuerStufe"), "module.exports = { navTabsFuerStufe };"].join("\n")
)(modul, modul.exports);
const navTabsFuerStufe = modul.exports.navTabsFuerStufe;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Die Stufen-Logik (war schon richtig — Regression sichern). */
pruefe("Stufe 1 ohne Leiste", navTabsFuerStufe(1).length === 0);
pruefe("Stufe 2 ohne Leiste", navTabsFuerStufe(2).length === 0);
pruefe("Stufe 3 OHNE Statistik", !navTabsFuerStufe(3).includes("nav-statistik"));
pruefe("Stufe 3 hat Heute, Plaene, Mehr",
  navTabsFuerStufe(3).join() === "nav-start,nav-plaene,nav-einst");
pruefe("Stufe 4 MIT Statistik", navTabsFuerStufe(4).includes("nav-statistik"));
pruefe("Stufe 5 MIT Statistik", navTabsFuerStufe(5).includes("nav-statistik"));

/* 2) Der eigentliche Fix: hidden schlaegt jede display-Regel. */
pruefe("globale hidden-Regel vorhanden", /\[hidden\]\{display:none !important\}/.test(src));
pruefe("Regel steht VOR den display-Regeln der Leiste",
  src.indexOf("[hidden]{display:none") < src.indexOf("#nav button{"));
pruefe("Nav-Buttons werden weiterhin per hidden gesteuert",
  /getElementById\(k\)\.hidden = !tabs\.includes\(k\)/.test(src));

/* 3) Diese Stellen litten am selben Fehler — sie muessen weiter hidden nutzen
      (die Regel repariert sie, der Code darf nicht auf Klassen umgebaut werden). */
pruefe("Profil-Zeile unter Mehr nutzt hidden",
  src.includes('document.getElementById("mehr-profil-zeile").hidden = stufe() < 5'));
pruefe("Mass-Stepper nutzt hidden",
  src.includes('document.getElementById("akt-mass-stepper").hidden = istSkala'));

/* 4) Helle Leiste: eigener Hintergrund, ohne den iOS-Look zu verlieren. */
pruefe("helle iOS-Leiste bekommt Hintergrund",
  /html\.hell body\.sys-ios #nav\{[^}]*background:var\(--panel\)/.test(src));
pruefe("und ihre Trennlinie", /html\.hell body\.sys-ios #nav\{[^}]*border-top:2px solid var\(--line\)/.test(src));
pruefe("dunkle iOS-Leiste bleibt transparent",
  /body\.sys-ios #nav\{ background:transparent/.test(src));
pruefe("Pill-Optik unangetastet", /body\.sys-ios #nav button\.aktiv::before\{ transform:none; opacity:1; \}/.test(src));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
