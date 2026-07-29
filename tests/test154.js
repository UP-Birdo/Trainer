/* v154-Test: das STUFEN-REGISTER.

   Die Simpelheits-Stufe blendet Oberflaeche ein und aus. Eine neue Ansicht, die
   niemand in VIEW_MIN_STUFE eintraegt, gilt stillschweigend ab Stufe 1 — und ist
   damit auch auf dem Notizblock erreichbar, wo es sie gar nicht geben duerfte.
   Genau das faellt hier auf: JEDE Ansicht muss entweder eine Mindeststufe haben
   ODER unten ausdruecklich als „gilt ab Stufe 1" gefuehrt sein. Wer eine Ansicht
   ergaenzt, muss sich also entscheiden.

   Dazu die Stufen-Logik selbst (`viewErlaubt`, `navTabsFuerStufe`) und die
   Bloecke, die innerhalb einer Ansicht an der Stufe haengen.
   Hinweis: in Test-LABELS keine typografischen Anfuehrungszeichen (Haus-Falle). */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

/* ---- Register: Ansichten, die BEWUSST auf jeder Stufe erreichbar sind ---- */
const AB_STUFE_1 = [
  "view-login", "view-code", "view-willkommen",     // vor der Anmeldung
  "view-simpelheit",                                 // die Stufen-Auswahl selbst
  "view-plaene",                                     // Stufe 1/2: der Notizblock
  "view-einstellungen", "view-einst-darstellung",    // „Mehr" + Darstellung
  "view-einst-konto", "view-einst-hilfe",            // Konto/Hilfe brauchen alle
  "view-neuigkeiten", "view-wissen",                 // Lesestoff
  /* v173: Werkzeuge und Nachschlagewerk. Bewusst ab Stufe 1 — sie VERLANGEN
     nichts und BEWERTEN nichts (Leitplanke 8 haelt Analyse und Rueckfragen
     fern, nicht Werkzeug und Nachschlagen). Der Scheibenrechner fehlte sonst
     genau seiner Zielgruppe: dem Langhantel-Erfahrenen auf dem Notizblock. */
  "view-einst-werkzeuge", "view-bibliothek", "view-papierkorb"
];

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
function grabLiteral(name){
  const decl = "const " + name + " = ";
  const i = src.indexOf(decl);
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  let start = i + decl.length;
  while(start < src.length && src[start] !== "{" && src[start] !== "[") start++;
  const auf = src[start], zu = auf === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const code = [
  "const VIEW_MIN_STUFE = " + grabLiteral("VIEW_MIN_STUFE") + ";",
  "const SIMPELHEIT_STUFEN = " + grabLiteral("SIMPELHEIT_STUFEN") + ";",
  "let aktuelleStufe = 5;",
  "function stufe(){ return aktuelleStufe; }",
  grabFn("viewErlaubt"),
  grabFn("navTabsFuerStufe"),
  "module.exports = { VIEW_MIN_STUFE, SIMPELHEIT_STUFEN, navTabsFuerStufe," +
    " erlaubtBei: (id, s) => { aktuelleStufe = s; return viewErlaubt(id); } };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const { VIEW_MIN_STUFE, SIMPELHEIT_STUFEN, navTabsFuerStufe, erlaubtBei } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const alleViews = [...src.matchAll(/<section id="(view-[a-z-]+)"/g)].map(m => m[1]);

/* ---------- 1) Jede Ansicht hat eine Entscheidung ---------- */
const unentschieden = alleViews.filter(v => !VIEW_MIN_STUFE[v] && !AB_STUFE_1.includes(v));
pruefe("keine Ansicht ohne Stufen-Entscheidung" + (unentschieden.length ? " (" + unentschieden.join(", ") + ")" : ""),
  unentschieden.length === 0);
const doppelt = alleViews.filter(v => VIEW_MIN_STUFE[v] && AB_STUFE_1.includes(v));
pruefe("keine Ansicht in beiden Listen" + (doppelt.length ? " (" + doppelt.join(", ") + ")" : ""), doppelt.length === 0);
const leichen = Object.keys(VIEW_MIN_STUFE).filter(v => !alleViews.includes(v));
pruefe("keine Mindeststufe fuer eine Ansicht, die es nicht gibt" + (leichen.length ? " (" + leichen.join(", ") + ")" : ""),
  leichen.length === 0);
const registerLeichen = AB_STUFE_1.filter(v => !alleViews.includes(v));
pruefe("kein Eintrag im Register ohne Ansicht" + (registerLeichen.length ? " (" + registerLeichen.join(", ") + ")" : ""),
  registerLeichen.length === 0);
const komischeStufe = Object.keys(VIEW_MIN_STUFE).filter(v => ![2,3,4,5].includes(VIEW_MIN_STUFE[v]));
pruefe("Mindeststufen liegen zwischen 2 und 5" + (komischeStufe.length ? " (" + komischeStufe.join(", ") + ")" : ""),
  komischeStufe.length === 0);

/* ---------- 2) viewErlaubt arbeitet wie beschrieben ---------- */
pruefe("Stufe 5 darf alles", alleViews.every(v => erlaubtBei(v, 5)));
pruefe("Stufe 1 darf den Notizblock", erlaubtBei("view-plaene", 1));
pruefe("Stufe 1 darf kein Training", !erlaubtBei("view-training", 1));
pruefe("Stufe 3 darf trainieren, aber keine Statistik",
  erlaubtBei("view-training", 3) && !erlaubtBei("view-statistik", 3));
pruefe("Stufe 4 darf Statistik, aber kein Profil",
  erlaubtBei("view-statistik", 4) && !erlaubtBei("view-profil", 4));
pruefe("die Uebungs-Suche folgt dem Editor",
  VIEW_MIN_STUFE["view-uebung-picker"] === VIEW_MIN_STUFE["view-editor"]);
pruefe("jede Stufe kann irgendwo hin (Notizblock oder Heute)",
  [1,2,3,4,5].every(s => erlaubtBei("view-plaene", s) || erlaubtBei("view-start", s)));

/* ---------- 3) Die Nav-Leiste passt zu den erlaubten Ansichten ---------- */
pruefe("Stufe 1/2 haben keine Leiste", navTabsFuerStufe(1).length === 0 && navTabsFuerStufe(2).length === 0);
pruefe("Stufe 3 ohne Statistik-Tab", !navTabsFuerStufe(3).includes("nav-statistik"));
pruefe("Stufe 4 und 5 mit Statistik-Tab",
  navTabsFuerStufe(4).includes("nav-statistik") && navTabsFuerStufe(5).includes("nav-statistik"));
/* Ein Tab darf nie auf eine Ansicht zeigen, die die Stufe gar nicht sehen darf. */
const tabZiel = { "nav-start":"view-start", "nav-plaene":"view-plaene",
                  "nav-statistik":"view-statistik", "nav-einst":"view-einstellungen" };
const falscheTabs = [];
[3,4,5].forEach(s => navTabsFuerStufe(s).forEach(t => {
  if(!erlaubtBei(tabZiel[t], s)) falscheTabs.push("Stufe " + s + ": " + t);
}));
pruefe("kein Tab zeigt auf eine gesperrte Ansicht" + (falscheTabs.length ? " (" + falscheTabs.join(", ") + ")" : ""),
  falscheTabs.length === 0);

/* ---------- 4) Bloecke INNERHALB einer Ansicht, die an der Stufe haengen ---------- */
const darst = grabFn("einstDarstellungOeffnen");
pruefe("Audio erst mit dem Training (Stufe 3)",
  darst.includes('document.getElementById("darst-audio-karte").hidden = stufe() < 3'));
pruefe("Statistik-Auswahl erst mit dem Statistik-Tab (Stufe 4)",
  darst.includes('document.getElementById("darst-statistik-karte").hidden = stufe() < 4'));
const mehr = grabFn("einstellungenOeffnen");
pruefe("Profil-Zeile erst ab Stufe 5", mehr.includes('"mehr-profil-zeile").hidden = stufe() < 5'));
/* v173: Die Werkzeuge gelten ab Stufe 1 (Nutzer-Einwand: der Scheibenrechner
   fehlte genau seiner Zielgruppe). Die Zeile fragt seither die EINE Quelle
   statt einer eigenen Zahl — so koennen Menue-Zeile und Ansicht nicht
   auseinanderlaufen. */
pruefe("die Werkzeuge-Zeile fragt die eine Quelle",
  mehr.includes('"mehr-werkzeuge-zeile").hidden = !viewErlaubt("view-einst-werkzeuge")'));
pruefe("und die Quelle sagt: ab Stufe 1 (keine Sperre eingetragen)",
  !VIEW_MIN_STUFE["view-einst-werkzeuge"] && erlaubtBei("view-einst-werkzeuge", 1));
pruefe("die beiden Ansichten dahinter genauso",
  erlaubtBei("view-bibliothek", 1) && erlaubtBei("view-papierkorb", 1));
/* Die harte Grenze aus Leitplanke 8 bleibt, wo sie hingehoert: alles, was
   fragt oder bewertet, ist weiterhin ab 4. */
pruefe("was fragt und bewertet, bleibt oben",
  VIEW_MIN_STUFE["view-tagescheck"] >= 4 && VIEW_MIN_STUFE["view-statistik"] >= 4 &&
  VIEW_MIN_STUFE["view-muskeln"] >= 4);
pruefe("Ziele bleiben unter Stufe 5 leer", grabFn("zieleStartZeichnen").includes("if(stufe() < 5)"));

/* ---------- 5) Die Stufen-Liste selbst ---------- */
pruefe("es gibt genau fuenf Stufen", SIMPELHEIT_STUFEN.length === 5);
pruefe("sie sind mit 1..5 durchnummeriert",
  SIMPELHEIT_STUFEN.every((s, i) => s.n === i + 1));
pruefe("jede hat Titel und Erklaerung", SIMPELHEIT_STUFEN.every(s => s.titel && s.text));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
