/* 0.243.0-Test: Der Wohlbefinden-Tab ist im Muskel-Check aufgegangen.

   Die Zusagen:
   1. Der Tab ist ersetzt: an seiner Stelle startet der Knopf den Wizard;
      Modus "wohl", `beschwerdeFragen` und der Tipp-ins-Menue-Weg sind
      restlos weg (ein persistierter alter "wohl"-Modus faellt sauber auf
      "Dein Koerper" zurueck).
   2. Der manuelle Start fragt die Muskeln mit Last oder offener Beschwerde,
      staerkste Quote zuerst; ohne solche gibt es eine ehrliche Meldung.
   3. EIN Muskel bleibt meldbar: Frage-Knopf in der Detail-Karte oeffnet den
      Wizard fuer genau diesen Muskel; ohne Trainings-Eintrag keine Notiz.
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

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Der Tab ist ersetzt ---------- */
pruefe("der Muskel-Check-Knopf steht an der alten Stelle",
  src.includes('id="muskel-modus-check"') && src.includes('onclick="muskelCheckStarten()"'));
pruefe("der Wohlbefinden-Tab ist weg",
  !src.includes('id="muskel-modus-wohl"') && !src.includes("muskelModus('wohl')"));
pruefe("beschwerdeFragen ist restlos abgebaut", !src.includes("function beschwerdeFragen("));
pruefe("muskelTippen kennt den wohl-Zweig nicht mehr",
  !grabFn("muskelTippen").includes('"wohl"'));
pruefe("ein alter wohl-Modus faellt auf Dein Koerper zurueck",
  grabFn("muskelModusAnwenden").includes('muskelStatus.modus = "trainiert"'));

/* ---------- 2) Der manuelle Start ---------- */
{
  const start = grabFn("muskelCheckStarten");
  pruefe("nur auf erlaubten Stufen (Muskelkarte ab 4)",
    start.includes('viewErlaubt("view-muskeln")'));
  pruefe("gefragt wird, wo es etwas zu sagen gibt (Auslastung, staerkste zuerst)",
    start.includes("muskelAuslastung(") &&
    start.includes("(a[y].quote || 0) - (a[x].quote || 0)"));
  pruefe("ohne Kandidaten eine ehrliche Meldung", start.includes("meldung("));
  pruefe("der Wizard laeuft mit expliziter Liste und kehrt zur Karte zurueck",
    start.includes("muskelCheckOeffnen(null, null, () => muskelnOeffnen(), liste)"));
}
pruefe("muskelCheckOeffnen nimmt die explizite Liste",
  grabFn("muskelCheckOeffnen").includes("muskeln ||"));

/* ---------- 3) Ein Muskel bleibt meldbar ---------- */
pruefe("die Detail-Karte traegt den Frage-Knopf",
  grabFn("muskelAuswahlZeichnen").includes("muskelCheckStarten([\\'") &&
  grabFn("muskelAuswahlZeichnen").includes("Wie fühlt er sich an?"));
pruefe("ohne Trainings-Eintrag keine Notiz-Karte",
  grabFn("muskelCheckSchritt").includes("notizKarte.hidden = !mcheck.eintrag"));

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.243.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 243000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.243.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
