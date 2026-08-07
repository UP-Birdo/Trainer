/* v180-Test: Nachtragen wandert ins Kalender-Menue.

   Offener Roadmap-Punkt aus der 11. Runde: „Training nachtragen weg → ueber
   den Kalender-Tag". Der separate Weg lag im „+"-Menue der Plaene — also dort,
   wo etwas NEUES angelegt wird. Ein Training von vorgestern ist aber kein
   neuer Plan, und das Datum musste man im Formular erst zuruecksetzen.

   Geprueft wird:
   1. Der alte Weg ist restlos weg (kein toter Eintrag im Register).
   2. Der neue steht am Kalender-Tag — aber NUR fuer heute und frueher.
   3. Das Datum des Tages wird durchgereicht.
   4. Der Rueckweg wird an EINER Stelle entschieden (vorher an dreien).
   5. Der Weg „Training eintragen" auf Heute bleibt unberuehrt.
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
  grabLiteral("SPORTARTEN"),
  grabFn("sportart"),
  grabFn("planNeuWege"),
  "module.exports = { planNeuWege };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Der alte Weg ist restlos weg ---------- */
[1,2,3,4,5].forEach(s =>
  pruefe("Stufe " + s + " bietet kein Nachtragen mehr im Plus-Menue",
    A.planNeuWege(s, ["kraft","laufen"]).indexOf("nachtragen") < 0));
const menue = grabFn("planNeuMenue");
pruefe("das Menue kennt den Eintrag nicht mehr", menue.indexOf("nachtragen") < 0);
pruefe("und ruft dort auch kein eintragenOeffnen mehr auf",
  menue.indexOf("eintragenOeffnen") < 0);
/* Kein toter Schluessel: Was das Register nennt, muss das Menue kennen. */
const wege = A.planNeuWege(5, ["kraft","laufen","kampfsport"]);
pruefe("jeder Weg aus dem Register hat einen Eintrag im Menue",
  wege.every(k => new RegExp("\\b" + k + ":").test(menue)));
/* v193/v194/v211 (Nutzer-Ansagen): Assistent, Beispielplan und zuletzt der
   Intervall-Weg sind aus dem „+"-Menue ausgezogen — es bleiben „uebung" und
   „eigen". Die v180-Zusage selbst ist davon unberuehrt und steht unten weiter:
   Nachtragen gehoert nicht in dieses Menue. test193 prueft die Auswahl. */
pruefe("die verbliebenen Wege sind vollstaendig",
  ["uebung","eigen"].every(k => wege.includes(k)) && wege.length === 2);
pruefe("der Intervall-Weg haengt an gar keiner Sportart mehr",
  A.planNeuWege(5, ["kraft"]).indexOf("intervall") < 0 &&
  A.planNeuWege(5, ["kraft","laufen"]).indexOf("intervall") < 0);

/* ---------- 2) Der neue Weg am Kalender-Tag ---------- */
const tag = grabFn("tagOeffnen");
pruefe("der Kalender-Tag bietet Training eintragen an",
  /text:"Training eintragen"/.test(tag));
pruefe("aber nur fuer heute und frueher",
  /if\(datum <= heuteAlsText\(\)\)/.test(tag));
pruefe("es steht VOR dem Planen (die wahrscheinlichere Absicht an einem alten Tag)",
  tag.indexOf('text:"Training eintragen"') < tag.indexOf('text:"Plan an diesem Tag"'));
pruefe("Plan an diesem Tag bleibt fuer alle Tage",
  /if\(sitzung\.daten\.plaene\.length\)\s*\n?\s*aktionen\.push\(\{ text:"Plan an diesem Tag"/.test(tag));
/* v216: Der Eintrag ist geblieben, hat aber zwei Dinge dazubekommen — er nennt
   auch den AUTOMATISCHEN Ruhetag (der vorher nicht zu streichen war) und
   entfaellt an einem Tag mit Training (dort ist Ruhetag ohnehin ausgeschlossen). */
pruefe("der Ruhetag-Eintrag deckt jetzt beide Ruhetags-Arten ab",
  /\(istRuhe \|\| istAutoRuhe\) \? "Ruhetag streichen" : "Als Ruhetag markieren"/.test(tag));

/* ---------- 3) Das Datum wird durchgereicht ---------- */
pruefe("der Tag reicht sein Datum ans Formular", /eintragenOeffnen\(null, 0, datum\)/.test(tag));
const oeffnen = grabFn("eintragenOeffnen");
pruefe("das Formular nimmt ein Datum entgegen",
  /function eintragenOeffnen\(plan, sekunden, datum\)/.test(oeffnen));
pruefe("ohne Angabe bleibt es bei heute",
  /"ein-datum"\)\.value = datum \|\| heuteAlsText\(\)/.test(oeffnen));
/* Die anderen Aufrufer geben keins mit — fuer sie aendert sich nichts.
   v202: Die Stoppuhr reicht die Sekunden jetzt durch eine Wache (lief die Uhr
   nicht, geht eine 0 raus und das Formular belegt die Plan-Dauer vor) — das
   DATUM gibt sie weiterhin nicht mit, und darum geht es hier. */
pruefe("Stoppuhr und Intervall rufen unveraendert auf",
  /eintragenOeffnen\(plan, sekunden < 10 \? 0 : sekunden\)/.test(src) &&
  /eintragenOeffnen\(plan, el\)/.test(src));

/* ---------- 4) Der Rueckweg an EINER Stelle ---------- */
const verlassen = grabFn("eintragenVerlassen");
pruefe("es gibt eine Stelle dafuer", verlassen.length > 20);
pruefe("sie kennt den Kalender-Rueckweg", /eintragenRueckweg === "kalender"/.test(verlassen));
pruefe("und raeumt ihn danach weg", /eintragenRueckweg = null;/.test(verlassen));
pruefe("sie zeichnet den Kalender neu, bevor sie ihn zeigt",
  verlassen.indexOf("kalenderZeichnen()") < verlassen.indexOf('zeige("view-kalender")'));
pruefe("ohne Rueckweg bleibt es beim alten Ziel (Heute bzw. Plaene)",
  /if\(nachStart\)\{ startOeffnen\(\); return; \}/.test(verlassen) &&
  /planListeZeichnen\(\);/.test(verlassen));
pruefe("das Kraft-Nachtragen nutzt sie", /eintragenVerlassen\(false\)/.test(grabFn("kraftNachtragen")));
pruefe("das Aktivitaets-Ablegen nutzt sie",
  /eintragenVerlassen\(true\)/.test(grabFn("aktivitaetAblegen")));
pruefe("und das Abbrechen im Formular auch",
  /onclick="eintragenVerlassen\(false\)"/.test(src));
/* Nur das EINTRAGEN-Formular darf nicht mehr selbst wegspringen — der Editor
   hat sein eigenes Abbrechen und geht weiterhin zu den Plaenen. */
const formular = src.slice(src.indexOf('<section id="view-eintragen"'),
                           src.indexOf("</section>", src.indexOf('<section id="view-eintragen"')));
pruefe("das Formular springt nicht mehr selbst weg",
  formular.indexOf("zeige('view-plaene')") < 0);
pruefe("und ruft stattdessen die eine Stelle",
  /onclick="eintragenVerlassen\(false\)"/.test(formular));
pruefe("der Rueckweg wird nur beim Kalender-Weg gesetzt",
  (src.match(/eintragenRueckweg = "kalender"/g) || []).length === 1);

/* ---------- 5) Der Heute-Weg bleibt ---------- */
pruefe("Training eintragen auf Heute gibt es weiter",
  /function heuteTrainingEintragen\(\)\{ eintragenOeffnen\(null, 0\); \}/.test(src));
pruefe("die Heute-Karte ruft ihn weiter auf",
  /onclick="heuteTrainingEintragen\(\)"/.test(src));

/* ---------- 6) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v180",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 180);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.180", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
