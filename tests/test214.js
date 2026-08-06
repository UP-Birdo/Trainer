/* v214-Test: Die Kachel misst ZEIT, und ein Nachtrag holt die Flamme zurueck.
   (56. Runde, zweite Staffel aus der Ideen-Box.)

   Die drei Zusagen:
   1. ZEIT STATT ANZAHL. Der Balken ist so hoch wie die Trainingsminuten des
      Tages — drei abgehakte Kurz-Einheiten standen bis v213 so hoch wie ein
      90-Minuten-Training. Die Anzahl bleibt daneben erhalten (Textzeile).
   2. EIN TAG MIT TRAINING SIEHT NIE LEER AUS. Fehlt an einem Trainingstag die
      Dauer (Altdaten), steht ueber dem Balken ein Strich, keine 0.
   3. DIE FLAMME WIRD GERECHNET, NICHT GESPEICHERT. `serieAus` ist rein; ein
      nachgetragenes Training in der Luecke laesst die Serie rueckwirkend wieder
      aufleben — die Nutzer-Zusage aus 08/2026, hier am Szenario festgehalten:
      drei Tage nichts, am vierten einen der drei Tage nachtragen.
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
function grabZahl(name){
  const t = new RegExp("^const " + name + " = [^;\\n]*;", "m").exec(src);
  if(!t) throw new Error("Konstante nicht gefunden: " + name);
  return t[0];
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabZahl("TRAININGS_FENSTER_TAGE"),
  grabZahl("MAX_LUECKE"),
  grabFn("tageVerschieben"),
  grabFn("tagDifferenz"),
  grabFn("trainingsProTag"),
  grabFn("trainingsDiagrammHtml"),
  grabFn("serieAus"),
  grabFn("flammeNachtragText"),
  grabFn("ruhetageOhneTrainingstage"),
  grabFn("tagStatus"),
  "module.exports = { TRAININGS_FENSTER_TAGE, MAX_LUECKE, trainingsProTag," +
  " trainingsDiagrammHtml, serieAus, flammeNachtragText, ruhetageOhneTrainingstage, tagStatus };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Der Balken misst Minuten ---------- */
const heute = "2026-08-14";
const protokoll = [
  { datum:"2026-08-14", dauerMin:45 },
  { datum:"2026-08-14", dauerMin:30 },   // zwei Einheiten an einem Tag -> 75 min
  { datum:"2026-08-12", dauerMin:20 },
  { datum:"2026-08-10" },                // Trainingstag OHNE Dauer (Altdaten)
  { datum:"2026-08-01", dauerMin:90 },   // liegt am Fensterrand
  { datum:null,         dauerMin:60 }    // kaputter Eintrag
];
const punkte = A.trainingsProTag(protokoll, heute);
const amTag = d => punkte.find(p => p.datum === d);

pruefe("das Fenster hat weiterhin 14 Punkte", punkte.length === 14);
pruefe("zwei Einheiten an einem Tag werden addiert", amTag("2026-08-14").minuten === 75);
pruefe("die Anzahl bleibt daneben erhalten", amTag("2026-08-14").anzahl === 2);
pruefe("ein einzelnes Training zaehlt mit seiner Dauer", amTag("2026-08-12").minuten === 20);
pruefe("ein Trainingstag ohne Dauer ergibt 0 Minuten, aber 1 Einheit",
  amTag("2026-08-10").minuten === 0 && amTag("2026-08-10").anzahl === 1);
pruefe("ein trainingsfreier Tag ist 0/0",
  amTag("2026-08-13").minuten === 0 && amTag("2026-08-13").anzahl === 0);
pruefe("Eintraege ohne Datum stuerzen nicht ab",
  punkte.reduce((a, p) => a + p.minuten, 0) === 185);
pruefe("ohne Protokoll bleibt das Fenster vollstaendig und leer",
  A.trainingsProTag(null, heute).length === 14 &&
  A.trainingsProTag([], heute).every(p => p.minuten === 0 && p.anzahl === 0));
/* Kaputte Dauer-Werte duerfen die Skala nicht sprengen. */
pruefe("unsinnige Dauern werden abgefangen",
  A.trainingsProTag([{ datum: heute, dauerMin:"viel" }], heute).slice(-1)[0].minuten === 0 &&
  A.trainingsProTag([{ datum: heute, dauerMin:-30 }], heute).slice(-1)[0].minuten === 0);

/* ---------- 2) Das Diagramm ---------- */
const svg = A.trainingsDiagrammHtml(punkte);
pruefe("es ist ein SVG und nennt die Minuten in der Beschriftung",
  svg.startsWith("<svg") && /aria-label="[^"]*Minuten[^"]*"/.test(svg));
pruefe("je Tag ein Balken", (svg.match(/<rect /g) || []).length === 14);
pruefe("die Minuten stehen ueber dem Balken", svg.includes(">75</text>") && svg.includes(">20</text>"));
pruefe("ein Trainingstag ohne Dauer bekommt einen Strich statt einer Zahl",
  svg.includes(">—</text>"));
pruefe("ein trainingsfreier Tag bekommt gar keine Zahl",
  (svg.match(/font-size="10"/g) || []).length === 4);   // 14., 12., 10. (Strich), 1.
pruefe("der hoechste Balken ist der laengste Tag", (() => {
  const hoehen = [...svg.matchAll(/height="([\d.]+)"/g)].map(m => Number(m[1]));
  return hoehen.indexOf(Math.max(...hoehen)) === punkte.findIndex(p => p.minuten === 90);
})());
pruefe("heute ist die Signalfarbe, der Rest ruhig",
  svg.includes('fill="var(--signal)"') && svg.includes('fill="var(--rest)"'));

/* ---------- 3) Die Flamme lebt beim Nachtragen wieder auf ---------- */
pruefe("die Toleranz sind 3 Tage", A.MAX_LUECKE === 3);
/* Das Szenario des Nutzers, Schritt fuer Schritt. */
const letzterTag = [{ datum:"2026-08-10" }];
pruefe("am Trainingstag selbst brennt sie", A.serieAus(letzterTag, "2026-08-10") === 1);
pruefe("nach drei Tagen Pause brennt sie noch", A.serieAus(letzterTag, "2026-08-13") === 1);
pruefe("am vierten Tag ist sie aus", A.serieAus(letzterTag, "2026-08-14") === 0);
const nachgetragen = [{ datum:"2026-08-10" }, { datum:"2026-08-12" }];   // am 14. nachgetragen
pruefe("ein Nachtrag aus den letzten drei Tagen holt sie zurueck",
  A.serieAus(nachgetragen, "2026-08-14") === 2);
/* Ein Nachtrag, der die Luecke NICHT schliesst, holt auch nichts zurueck —
   sonst waere die Serie beliebig nachbaubar. */
pruefe("ein zu alter Nachtrag laesst sie aus",
  A.serieAus([{ datum:"2026-08-01" }, { datum:"2026-08-03" }], "2026-08-14") === 0);
pruefe("die Reihenfolge im Protokoll ist egal",
  A.serieAus([{ datum:"2026-08-12" }, { datum:"2026-08-10" }], "2026-08-14") === 2);
pruefe("mehrere Trainings am selben Tag zaehlen als eines",
  A.serieAus([{ datum:"2026-08-14" }, { datum:"2026-08-14" }], "2026-08-14") === 1);

/* ---------- 4) Gesagt wird nur der Fall, den man sonst uebersieht ---------- */
pruefe("war die Flamme aus und ist wieder da, wird es gesagt",
  /Flamme ist wieder da/.test(A.flammeNachtragText(0, 2)));
pruefe("und die Zahl steht dabei", A.flammeNachtragText(0, 2).includes("2 Trainings"));
pruefe("Einzahl bei einer Serie von 1", A.flammeNachtragText(0, 1).includes("1 Training in Serie"));
pruefe("brannte sie schon, wird nichts gesagt", A.flammeNachtragText(3, 4) === "");
pruefe("bleibt sie aus, wird auch nichts gesagt", A.flammeNachtragText(0, 0) === "");

/* ---------- 5) Verdrahtung: der Nachtrag zeichnet sofort neu ---------- */
const kraft = grabFn("kraftNachtragen");
pruefe("der Kraft-Nachtrag zeichnet alles Abgeleitete neu", kraft.includes("fortschrittNeuZeichnen()"));
pruefe("und nennt die Flamme in seiner Meldung", kraft.includes("flammeNachtragText("));
const aktivitaet = grabFn("aktivitaetAblegen");
pruefe("der Aktivitaets-Nachtrag ebenso",
  aktivitaet.includes("fortschrittNeuZeichnen()") && aktivitaet.includes("flammeNachtragText("));
pruefe("die Serie kommt weiter aus einer Stelle",
  grabFn("trainingsSerie").includes("serieAus(sitzung.daten.protokoll"));
pruefe("die Regel steht in Gut zu wissen", /Nachtragen holt die Flamme zur/.test(src));

/* ---------- 6) Ein nachgetragenes Training ist KEIN Ruhetag mehr ----------
   Nutzer-Rueckfrage 08/2026: „und wenn ich ein trainig nachtrage kann es ja kein
   ruhe tag mehr sein". Die Invariante steht seit v153 an EINER Stelle (im
   speichern()), die Anzeige entscheidet zusaetzlich in tagStatus. Hier beides
   am Nachtrag-Fall durchgespielt — einmal fuer den MANUELL gesetzten und einmal
   fuer den AUTOMATISCHEN Ruhetag, denn beide landen in derselben Liste. */
{
  const tag = "2026-08-12";
  const ruhetageVorher = ["2026-08-11", tag, "2026-08-13"];   // Block um den Tag herum
  const protokollNachher = [{ datum:"2026-08-10" }, { datum: tag, dauerMin:40 }];

  const sauber = A.ruhetageOhneTrainingstage(ruhetageVorher, protokollNachher);
  pruefe("der nachgetragene Tag faellt aus den Ruhetagen", sauber.indexOf(tag) < 0);
  pruefe("die anderen Ruhetage bleiben unberuehrt",
    JSON.stringify(sauber) === JSON.stringify(["2026-08-11", "2026-08-13"]));

  /* Und die Anzeige: Training schlaegt Ruhetag — selbst wenn die Bereinigung
     noch nicht gelaufen waere (Guertel und Hosentraeger). */
  const proto = {}; protokollNachher.forEach(e => (proto[e.datum] = proto[e.datum] || []).push(e));
  const mitAltemRuhetag = A.tagStatus(tag, "2026-08-14", proto, new Set(ruhetageVorher), null, false);
  pruefe("der Kalender zeigt den Tag als trainiert, nicht als Ruhetag",
    mitAltemRuhetag.art === "trainiert");
  const echterRuhetag = A.tagStatus("2026-08-11", "2026-08-14", proto, new Set(sauber), null, false);
  pruefe("ein echter Ruhetag bleibt einer", echterRuhetag.art === "ruhe");
  const leererTag = A.tagStatus("2026-08-09", "2026-08-14", proto, new Set(sauber), null, false);
  pruefe("ein vergangener Tag ohne alles bleibt automatischer Ruhetag", leererTag.art === "autoruhe");

  /* Das Tag-Fenster liest dieselbe Reihenfolge: erledigt vor Ruhetag. */
  const fenster = grabFn("tagOeffnen");
  pruefe("das Tag-Fenster nennt zuerst das Training", /if\(proto\.length\)\s+info \+= " · erledigt/.test(fenster));
  pruefe("und die Bereinigung haengt am Speichern, nicht am Eintrage-Weg",
    grabFn("speichern").includes("ruhetageOhneTrainingstage("));
}

/* ---------- 7) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v214",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 214);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.214", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
