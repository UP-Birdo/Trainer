/* v154-Test: das STUFEN-REGISTER — seit 0.251 mit drei Stufen und Faehigkeiten.

   Die Stufe blendet Oberflaeche ein und aus. Eine neue Ansicht, die niemand in
   VIEW_FAEHIGKEIT eintraegt, gilt stillschweigend auf jeder Stufe — und ist
   damit auch in den Notizen erreichbar, wo es sie gar nicht geben duerfte.
   Genau das faellt hier auf: JEDE Ansicht muss entweder eine Faehigkeit haben
   ODER unten ausdruecklich als „jede Stufe" gefuehrt sein. Wer eine Ansicht
   ergaenzt, muss sich also entscheiden.

   0.251 (Nutzer-Entscheidung 25.09.2026): drei Stufen — Notizen (1),
   Training (3), Begleiter (5). Code fragt darf("fragen") statt einer Zahl;
   die EINE Tabelle dafuer ist FAEHIGKEIT_AB. Alte gespeicherte Werte (2, 4)
   ordnet stufe() beim Lesen zu, ohne etwas umzuschreiben.
   Hinweis: in Test-LABELS keine typografischen Anfuehrungszeichen (Haus-Falle). */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

/* ---- Register: Ansichten, die BEWUSST auf jeder Stufe erreichbar sind ---- */
const JEDE_STUFE = [
  "view-login", "view-code", "view-willkommen",     // vor der Anmeldung
  "view-simpelheit",                                 // die Stufen-Auswahl selbst
  "view-plaene",                                     // die Notizen: der Notizblock
  "view-einstellungen", "view-einst-darstellung",    // „Mehr" + Darstellung
  "view-einst-konto", "view-einst-hilfe",            // Konto/Hilfe brauchen alle
  "view-neuigkeiten", "view-wissen",                 // Lesestoff
  /* v173: Werkzeuge und Nachschlagewerk. Bewusst auf jeder Stufe — sie
     VERLANGEN nichts und BEWERTEN nichts (Leitplanke 8 haelt Analyse und
     Rueckfragen fern, nicht Werkzeug und Nachschlagen). */
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

/* Die ECHTE stufe() — nur `sitzung` ist ein Stub, damit sich gespeicherte
   Werte (auch alte wie 2 und 4) einsetzen lassen. */
const code = [
  "const STUFE = " + grabLiteral("STUFE") + ";",
  "const FAEHIGKEIT_AB = " + grabLiteral("FAEHIGKEIT_AB") + ";",
  "const VIEW_FAEHIGKEIT = " + grabLiteral("VIEW_FAEHIGKEIT") + ";",
  "const SIMPELHEIT_STUFEN = " + grabLiteral("SIMPELHEIT_STUFEN") + ";",
  "let sitzung = { daten: { einrichtung: { simpelheit: 5 } } };",
  grabFn("stufe"),
  grabFn("darf"),
  grabFn("viewErlaubt"),
  grabFn("navTabsFuerStufe"),
  "function setze(s){ sitzung.daten.einrichtung.simpelheit = s; }",
  "module.exports = { STUFE, FAEHIGKEIT_AB, VIEW_FAEHIGKEIT, SIMPELHEIT_STUFEN, navTabsFuerStufe," +
  " stufeBei: s => { setze(s); return stufe(); }," +
  " darfBei: (f, s) => { setze(s); return darf(f); }," +
  " erlaubtBei: (id, s) => { setze(s); return viewErlaubt(id); }," +
  " ohneSitzung: () => { const alt = sitzung; sitzung = null; const s = stufe(); sitzung = alt; return s; } };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const alleViews = [...src.matchAll(/<section id="(view-[a-z-]+)"/g)].map(m => m[1]);

/* ---------- 1) Jede Ansicht hat eine Entscheidung ---------- */
const unentschieden = alleViews.filter(v => !A.VIEW_FAEHIGKEIT[v] && !JEDE_STUFE.includes(v));
pruefe("keine Ansicht ohne Stufen-Entscheidung" + (unentschieden.length ? " (" + unentschieden.join(", ") + ")" : ""),
  unentschieden.length === 0);
const doppelt = alleViews.filter(v => A.VIEW_FAEHIGKEIT[v] && JEDE_STUFE.includes(v));
pruefe("keine Ansicht in beiden Listen" + (doppelt.length ? " (" + doppelt.join(", ") + ")" : ""), doppelt.length === 0);
const leichen = Object.keys(A.VIEW_FAEHIGKEIT).filter(v => !alleViews.includes(v));
pruefe("keine Faehigkeit fuer eine Ansicht, die es nicht gibt" + (leichen.length ? " (" + leichen.join(", ") + ")" : ""),
  leichen.length === 0);
const registerLeichen = JEDE_STUFE.filter(v => !alleViews.includes(v));
pruefe("kein Eintrag im Register ohne Ansicht" + (registerLeichen.length ? " (" + registerLeichen.join(", ") + ")" : ""),
  registerLeichen.length === 0);
const unbekannt = Object.keys(A.VIEW_FAEHIGKEIT).filter(v => !(A.VIEW_FAEHIGKEIT[v] in A.FAEHIGKEIT_AB));
pruefe("jede Ansicht nennt eine bekannte Faehigkeit" + (unbekannt.length ? " (" + unbekannt.join(", ") + ")" : ""),
  unbekannt.length === 0);

/* ---------- 2) Die drei Stufen und die Zuordnung alter Werte ---------- */
pruefe("es gibt genau drei Stufen-Kennungen",
  JSON.stringify(A.STUFE) === JSON.stringify({ NOTIZEN:1, TRAINING:3, BEGLEITER:5 }));
pruefe("stufe() liefert nur 1, 3 oder 5", [1,2,3,4,5].every(s => [1,3,5].includes(A.stufeBei(s))));
pruefe("alte Stufe 2 wird zu den Notizen", A.stufeBei(2) === 1);
pruefe("alte Stufe 4 wird zum Begleiter", A.stufeBei(4) === 5);
pruefe("unveraendert: 1, 3, 5", A.stufeBei(1) === 1 && A.stufeBei(3) === 3 && A.stufeBei(5) === 5);
pruefe("kaputter Wert zeigt den vollen Stand", A.stufeBei(9) === 5 && A.stufeBei("3") === 5 && A.stufeBei(null) === 5);
pruefe("ohne Anmeldung der volle Stand", A.ohneSitzung() === 5);
/* Die Zuordnung passiert beim LESEN — stufe() schreibt nichts zurueck. */
pruefe("stufe() schreibt nichts um (Datenvertrag)", !grabFn("stufe").includes("simpelheit ="));

/* ---------- 3) Die Faehigkeiten-Tabelle und darf() ---------- */
pruefe("Training ab der Trainings-Stufe", A.FAEHIGKEIT_AB.training === 3);
pruefe("Auswertung, Fragen, Planung erst im Begleiter",
  A.FAEHIGKEIT_AB.auswertung === 5 && A.FAEHIGKEIT_AB.fragen === 5 && A.FAEHIGKEIT_AB.planung === 5);
/* Leitplanke 8: In den Notizen wird nichts gefragt und nichts bewertet. */
pruefe("Notizen: nichts fragen, nichts auswerten",
  !A.darfBei("fragen", 1) && !A.darfBei("auswertung", 1) && !A.darfBei("training", 1));
pruefe("Training: trainieren ja, fragen nein",
  A.darfBei("training", 3) && !A.darfBei("fragen", 3) && !A.darfBei("auswertung", 3));
pruefe("Begleiter darf alles", Object.keys(A.FAEHIGKEIT_AB).every(f => A.darfBei(f, 5)));
pruefe("unbekannte Faehigkeit scheitert laut", (() => { try { A.darfBei("gibtsnicht", 5); return false; } catch(e){ return true; } })());
/* Kein Code fragt mehr eine Stufen-ZAHL ab — nur darf() selbst. */
const zahlVergleiche = [...src.matchAll(/stufe\(\)\s*(>=|<=|<|>|===|!==)\s*\d/g)];
pruefe("keine Stufen-Zahl mehr im Code (gefunden: " + zahlVergleiche.length + ")", zahlVergleiche.length === 0);
pruefe("die alte Tabelle ist weg", !src.includes("const VIEW_MIN_STUFE"));

/* ---------- 4) viewErlaubt arbeitet wie beschrieben ---------- */
pruefe("Begleiter darf alles sehen", alleViews.every(v => A.erlaubtBei(v, 5)));
pruefe("Notizen duerfen den Notizblock", A.erlaubtBei("view-plaene", 1));
pruefe("Notizen duerfen kein Training", !A.erlaubtBei("view-training", 1));
pruefe("Training darf trainieren, aber keine Statistik",
  A.erlaubtBei("view-training", 3) && !A.erlaubtBei("view-statistik", 3));
pruefe("die Uebungs-Suche folgt dem Editor",
  A.VIEW_FAEHIGKEIT["view-uebung-picker"] === A.VIEW_FAEHIGKEIT["view-editor"]);
pruefe("jede Stufe kann irgendwo hin (Notizblock oder Heute)",
  [1,3,5].every(s => A.erlaubtBei("view-plaene", s) || A.erlaubtBei("view-start", s)));

/* ---------- 5) Die Nav-Leiste passt zu den erlaubten Ansichten ---------- */
pruefe("Notizen haben keine Leiste", A.navTabsFuerStufe(1).length === 0);
pruefe("Training ohne Statistik-Tab", !A.navTabsFuerStufe(3).includes("nav-statistik"));
pruefe("Begleiter mit Statistik-Tab", A.navTabsFuerStufe(5).includes("nav-statistik"));
const tabZiel = { "nav-start":"view-start", "nav-plaene":"view-plaene",
                  "nav-statistik":"view-statistik", "nav-einst":"view-einstellungen" };
const falscheTabs = [];
[3,5].forEach(s => A.navTabsFuerStufe(s).forEach(t => {
  if(!A.erlaubtBei(tabZiel[t], s)) falscheTabs.push("Stufe " + s + ": " + t);
}));
pruefe("kein Tab zeigt auf eine gesperrte Ansicht" + (falscheTabs.length ? " (" + falscheTabs.join(", ") + ")" : ""),
  falscheTabs.length === 0);

/* ---------- 6) Bloecke INNERHALB einer Ansicht, die an der Stufe haengen ---------- */
const darst = grabFn("einstDarstellungOeffnen");
pruefe("Audio erst mit dem Training",
  darst.includes('document.getElementById("darst-audio-karte").hidden = !darf("training")'));
pruefe("Statistik-Auswahl erst mit der Auswertung",
  darst.includes('document.getElementById("darst-statistik-karte").hidden = !darf("auswertung")'));
const mehr = grabFn("einstellungenOeffnen");
pruefe("Profil-Zeile erst mit der Planung", mehr.includes('"mehr-profil-zeile").hidden = !darf("planung")'));
pruefe("die Werkzeuge-Zeile fragt die eine Quelle",
  mehr.includes('"mehr-werkzeuge-zeile").hidden = !viewErlaubt("view-einst-werkzeuge")'));
pruefe("und die Quelle sagt: jede Stufe (keine Sperre eingetragen)",
  !A.VIEW_FAEHIGKEIT["view-einst-werkzeuge"] && A.erlaubtBei("view-einst-werkzeuge", 1));
pruefe("die beiden Ansichten dahinter genauso",
  A.erlaubtBei("view-bibliothek", 1) && A.erlaubtBei("view-papierkorb", 1));
pruefe("was fragt, bleibt bei den Fragen",
  A.VIEW_FAEHIGKEIT["view-tagescheck"] === "fragen" && A.VIEW_FAEHIGKEIT["view-tageswert"] === "fragen");
pruefe("was bewertet, bleibt bei der Auswertung",
  A.VIEW_FAEHIGKEIT["view-statistik"] === "auswertung" && A.VIEW_FAEHIGKEIT["view-muskeln"] === "auswertung");
pruefe("Ziele bleiben ohne Planung leer", grabFn("zieleStartZeichnen").includes('if(!darf("planung"))'));

/* ---------- 7) Die Stufen-Liste selbst ---------- */
pruefe("es gibt genau drei Stufen", A.SIMPELHEIT_STUFEN.length === 3);
pruefe("sie tragen die Kennungen 1, 3, 5",
  A.SIMPELHEIT_STUFEN.map(s => s.n).join(",") === "1,3,5");
pruefe("jede hat Titel, Kurzform, Erklaerung, Bild und Symbol",
  A.SIMPELHEIT_STUFEN.every(s => s.titel && s.kurz && s.fuer && s.text &&
    /^<svg /.test(s.bild) && /^<svg /.test(s.symbol)));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
