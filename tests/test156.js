/* v156-Test: Die Stufen-Auswahl folgt dem Gedanken, nicht der Zaehlweise.
   Wer NEU ist, will viel sehen; wer erfahren ist, nur noch mitschreiben. Die
   Auswahl ist deshalb von „viel Anleitung" nach „wenig" sortiert, nennt je
   Stufe FUER WEN sie ist — und zeigt die interne Nummer nicht mehr.
   Wichtig: die gespeicherte Zahl 1..5 bleibt unveraendert (Datenvertrag).
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

const modul = { exports: {} };
new Function("module", "exports", [
  "const SIMPELHEIT_STUFEN = " + grabLiteral("SIMPELHEIT_STUFEN") + ";",
  "const SIMPELHEIT_REIHENFOLGE = " + grabLiteral("SIMPELHEIT_REIHENFOLGE") + ";",
  grabFn("simpelheitListe"),
  "module.exports = { SIMPELHEIT_STUFEN, SIMPELHEIT_REIHENFOLGE, simpelheitListe };"
].join("\n"))(modul, modul.exports);
const { SIMPELHEIT_STUFEN, SIMPELHEIT_REIHENFOLGE, simpelheitListe } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die Daten bleiben, wie sie waren ---------- */
pruefe("es gibt weiter genau fuenf Stufen", SIMPELHEIT_STUFEN.length === 5);
pruefe("die Nummern stehen unveraendert aufsteigend 1..5",
  SIMPELHEIT_STUFEN.every((s, i) => s.n === i + 1));
pruefe("keine Nummer wurde vertauscht (Datenvertrag)",
  SIMPELHEIT_STUFEN.find(s => s.n === 1).titel === "Notizblock" &&
  SIMPELHEIT_STUFEN.find(s => s.n === 5).titel === "Vollausbau");

/* ---------- 2) Jede Stufe sagt, fuer wen sie ist ---------- */
const ohneFuer = SIMPELHEIT_STUFEN.filter(s => !s.fuer).map(s => s.n);
pruefe("jede Stufe nennt ihre Zielgruppe" + (ohneFuer.length ? " (" + ohneFuer.join(", ") + ")" : ""),
  ohneFuer.length === 0);
pruefe("jede Stufe sagt auch, was sie zeigt", SIMPELHEIT_STUFEN.every(s => s.text && s.titel));
const zuKurz = SIMPELHEIT_STUFEN.filter(s => s.fuer.length < 25).map(s => s.n);
pruefe("kein Platzhalter-Text" + (zuKurz.length ? " (" + zuKurz.join(", ") + ")" : ""), zuKurz.length === 0);
pruefe("die Zielgruppen sind verschieden",
  new Set(SIMPELHEIT_STUFEN.map(s => s.fuer)).size === 5);
pruefe("der Vollausbau ist ausdruecklich fuer den Anfang",
  /Anfang/i.test(SIMPELHEIT_STUFEN.find(s => s.n === 5).fuer));
pruefe("der Notizblock ist ausdruecklich fuer Erfahrene",
  /Erfahren/i.test(SIMPELHEIT_STUFEN.find(s => s.n === 1).fuer));

/* ---------- 3) Die Anzeige-Reihenfolge dreht die Zaehlweise um ---------- */
pruefe("Reihenfolge ist 5,4,3,2,1", JSON.stringify(SIMPELHEIT_REIHENFOLGE) === JSON.stringify([5,4,3,2,1]));
const liste = simpelheitListe();
pruefe("die Liste hat alle fuenf, jede genau einmal",
  liste.length === 5 && new Set(liste.map(s => s.n)).size === 5);
pruefe("oben steht der Vollausbau", liste[0].n === 5);
pruefe("unten steht der Notizblock", liste[4].n === 1);
pruefe("die Liste ist absteigend", liste.every((s, i) => i === 0 || liste[i-1].n > s.n));
pruefe("sie liefert dieselben Objekte wie die Tabelle",
  liste.every(s => SIMPELHEIT_STUFEN.includes(s)));

/* ---------- 4) Verdrahtung ---------- */
const zeichnen = grabFn("simpelheitFrageZeichnen");
pruefe("die Auswahl nutzt die sortierte Liste", zeichnen.includes("simpelheitListe()"));
pruefe("und nicht mehr die rohe Tabelle", !zeichnen.includes("SIMPELHEIT_STUFEN.map("));
pruefe("die Nummer steht nicht mehr im Knopf", !zeichnen.includes("s.n + ' · '"));
pruefe("die Zielgruppe steht ueber der Funktionsliste",
  zeichnen.indexOf("text(s.fuer)") < zeichnen.indexOf("text(s.text)"));
pruefe("die Auswahl merkt sich weiter die aktuelle Stufe", zeichnen.includes("s.n === jetzt"));
pruefe("gewaehlt wird weiter ueber die Nummer", zeichnen.includes("simpelheitWaehlen(' + s.n + ')"));
pruefe("die Mehr-Zeile nennt keine Nummer mehr",
  !grabFn("simpelheitZeileZeichnen").includes('"Einfachheit: Stufe "'));
pruefe("die Erst-Frage fragt nach dem Umfang, nicht nach Einfachheit",
  grabFn("simpelheitFrageOeffnen").includes("Wie viel soll die App dir zeigen?"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
