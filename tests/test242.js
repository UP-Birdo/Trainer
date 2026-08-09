/* 0.242.0-Test: Der Muskel-Check ersetzt die Noten-Bewertung (Nutzer-Direktive
   "keine offenen Selbsteinschaetzungs-Skalen").

   Die Zusagen:
   1. OBJEKTIVE NOTE (noteAbleiten): Soll auf allen Saetzen gehalten -> 2
      (steigern), verfehlt -> 3 (die v113-Untergrenze hebt weiter auf 4/5),
      Zeit nach gehaltener Zeit, uebersprungen -> 3. Muskel-Antworten bremsen:
      Schmerz stark -> 5, Schmerz leicht / Zieht stark -> 4, Zieht leicht nie.
      Nie Note 1.
   2. DER WIZARD: ein Muskel je Schritt, grosse Figur, Bewegungs-Frage aus
      MUSKEL_CHECK_FRAGEN, fuenf Antworten -> Beschwerden-Liste + Merker.
   3. ADAPTIV: Kennenlern-/Scan-Phase fragt alles; kalibriert nur bei offener
      Beschwerde, Quote am Richtwert oder Stichprobe >= 14 Tage.
   4. BEIDE ENDEN: Kraft (bewertungOeffnen) UND Training auf Zeit
      (trainingAbschliessen) fuehren durch den Wizard; die 1-5-Ansicht ist
      restlos weg.
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
new Function("module", "exports", [
  grabFn("sollVerfehlt"),
  "function uebungMuskeln(name){ return name === 'Kniebeugen' ? { muskeln:['quadriceps','glutes'], sekundaer:['lowerback'] } : null; }",
  grabFn("noteAbleiten"),
  "module.exports = { noteAbleiten };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const KB = { id:"u1", name:"Kniebeugen", modus:"wdh", wdh:10, wdhMin:8, wdhMax:15, gewicht:60 };
const PLANK = { id:"u2", name:"Plank", modus:"zeit", dauer:45 };
const satz = (wdh, gewicht) => ({ uebungId:"u1", wdh, gewicht });

/* ---------- 1) Die objektive Note ---------- */
pruefe("Soll ueberall gehalten -> steigern (2)",
  T.noteAbleiten(KB, [satz(10, 60), satz(10, 60), satz(11, 60)], {}) === 2);
pruefe("Soll verfehlt -> 3 (die v113-Untergrenze uebernimmt das Bremsen)",
  T.noteAbleiten(KB, [satz(9, 60), satz(10, 60)], {}) === 3);
pruefe("zu wenig Gewicht ist auch verfehlt",
  T.noteAbleiten(KB, [satz(10, 50)], {}) === 3);
pruefe("komplett uebersprungen -> neutral (3)", T.noteAbleiten(KB, [], {}) === 3);
pruefe("Zeit voll gehalten -> steigern",
  T.noteAbleiten(PLANK, [{ uebungId:"u2", dauer:45 }], {}) === 2);
pruefe("Zeit knapp gehalten -> halten",
  T.noteAbleiten(PLANK, [{ uebungId:"u2", dauer:30 }], {}) === 4);
pruefe("Zeit weit verfehlt -> Rueckschritt",
  T.noteAbleiten(PLANK, [{ uebungId:"u2", dauer:20 }], {}) === 5);
pruefe("nie Note 1 (kein Sprung mehr ohne Beleg)",
  !grabFn("noteAbleiten").includes("note = 1"));

/* ---------- 2) Die Muskel-Antworten bremsen ---------- */
const gut = [satz(10, 60)];
pruefe("Schmerz stark am Primaermuskel -> 5",
  T.noteAbleiten(KB, gut, { quadriceps:{ art:"schmerz", wert:2 } }) === 5);
pruefe("Schmerz leicht -> halten (4)",
  T.noteAbleiten(KB, gut, { glutes:{ art:"schmerz", wert:1 } }) === 4);
pruefe("Zieht stark -> halten (4)",
  T.noteAbleiten(KB, gut, { quadriceps:{ art:"kater", wert:2 } }) === 4);
pruefe("Zieht leicht bremst nicht (normale Arbeit)",
  T.noteAbleiten(KB, gut, { quadriceps:{ art:"kater", wert:1 } }) === 2);
pruefe("ein fremder Muskel bremst nicht",
  T.noteAbleiten(KB, gut, { pectoral:{ art:"schmerz", wert:2 } }) === 2);
pruefe("Sekundaermuskeln bremsen nicht (sie tragen halb)",
  T.noteAbleiten(KB, gut, { lowerback:{ art:"schmerz", wert:2 } }) === 2);

/* ---------- 3) Der Wizard ---------- */
pruefe("die Ansicht existiert", src.includes('<section id="view-muskelcheck"'));
pruefe("die alte Bewertungs-Ansicht ist restlos weg",
  !src.includes('id="view-bewertung"') && !src.includes("function noteSetzen(") &&
  !src.includes("notenhilfe") && !src.includes('id="bewertung-liste"'));
{
  const schritt = grabFn("muskelCheckSchritt");
  pruefe("je Schritt EIN Muskel mit grosser Figur",
    schritt.includes('miniFigurHtml({ ansicht: MUSKEL_SEITE[m] === "back" ? "back" : "front", muskeln:[m] }, "mcheck-figur")'));
  pruefe("die Figur ist wirklich gross (CSS)", src.includes(".mcheck-figur{--fb:150px"));
  pruefe("die Bewegungs-Frage steht dabei", schritt.includes("muskelCheckFrage(m)"));
  pruefe("der Stand wird angesagt (2 von 5)", schritt.includes('" von "'));
  pruefe("am Ende kommt die Notiz (v72 bleibt)", schritt.includes("mcheck-notiz"));
}
{
  const antwort = grabFn("muskelCheckAntwort");
  pruefe("jede Antwort merkt die Stichprobe", antwort.includes("d.muskelChecks[m] = heute"));
  pruefe("und geht zum naechsten Muskel", antwort.includes("mcheck.index++"));
}
pruefe("der Merker wird nachgeruestet", src.includes("daten.muskelChecks = {}"));

/* ---------- 4) Adaptiv ---------- */
{
  const wahl = grabFn("muskelCheckMuskeln");
  pruefe("Muskel-Fragen erst ab Stufe 4", wahl.includes('viewErlaubt("view-tagescheck")'));
  pruefe("Kennenlern-/Scan-Phase fragt alles", wahl.includes('!== "kalibriert"') && wahl.includes("return alle"));
  pruefe("kalibriert nur bei Beschwerde, hoher Quote oder alter Stichprobe",
    wahl.includes("beschwerdeFaktor(beschwerden, m, heute) < 1") &&
    wahl.includes("(quoten[m] || 0) >= 1") &&
    wahl.includes("MCHECK_STICHPROBE_TAGE"));
}

/* ---------- 5) Beide Enden + abgeleitete Noten ---------- */
pruefe("Kraft fuehrt durch den Wizard",
  grabFn("trainingBeenden").includes("bewertungOeffnen(plan, eintrag)") &&
  grabFn("bewertungOeffnen").includes("muskelCheckOeffnen("));
pruefe("das Training auf Zeit auch (Timer zu Ende)",
  grabFn("trainingAbschliessen").includes("muskelCheckOeffnen(plan, eintrag, zeigen)"));
pruefe("die Progression liest die ABGELEITETE Note",
  grabFn("bewertungAnwenden").includes("noteAbleiten(u, gemachteSaetze, antworten)"));
/* 0.242.1: Die 2 ist ein Progressions-Signal, keine Anstrengungs-Aussage —
   im Protokoll steht nie unter 3 (sonst wiegt jeder gehaltene Satz leichter
   und die Auto-Kalibrierung stuft faelschlich hoch). */
pruefe("die Satz-Note im Protokoll faellt nie unter 3",
  grabFn("bewertungAnwenden").includes("Math.max(3, n)"));
pruefe("Zeit-Ableitung liest das echte Protokoll-Feld (dauer)",
  grabFn("noteAbleiten").includes("Number(s.dauer) || 0") &&
  grabFn("satzProtokollieren").includes("eintrag.dauer = istSekunden"));
pruefe("die alte Handnoten-Knopfleiste ist weg", !src.includes('id="note-'));
pruefe("Ergebnis- und Abschluss-Seite tragen keinen Karten-Check mehr",
  !src.includes("koerperCheckHtml("));

/* ---------- 6) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.242.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 242000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.242.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
