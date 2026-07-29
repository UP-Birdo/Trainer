/* v173-Test: ehrliche Stufen-Beschreibung, lesbare Auswahl, Werkzeuge fuer alle.

   Drei Befunde aus dem Persona-Durchgang „Thomas" (Stufe Notizblock):
   1. Die Stufe versprach „festhalten, was war" — der Notizblock speichert aber
      nur den AKTUELLEN Stand, keinen Verlauf. Die Zielgruppe waehlte die Stufe
      mit einer falschen Erwartung.
   2. Die gewaehlte Karte in der Stufen-Auswahl ist gelb, Titel und Text blieben
      weiss/grau — und es traf immer die AKTUELLE Stufe.
   3. Der Scheibenrechner fehlte genau seiner Zielgruppe: Werkzeuge gab es erst
      ab Stufe 3.

   Der dritte Punkt beruehrt Leitplanke 8 — deshalb wird hier BEIDES geprueft:
   dass die Werkzeuge herunterkommen UND dass alles, was fragt oder bewertet,
   oben bleibt.
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
function grabLiteral(name, klammer){
  const auf = klammer || "[", zu = auf === "[" ? "]" : "}";
  const i = src.indexOf("const " + name + " = ");
  if(i < 0) throw new Error("Literal nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf(auf, i); k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabLiteral("SIMPELHEIT_STUFEN"),
  grabLiteral("SIMPELHEIT_REIHENFOLGE"),
  grabLiteral("VIEW_MIN_STUFE", "{"),
  "let aktuelleStufe = 5;",
  "function stufe(){ return aktuelleStufe; }",
  grabFn("viewErlaubt"),
  grabFn("simpelheitListe"),
  "module.exports = { SIMPELHEIT_STUFEN, VIEW_MIN_STUFE, simpelheitListe," +
  " erlaubtBei: (id, s) => { aktuelleStufe = s; return viewErlaubt(id); } };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const stufe1 = A.SIMPELHEIT_STUFEN.find(s => s.n === 1);
const stufe2 = A.SIMPELHEIT_STUFEN.find(s => s.n === 2);

/* ---------- 1) Die Beschreibung verspricht nichts, was die Stufe nicht kann ---------- */
pruefe("Stufe 1 verspricht keinen Rueckblick mehr",
  !/was war/.test(stufe1.fuer) && !/was war/.test(stufe1.text));
pruefe("und sagt ausdruecklich, dass es keinen Verlauf gibt",
  /ohne Verlauf/.test(stufe1.text));
pruefe("Stufe 2 sagt es auch", /ohne Verlauf/.test(stufe2.text));
pruefe("keine Stufe 1/2 verspricht einen Verlauf",
  [stufe1, stufe2].every(s => !/Verlauf,|Verlauf\.|Historie|Protokoll/.test(s.fuer)));
pruefe("die Zielgruppe bleibt genannt (v156-Zusage)",
  /Für Erfahrene/.test(stufe1.fuer) && /Für Erfahrene/.test(stufe2.fuer));
pruefe("der Vollausbau bleibt der fuer den Anfang (v156-Zusage)",
  /Für den Anfang/.test(A.SIMPELHEIT_STUFEN.find(s => s.n === 5).fuer));
pruefe("alle Zielgruppen-Saetze bleiben verschieden",
  new Set(A.SIMPELHEIT_STUFEN.map(s => s.fuer)).size === 5);
pruefe("alle Beschreibungen bleiben verschieden",
  new Set(A.SIMPELHEIT_STUFEN.map(s => s.text)).size === 5);
pruefe("die gespeicherten Nummern bleiben 1..5 (Datenvertrag)",
  A.SIMPELHEIT_STUFEN.every((s, i) => s.n === i + 1));
pruefe("die Auswahl-Reihenfolge bleibt 5 -> 1",
  A.simpelheitListe().map(s => s.n).join(",") === "5,4,3,2,1");

/* ---------- 2) Die gewaehlte Karte ist lesbar ---------- */
pruefe("die Ueberschrift der gewaehlten Karte wird dunkel",
  /\.stufe-wahl\.gewaehlt strong\{color:#16181C\}/.test(src));
pruefe("die Beschreibungen darunter auch",
  /\.stufe-wahl\.gewaehlt \.meta\{color:#16181C/.test(src));
pruefe("die Haus-Regel AUSGEWAEHLT = GELB bleibt unangetastet",
  /button\.gewaehlt\{background:var\(--signal\);color:#16181C\}/.test(src));
pruefe("und sie steht weiterhin als letzte Regel im Stylesheet",
  src.indexOf("button.gewaehlt{background:var(--signal)") >
  src.indexOf(".stufe-wahl.gewaehlt strong"));

/* ---------- 3) Werkzeuge ab Stufe 1 ----------
   Nicht in VIEW_MIN_STUFE gelistet heisst „gilt ab Stufe 1" — so will es der
   Register-Vertrag aus test154: In der Tabelle stehen nur echte Sperren. */
pruefe("das Untermenue Werkzeuge traegt keine Sperre mehr",
  !A.VIEW_MIN_STUFE["view-einst-werkzeuge"]);
pruefe("und ist auf Stufe 1 erreichbar", A.erlaubtBei("view-einst-werkzeuge", 1));
pruefe("die Bibliothek auch",
  !A.VIEW_MIN_STUFE["view-bibliothek"] && A.erlaubtBei("view-bibliothek", 1));
pruefe("der Papierkorb auch",
  !A.VIEW_MIN_STUFE["view-papierkorb"] && A.erlaubtBei("view-papierkorb", 1));
pruefe("auf Stufe 2 natuerlich ebenso",
  A.erlaubtBei("view-einst-werkzeuge", 2) && A.erlaubtBei("view-bibliothek", 2));
pruefe("die Menue-Zeile fragt die eine Quelle statt einer eigenen Zahl",
  grabFn("einstellungenOeffnen")
    .includes('"mehr-werkzeuge-zeile").hidden = !viewErlaubt("view-einst-werkzeuge")'));
pruefe("Mehr ist auf Stufe 1/2 ueberhaupt erreichbar (Rueckweg vorhanden)",
  grabFn("einstellungenOeffnen").includes('"mehr-zurueck").hidden = stufe() > 2'));
pruefe("die drei Karten liegen unveraendert in ihrer Ansicht",
  ["mehr-werkzeuge-karte","mehr-bibliothek-karte","mehr-papierkorb-karte"]
    .every(id => src.includes('id="' + id + '"')));

/* ---------- 4) Leitplanke 8 bleibt scharf ---------- */
/* Was FRAGT oder BEWERTET, bleibt oben — sonst waere die Grenze aufgeweicht
   statt praezisiert. */
[["view-tagescheck",4],["view-statistik",4],["view-muskeln",4],["view-verlauf",4],
 ["view-gewicht",4],["view-tageswert",4],["view-koerpermasse",4],["view-kalender",4]]
  .forEach(([id, min]) => {
    pruefe(id + " bleibt bei mindestens Stufe " + min, A.VIEW_MIN_STUFE[id] >= min);
    pruefe(id + " ist auf Stufe 2 gesperrt", !A.erlaubtBei(id, 2));
  });
pruefe("das gefuehrte Training bleibt ab Stufe 3",
  A.VIEW_MIN_STUFE["view-training"] === 3 && A.VIEW_MIN_STUFE["view-vorschau"] === 3);
pruefe("Profil und Sportarten bleiben ab Stufe 5",
  A.VIEW_MIN_STUFE["view-profil"] === 5 && A.VIEW_MIN_STUFE["view-sportarten"] === 5);
pruefe("die Statistik-Auswahl bleibt an Stufe 4 gebunden",
  grabFn("einstDarstellungOeffnen").includes('"darst-statistik-karte").hidden = stufe() < 4'));
pruefe("die Ansagen bleiben an Stufe 3 gebunden",
  grabFn("einstDarstellungOeffnen").includes('"darst-audio-karte").hidden = stufe() < 3'));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v173",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 173);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.173", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
