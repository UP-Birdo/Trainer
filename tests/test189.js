/* v189-Test: die gemessene Pause (v188) wiegt in der Belastungs-Rechnung mit
   (ROADMAP, Belastungs-Modell A6 — Teil 2 von 2, damit ist Gruppe A fertig).

   Die Zusagen:
   1. Kuerzere Pause = mehr Ermuedung je Satz, aber die Wirkung ist auf ±10 %
      gedeckelt — dieselbe Zurueckhaltung wie bei Schlaf, Alter, Geschlecht.
   2. OHNE Messwert aendert sich NICHTS. Alle Zusagen aus v161 gelten
      unveraendert weiter (hier Wert fuer Wert nachgeprueft).
   3. Die Grundlagen-Zeile sagt, ob Pausen in der Einschaetzung stecken.
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
function grabConst(name){
  const z = new RegExp("^const " + name + "\\s*=\\s*[^;]+;", "m").exec(src);
  if(!z) throw new Error("Konstante nicht gefunden: " + name);
  return z[0];
}
/** Mehrzeiliges Array-Literal (PAUSE_STUFEN). */
function grabArray(name){
  const i = src.indexOf("const " + name + " = [");
  if(i < 0) throw new Error("Array nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf("[", i); k < src.length; k++){
    if(src[k] === "[") tiefe++;
    else if(src[k] === "]"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabConst("NOTE_GEWICHT"),
  grabConst("MUSKEL_HEAT_TAGE"),
  grabArray("PAUSE_STUFEN"),
  grabFn("pauseFaktor"),
  grabFn("satzGewichtung"),
  grabFn("tagDifferenz"),
  grabFn("echteSaetze"),
  grabFn("pausenGemessen"),
  "module.exports = { PAUSE_STUFEN, pauseFaktor, satzGewichtung, pausenGemessen, MUSKEL_HEAT_TAGE };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const satz = o => Object.assign({ name:"LH-Bankdrücken", modus:"wdh", wdh:10 }, o);

/* ---------- 1) pauseFaktor ---------- */
pruefe("sehr dicht (30 s) wiegt mehr", A.pauseFaktor(30) === 1.10);
pruefe("kurz (60 s) wiegt etwas mehr", A.pauseFaktor(60) === 1.05);
pruefe("ueblich (120 s) ist neutral", A.pauseFaktor(120) === 1.00);
pruefe("lang (300 s) wiegt weniger", A.pauseFaktor(300) === 0.95);
/* Die Grenzen selbst — je Stufe der obere Rand und der erste Wert darueber. */
pruefe("45 s gehoert noch zur dichtesten Stufe", A.pauseFaktor(45) === 1.10);
pruefe("46 s faellt eine Stufe tiefer", A.pauseFaktor(46) === 1.05);
pruefe("90 s ist noch kurz", A.pauseFaktor(90) === 1.05);
pruefe("91 s ist neutral", A.pauseFaktor(91) === 1.00);
pruefe("180 s ist noch neutral", A.pauseFaktor(180) === 1.00);
pruefe("181 s gilt als lang", A.pauseFaktor(181) === 0.95);
pruefe("0 Sekunden ist die dichteste Stufe", A.pauseFaktor(0) === 1.10);

/* Ohne Wert passiert nichts — kein Wert, kein Effekt. */
pruefe("ohne Pause neutral",
  A.pauseFaktor(undefined) === 1 && A.pauseFaktor(null) === 1);
pruefe("Text ist kein Wert", A.pauseFaktor("30") === 1);
pruefe("NaN und Unendlich sind neutral",
  A.pauseFaktor(NaN) === 1 && A.pauseFaktor(Infinity) === 1);
pruefe("negative Werte sind neutral (nicht die dichteste Stufe)",
  A.pauseFaktor(-10) === 1);

/* Der Deckel: die Richtung ist belegt, die Groesse nicht. */
const faktoren = A.PAUSE_STUFEN.map(s => s.faktor);
pruefe("kein Faktor reisst die 10-Prozent-Grenze",
  faktoren.every(f => f >= 0.9 && f <= 1.1));
pruefe("die Stufen sind fallend geordnet (laenger = leichter)",
  faktoren.every((f, i) => i === 0 || f <= faktoren[i-1]));
pruefe("die Grenzen sind aufsteigend",
  A.PAUSE_STUFEN.every((s, i) => i === 0 || s.bis > A.PAUSE_STUFEN[i-1].bis));
pruefe("die letzte Stufe faengt alles ab",
  A.PAUSE_STUFEN[A.PAUSE_STUFEN.length - 1].bis === Infinity);
pruefe("genau eine Stufe ist neutral",
  faktoren.filter(f => f === 1).length === 1);

/* ---------- 2) v161 gilt unveraendert weiter (ohne Pausen-Feld) ---------- */
pruefe("viel zu leicht wiegt am wenigsten", A.satzGewichtung(satz({ note:1 }), 0) === 0.5);
pruefe("passend ist der Normalfall", A.satzGewichtung(satz({ note:3 }), 0) === 1);
pruefe("schwer wiegt mehr", A.satzGewichtung(satz({ note:4 }), 0) === 1.2);
pruefe("nicht geschafft wiegt am meisten", A.satzGewichtung(satz({ note:5 }), 0) === 1.3);
pruefe("halbes Bestgewicht ohne Note", A.satzGewichtung(satz({ gewicht:40 }), 80) === 0.8);
pruefe("am Bestwert volle Wirkung", A.satzGewichtung(satz({ gewicht:80 }), 80) === 1);
pruefe("ohne alles bleibt es neutral", A.satzGewichtung(satz({}), 0) === 1);
pruefe("die Note hat weiterhin Vorrang vor dem Gewicht",
  A.satzGewichtung(satz({ note:1, gewicht:80 }), 80) === 0.5);

/* ---------- 3) Mit Pause wirkt es — und nur ein bisschen ---------- */
pruefe("dichte Pause hebt die Note-3-Gewichtung",
  A.satzGewichtung(satz({ note:3, pause:30 }), 0) === 1.1);
pruefe("lange Pause senkt sie",
  A.satzGewichtung(satz({ note:3, pause:300 }), 0) === 0.95);
pruefe("die uebliche Pause aendert nichts",
  A.satzGewichtung(satz({ note:3, pause:120 }), 0) === 1);
pruefe("auch der Gewichts-Zweig wird moduliert",
  A.satzGewichtung(satz({ gewicht:40, pause:30 }), 80) === 0.88);   // 0.8 * 1.10
pruefe("das Ergebnis bleibt auf 2 Nachkommastellen gerundet",
  String(A.satzGewichtung(satz({ note:2, pause:30 }), 0)).length <= 5);
pruefe("der haerteste Fall bleibt beherrscht",
  A.satzGewichtung(satz({ note:5, pause:0 }), 0) === 1.43);
pruefe("eine Pause allein macht aus einem leichten Satz keinen schweren",
  A.satzGewichtung(satz({ note:1, pause:0 }), 0) < A.satzGewichtung(satz({ note:3 }), 0));
pruefe("die Pause verschiebt nie die Rangfolge der Noten",
  A.satzGewichtung(satz({ note:1, pause:0 }), 0) < A.satzGewichtung(satz({ note:4, pause:300 }), 0));

/* ---------- 4) pausenGemessen (Grundlagen-Zeile) ---------- */
const HEUTE = "2026-07-30";
const eintrag = (datum, saetze) => ({ datum, saetze });
pruefe("ohne Protokoll nichts gemessen",
  A.pausenGemessen([], HEUTE) === false && A.pausenGemessen(null, HEUTE) === false);
pruefe("Saetze ohne Pausen-Feld zaehlen nicht",
  A.pausenGemessen([eintrag(HEUTE, [{ name:"X", wdh:10 }])], HEUTE) === false);
pruefe("ein Satz mit Pause reicht",
  A.pausenGemessen([eintrag(HEUTE, [{ name:"X", wdh:10, pause:60 }])], HEUTE) === true);
pruefe("eine Pause von 0 zaehlt auch als gemessen",
  A.pausenGemessen([eintrag(HEUTE, [{ name:"X", wdh:10, pause:0 }])], HEUTE) === true);
pruefe("ausserhalb des Fensters zaehlt nicht",
  A.pausenGemessen([eintrag("2026-06-01", [{ name:"X", wdh:10, pause:60 }])], HEUTE) === false);
pruefe("die Zukunft zaehlt nicht",
  A.pausenGemessen([eintrag("2026-08-05", [{ name:"X", wdh:10, pause:60 }])], HEUTE) === false);
pruefe("kaputte Eintraege werfen nicht", (() => {
  try { return A.pausenGemessen([null, {}, eintrag(HEUTE, null)], HEUTE) === false; }
  catch(e){ return false; }
})());
pruefe("es kommt ein echter Wahrheitswert",
  typeof A.pausenGemessen([], HEUTE) === "boolean");

/* ---------- 5) Verdrahtung ---------- */
pruefe("satzGewichtung nutzt den Faktor",
  grabFn("satzGewichtung").includes("pauseFaktor(satz && satz.pause)"));
pruefe("die Grundlagen-Zeile nennt die Pausen",
  grabFn("rechnungsGrundlage").includes('hat.push("Pausen")'));
pruefe("sie fragt ueber die reine Funktion",
  grabFn("rechnungsGrundlage").includes("pausenGemessen(protokoll, heute)"));
/* Der Punkt, an dem test167 zu Recht Alarm geschlagen hat: Die Fehlt-Liste
   muendet in „Damit wuerde die Einschaetzung genauer" — eine Aufforderung. Bei
   den Pausen gibt es nichts einzutragen, also darf dort nie „Pausen" stehen. */
pruefe("fehlende Pausen landen NICHT in der Fehlt-Liste",
  !/fehlt\)?\.push\("Pausen"\)/.test(grabFn("rechnungsGrundlage")) &&
  !/\? hat : fehlt\)\.push\("Pausen"\)/.test(grabFn("rechnungsGrundlage")));
/* Die Muskel-Last rechnet weiter ueber satzGewichtung — die Pause wirkt damit
   an EINER Stelle und ueberall gleich. */
pruefe("muskelLast rechnet unveraendert ueber satzGewichtung",
  grabFn("muskelLast").includes("satzGewichtung(s, maxGew[s.name] || 0)"));
pruefe("es gibt keinen zweiten Pausen-Faktor im Code",
  (src.match(/pauseFaktor\(/g) || []).length === 2);   // Definition + die eine Nutzung

/* ---------- 6) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v189",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 189);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.189", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
