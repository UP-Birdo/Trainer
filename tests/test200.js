/* v200-Test: die Fehler aus dem Persona-Durchgang (52. Runde).

   Der schwerste zuerst: Die Frage „War die Einheit zu leicht?" liess sich NICHT
   verneinen — sie kam mit `mitAbbrechen = false`, also nur mit „OK", und „OK"
   heisst ja. Der Zweig `if(!ja) return` war toter Code, das Ziel stieg nach
   JEDER eingetragenen Einheit. Dazu sieben kleinere Befunde derselben Runde.

   Was hier festgehalten wird, ist jeweils die REGEL, nicht der Wortlaut:
   1. Eine Frage ohne Nein ist keine Frage.
   2. Die Zeiteinheit zu wechseln aendert die DAUER nicht (Regel 8d, im Editor
      seit je richtig, im Eintragen-Formular nicht).
   3. Stunden werden lesbar geschrieben (1:04 h statt 1,06 h) — und bleiben im
      Notizblock trotzdem verlustfrei les- und schreibbar.
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
function grabLine(anfang){
  const zeile = src.split("\n").find(z => z.trim().startsWith(anfang));
  if(!zeile) throw new Error("Zeile nicht gefunden: " + anfang);
  return zeile.trim();
}
function grabListe(name){
  const i = src.indexOf("const " + name + " = [");
  if(i < 0) throw new Error("Liste nicht gefunden: " + name);
  const start = src.indexOf("[", i);
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === "[") tiefe++;
    else if(src[k] === "]"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  "const MAX_DAUER_S = 24 * 3600;",
  grabListe("ZEITEINHEITEN"),
  grabListe("SPORTARTEN"),
  grabFn("sportart"),
  grabFn("hatStrecke"),
  grabFn("zeitEinheit"),
  grabFn("inEinheit"),
  grabFn("inSekunden"),
  grabFn("zeitKurz"),
  grabFn("zahlKurz"),
  grabFn("normName"),
  grabLine("const NOTIZ_STRECKE"),
  grabLine("const NOTIZ_DAUER"),
  grabLine("const NOTIZ_UHRZEIT"),
  grabFn("kommaZahl"),
  grabFn("notizSportart"),
  grabFn("streckeInEinheit"),
  grabFn("notizZeitEinheit"),
  grabFn("notizAktivitaetDeuten"),
  grabFn("aktivitaetAlsZeile"),
  "module.exports = { zeitKurz, inSekunden, inEinheit, notizAktivitaetDeuten, aktivitaetAlsZeile };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die Steigerungs-Frage laesst sich verneinen ---------- */
const nachtrag = grabFn("aktivitaetAblegen");
const fragePos = nachtrag.indexOf("War die Einheit zu leicht");
pruefe("die Frage steht noch da", fragePos > 0);
/* Der Aufruf davor: frage(text, mitAbbrechen, dann) — das zweite Argument muss
   `true` sein, sonst blendet frage() den Nein-Knopf aus (index.html, frage). */
const nachFrage = nachtrag.slice(fragePos, fragePos + 400);
pruefe("sie kommt MIT Abbrechen-Knopf", /,\s*\n?\s*true,\s*ja =>/.test(nachFrage));
pruefe("der Nein-Zweig ist damit erreichbar", nachFrage.includes("if(!ja) return;"));
pruefe("und er hebt nichts an",
  nachFrage.indexOf("if(!ja) return;") < nachFrage.indexOf("Object.assign(echterPlan, steigerung)"));
/* Gegenprobe am Dialog selbst: ohne mitAbbrechen gibt es wirklich kein Nein. */
pruefe("frage() blendet den Nein-Knopf ohne mitAbbrechen aus",
  grabFn("frage").includes("nein.hidden = !mitAbbrechen"));
pruefe("und OK liefert ja=true", grabFn("frage").includes("if(dann) dann(true)"));
/* Die Frage sagt jetzt, was OK bedeutet — der Knopf heisst nicht Ja. */
pruefe("der Text erklaert den OK-Knopf", nachtrag.includes("Mit OK hebe ich"));

/* ---------- 2) Zeiteinheit wechseln aendert die Dauer nicht ---------- */
const wechseln = grabFn("einEinheitWechseln");
pruefe("es gibt einen eigenen Umschalter", wechseln.length > 0);
pruefe("das Dropdown ruft ihn auf",
  src.includes('id="ein-einheit" onchange="einEinheitWechseln(this.value)"'));
pruefe("gerechnet wird ueber die Sekunden (nicht ueber den gerundeten Anzeigewert)",
  wechseln.includes("inSekunden(zahl, einDauerEinheit)") &&
  wechseln.includes("inEinheit(sekunden, neueEinheit)"));
pruefe("die alte Einheit wird gemerkt", /let einDauerEinheit = "min";/.test(src));
pruefe("und beim Oeffnen gesetzt", src.includes("einDauerEinheit = einheit;"));
pruefe("ein leeres Feld wird nicht mit einer Null gefuellt", wechseln.includes("if(zahl > 0)"));
/* Die Rechnung selbst — dieselbe Regel wie im Editor (8d). */
pruefe("eine Stunde wird zu 60 Minuten", A.inEinheit(A.inSekunden(1, "h"), "min") === 60);
pruefe("90 Sekunden werden zu 1,5 Minuten", A.inEinheit(A.inSekunden(90, "s"), "min") === 1.5);
pruefe("und wieder zurueck ergibt dieselbe Dauer",
  A.inSekunden(A.inEinheit(3600, "min"), "min") === 3600);
pruefe("der Editor macht es unveraendert weiter richtig",
  grabFn("zeitEinheitSetzen").includes("zeitEinheit"));

/* ---------- 3) Stunden stehen lesbar da ---------- */
pruefe("1,06 h wird zu 1:04 h", A.zeitKurz(3816, "h") === "1:04 h");
pruefe("volle Stunden bleiben schlicht", A.zeitKurz(7200, "h") === "2 h");
pruefe("eine halbe Stunde ist 0:30 h", A.zeitKurz(1800, "h") === "0:30 h");
pruefe("aufgerundete 60 Minuten werden eine Stunde mehr",
  A.zeitKurz(3599, "h") === "1 h");
pruefe("Minuten und Sekunden sind unveraendert",
  A.zeitKurz(1800, "min") === "30 min" && A.zeitKurz(45, "s") === "45 s");
pruefe("krumme Minuten behalten ihr Komma", A.zeitKurz(90, "min") === "1,5 min");
/* RUNDREISE: Der Notizblock schreibt mit zeitKurz — und muss es wieder lesen. */
const rund = A.aktivitaetAlsZeile({ sportart:"radfahren", strecke:30, dauer:3816, zeitEinheit:"h" });
pruefe("die Notizblock-Zeile nutzt dieselbe Schreibweise", rund === "Radfahren 30 km 1:04 h");
const gelesen = A.notizAktivitaetDeuten(rund);
pruefe("und sie wird verlustfrei wieder gelesen",
  gelesen.sekunden === 3840 && gelesen.strecke === 30 && gelesen.zeitEinheit === "h");
pruefe("die Uhrzeit-Form geht auch ohne Strecke",
  A.notizAktivitaetDeuten("Radfahren 2:15 h").sekunden === 8100);
pruefe("die Minuten der Uhrzeit werden nicht als eigene Zahl gelesen",
  A.notizAktivitaetDeuten("Radfahren 1:04 h").sekunden !== 240);
pruefe("die alte Schreibweise bleibt lesbar",
  A.notizAktivitaetDeuten("Radfahren 1,5 h").sekunden === 5400);

/* ---------- 4) Die kleinen Befunde ---------- */
/* Singular in der Kennzahlen-Zeile. */
pruefe("1 Training gesamt statt 1 Trainings",
  src.includes('(protokoll.length === 1 ? " Training" : " Trainings")'));
/* Die Tageswerte-Eingabe bleibt in ihrer Kachel: Grid-Kinder schrumpfen nur
   mit min-width:0 — width:100% allein reicht nicht. */
pruefe("die Raster-Kinder duerfen schrumpfen", /\.raster > \*\{min-width:0\}/.test(src));
pruefe("und die Felder darin bleiben in ihrer Spalte",
  /\.raster input,\.raster select\{max-width:100%\}/.test(src));
/* Der Sprung landet beim Statistik-Block, nicht am Seitenanfang. */
const darst = grabFn("einstDarstellungOeffnen");
pruefe("der Sprung kennt ein Ziel", darst.includes('fokus === "statistik"'));
pruefe("er scrollt NACH dem Zeigen (das setzt oben an)",
  darst.indexOf('zeige("view-einst-darstellung")') < darst.indexOf("scrollIntoView"));
pruefe("und nicht in eine versteckte Karte", darst.includes("!karte.hidden"));
pruefe("der Knopf in der Statistik uebergibt das Ziel",
  src.includes("einstDarstellungOeffnen('statistik')"));
/* Periode statt Tage — der Schluessel bleibt. */
pruefe("die Liste sagt Periode", /id:"periode",\s*name:"Periode"/.test(src));
pruefe("der Datenschluessel bleibt periode (additiver Vertrag)",
  (src.match(/id:"periode"/g) || []).length >= 2);
pruefe("die Frage selbst bleibt, wie sie war", src.includes("Hast du deine Tage?"));
/* Ausdauer-Kachel: ein Balken ist kein Verlauf. */
const ausdauer = grabFn("ausdauerZeichnen");
pruefe("bei einer einzigen Einheit kommt ein Hinweis statt eines Balkens",
  ausdauer.includes("if(daten.length < 2)") &&
  ausdauer.includes("Ab zwei Einheiten erscheint hier der Verlauf."));
pruefe("und die Kachel bleibt sichtbar (die Einheit gibt es ja)",
  ausdauer.indexOf("karte.hidden = false") < ausdauer.indexOf("if(daten.length < 2)"));
pruefe("das Koerpergewicht sagt es weiterhin genauso",
  src.includes("Ab zwei Einträgen erscheint hier der Verlauf."));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v200",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 200);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.200", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
