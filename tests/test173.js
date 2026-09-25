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
  // 0.251: Faehigkeiten statt Mindest-Stufen — die echte Tabelle samt darf()
  grabLiteral("STUFE", "{"),
  grabLiteral("FAEHIGKEIT_AB", "{"),
  grabLiteral("VIEW_FAEHIGKEIT", "{"),
  "let aktuelleStufe = 5;",
  "function stufe(){ return aktuelleStufe; }",
  grabFn("darf"),
  grabFn("viewErlaubt"),
  grabFn("simpelheitListe"),
  "module.exports = { SIMPELHEIT_STUFEN, VIEW_FAEHIGKEIT, simpelheitListe," +
  " erlaubtBei: (id, s) => { aktuelleStufe = s; return viewErlaubt(id); } };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 0.251: drei Stufen — die fruehere Stufe 2 ist in den Notizen aufgegangen. */
const notizen = A.SIMPELHEIT_STUFEN.find(s => s.n === 1);

/* ---------- 1) Die Beschreibung verspricht nichts, was die Stufe nicht kann ---------- */
pruefe("die Notizen versprechen keinen Rueckblick",
  !/was war/.test(notizen.fuer) && !/was war/.test(notizen.text));
pruefe("und sagen ausdruecklich, dass es keinen Verlauf gibt",
  /ohne Verlauf/.test(notizen.text));
pruefe("die Notizen versprechen keinen Verlauf",
  !/Verlauf,|Verlauf\.|Historie|Protokoll/.test(notizen.fuer));
pruefe("die Zielgruppe bleibt genannt (v156-Zusage)", /Für Erfahrene/.test(notizen.fuer));
pruefe("der Begleiter bleibt der fuer den Anfang (v156-Zusage)",
  /Für den Anfang/.test(A.SIMPELHEIT_STUFEN.find(s => s.n === 5).fuer));
pruefe("alle Zielgruppen-Saetze bleiben verschieden",
  new Set(A.SIMPELHEIT_STUFEN.map(s => s.fuer)).size === A.SIMPELHEIT_STUFEN.length);
pruefe("alle Beschreibungen bleiben verschieden",
  new Set(A.SIMPELHEIT_STUFEN.map(s => s.text)).size === A.SIMPELHEIT_STUFEN.length);
pruefe("die Kennungen bleiben aus dem alten Bereich 1..5 (Datenvertrag)",
  A.SIMPELHEIT_STUFEN.every(s => s.n >= 1 && s.n <= 5));
pruefe("die Auswahl-Reihenfolge bleibt von viel nach wenig",
  A.simpelheitListe().map(s => s.n).join(",") === "5,3,1");
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

/* ---------- 3) Werkzeuge auf jeder Stufe ----------
   Nicht in VIEW_FAEHIGKEIT gelistet heisst „gilt auf jeder Stufe" — so will es
   der Register-Vertrag aus test154: In der Tabelle stehen nur echte Sperren. */
pruefe("das Untermenue Werkzeuge traegt keine Sperre",
  !A.VIEW_FAEHIGKEIT["view-einst-werkzeuge"]);
pruefe("und ist in den Notizen erreichbar", A.erlaubtBei("view-einst-werkzeuge", 1));
pruefe("die Bibliothek auch",
  !A.VIEW_FAEHIGKEIT["view-bibliothek"] && A.erlaubtBei("view-bibliothek", 1));
pruefe("der Papierkorb auch",
  !A.VIEW_FAEHIGKEIT["view-papierkorb"] && A.erlaubtBei("view-papierkorb", 1));
pruefe("die Menue-Zeile fragt die eine Quelle statt einer eigenen Zahl",
  grabFn("einstellungenOeffnen")
    .includes('"mehr-werkzeuge-zeile").hidden = !viewErlaubt("view-einst-werkzeuge")'));
pruefe("Mehr ist in den Notizen ueberhaupt erreichbar (Rueckweg vorhanden)",
  grabFn("einstellungenOeffnen").includes('"mehr-zurueck").hidden = darf("training")'));
pruefe("die drei Karten liegen unveraendert in ihrer Ansicht",
  ["mehr-werkzeuge-karte","mehr-bibliothek-karte","mehr-papierkorb-karte"]
    .every(id => src.includes('id="' + id + '"')));

/* ---------- 4) Leitplanke 8 bleibt scharf ---------- */
/* Was FRAGT oder BEWERTET, bleibt oben — sonst waere die Grenze aufgeweicht
   statt praezisiert. Seit 0.251 heisst „oben": erst im Begleiter. */
["view-tagescheck","view-statistik","view-muskeln","view-verlauf",
 "view-gewicht","view-tageswert","view-koerpermasse","view-kalender"]
  .forEach(id => {
    pruefe(id + " braucht Auswertung oder Fragen",
      ["auswertung","fragen"].includes(A.VIEW_FAEHIGKEIT[id]));
    pruefe(id + " ist in den Notizen gesperrt", !A.erlaubtBei(id, 1));
    pruefe(id + " ist im Training gesperrt", !A.erlaubtBei(id, 3));
  });
pruefe("das gefuehrte Training bleibt beim Training",
  A.VIEW_FAEHIGKEIT["view-training"] === "training" && A.VIEW_FAEHIGKEIT["view-vorschau"] === "training");
pruefe("Profil und Sportarten bleiben bei der Planung",
  A.VIEW_FAEHIGKEIT["view-profil"] === "planung" && A.VIEW_FAEHIGKEIT["view-sportarten"] === "planung");
pruefe("die Statistik-Auswahl bleibt an der Auswertung",
  grabFn("einstDarstellungOeffnen").includes('"darst-statistik-karte").hidden = !darf("auswertung")'));
pruefe("die Ansagen bleiben am Training",
  grabFn("einstDarstellungOeffnen").includes('"darst-audio-karte").hidden = !darf("training")'));
/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v173",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 173);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.173", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
