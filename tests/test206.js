/* v206-Test: BMI als eigene Statistik (Ideen-Box, 8. Runde D).

   Die Abgrenzung von v160 ist der Kern dieses Tests: Als FAKTOR der
   Belastungs-Rechnung bleibt der BMI abgelehnt (er vermischt Muskel und Fett),
   als STATISTIK ist er zulaessig. Der Test haelt deshalb beides fest — dass die
   Kachel rechnet UND dass die Muskelkarte ihn weiterhin nicht anfasst.

   Dazu die Zusagen der Darstellung:
   1. GERECHNET, NICHT GERATEN: ohne Groesse oder ohne Gewicht kein Wert.
   2. FESTE SKALA (15–35): Die Aussage ist die Lage zu den Bereichen — bei einer
      mitwandernden Achse saesse man immer in der Mitte.
   3. EHRLICHE EINORDNUNG: Der Bereich wird benannt, aber mit dem Vorbehalt, der
      bei Trainierenden dazugehoert.
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
function grabBlock(name, open, close){
  const i = src.indexOf("const " + name + " = " + open);
  if(i < 0) throw new Error("Block nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf(open, i); k < src.length; k++){
    if(src[k] === open) tiefe++;
    else if(src[k] === close){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("begrenzen"),
  grabFn("text"),
  grabBlock("BMI_BEREICHE", "[", "]"),
  grabFn("bmiWert"),
  grabFn("bmiBereich"),
  grabFn("bmiReihe"),
  grabFn("bmiKurveHtml"),
  "module.exports = { BMI_BEREICHE, bmiWert, bmiBereich, bmiReihe, bmiKurveHtml };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die Rechnung ---------- */
pruefe("80 kg bei 180 cm sind 24,7", A.bmiWert(80, 180) === 24.7);
pruefe("60 kg bei 165 cm sind 22,0", A.bmiWert(60, 165) === 22);
pruefe("auf eine Stelle gerundet", String(A.bmiWert(80, 180)).split(".")[1].length === 1);
/* Kein Wert, kein Ergebnis — geraten wird nichts. */
pruefe("ohne Groesse kein BMI", A.bmiWert(80, 0) === null && A.bmiWert(80, null) === null);
pruefe("ohne Gewicht auch nicht", A.bmiWert(0, 180) === null);
pruefe("Unsinn ergibt nichts",
  A.bmiWert(-5, 180) === null && A.bmiWert(80, -180) === null && A.bmiWert(null, null) === null);

/* ---------- 2) Die Bereiche ---------- */
pruefe("es sind die vier WHO-Bereiche", A.BMI_BEREICHE.length === 4);
pruefe("sie stehen aufsteigend",
  A.BMI_BEREICHE.slice(0, 3).every((b, i) => b.bis < (A.BMI_BEREICHE[i+1].bis || 999)));
pruefe("der letzte ist nach oben offen",
  A.BMI_BEREICHE[A.BMI_BEREICHE.length - 1].bis === null);
pruefe("jeder hat Namen und Farbe",
  A.BMI_BEREICHE.every(b => b.name && /^#[0-9A-Fa-f]{6}$/.test(b.farbe)));
pruefe("17 ist Untergewicht", A.bmiBereich(17).name === "Untergewicht");
pruefe("22 ist Normalgewicht", A.bmiBereich(22).name === "Normalgewicht");
pruefe("27 ist Uebergewicht", A.bmiBereich(27).name === "Übergewicht");
pruefe("33 ist Adipositas", A.bmiBereich(33).name === "Adipositas");
/* Die Grenzen gehoeren zum OBEREN Bereich (18,5 ist kein Untergewicht mehr). */
pruefe("die Grenze 18,5 zaehlt nach oben", A.bmiBereich(18.5).name === "Normalgewicht");
pruefe("die Grenze 25 ebenfalls", A.bmiBereich(25).name === "Übergewicht");
pruefe("ohne Wert kein Bereich", A.bmiBereich(null) === null && A.bmiBereich(0) === null);

/* ---------- 3) Die Reihe ---------- */
const G = [{ datum:"2026-06-01", kg:82 }, { datum:"2026-07-01", kg:80 }, { datum:"2026-07-20", kg:79.5 }];
const reihe = A.bmiReihe(G, 180);
pruefe("je Eintrag ein Punkt", reihe.length === 3);
pruefe("das Datum wandert mit", reihe[0].datum === "2026-06-01");
pruefe("und der gerechnete Wert", reihe[1].bmi === A.bmiWert(80, 180));
pruefe("ohne Groesse bleibt die Reihe leer", A.bmiReihe(G, 0).length === 0);
pruefe("ohne Gewichte auch", A.bmiReihe([], 180).length === 0);
pruefe("kaputte Eintraege fallen raus",
  A.bmiReihe(G.concat([{ datum:"2026-07-21", kg:0 }]), 180).length === 3);
pruefe("null wirft nicht", A.bmiReihe(null, 180).length === 0);

/* ---------- 4) Die Kurve ---------- */
const svg = A.bmiKurveHtml(reihe);
pruefe("es kommt ein Diagramm heraus", svg.indexOf("<svg") === 0);
pruefe("alle vier Baender sind gezeichnet",
  A.BMI_BEREICHE.every(b => svg.includes(b.farbe)) && (svg.match(/<rect/g) || []).length === 4);
pruefe("die Bereiche sind beschriftet",
  A.BMI_BEREICHE.every(b => svg.includes(b.name)));
pruefe("die Durchschnittslinie ist da (gestrichelt)",
  svg.includes("stroke-dasharray") && svg.includes("Schnitt"));
pruefe("der Durchschnitt stimmt",
  svg.includes("Schnitt " + ((reihe[0].bmi + reihe[1].bmi + reihe[2].bmi) / 3).toFixed(1)));
pruefe("je Eintrag ein Punkt", (svg.match(/<circle/g) || []).length === 3);
pruefe("und eine Linie dazwischen", svg.includes("<path"));
pruefe("bei EINEM Eintrag gibt es keinen Pfad, aber den Punkt",
  (() => { const s = A.bmiKurveHtml([{ datum:"x", bmi:24 }]);
           return !s.includes("<path") && (s.match(/<circle/g) || []).length === 1; })());
pruefe("ohne Daten steht ein Satz statt eines leeren Bildes",
  A.bmiKurveHtml([]).includes("Ab dem ersten Gewicht"));
/* FESTE Skala: Zwei ganz verschiedene Reihen muessen dieselbe Achse haben. */
const hoch = A.bmiKurveHtml([{ datum:"a", bmi:31 }, { datum:"b", bmi:32 }]);
const tief = A.bmiKurveHtml([{ datum:"a", bmi:19 }, { datum:"b", bmi:20 }]);
const bandVon = s => (/<rect[^>]*y="([\d.]+)"[^>]*height="([\d.]+)"/.exec(s) || []).slice(1).join("|");
pruefe("die Baender liegen unabhaengig von den Werten immer gleich",
  bandVon(hoch) === bandVon(tief) && bandVon(hoch).length > 0);
pruefe("ein Ausreisser sprengt die Achse nicht",
  A.bmiKurveHtml([{ datum:"a", bmi:80 }]).indexOf("<svg") === 0);

/* ---------- 5) Verdrahtung ---------- */
pruefe("die Kachel steht im Register", /\["bmi",\s*"BMI",\s*"bmi-karte"\]/.test(src));
pruefe("sie erscheint nur mit Groesse UND Gewicht",
  /if\(id === "bmi"\) return \(sitzung\.daten\.profil\.groesse \|\| 0\) > 0 && \(sitzung\.daten\.gewichte \|\| \[\]\)\.length > 0;/.test(src));
pruefe("ohne Groesse sagt die Kachel, was fehlt",
  grabFn("bmiZeichnen").includes("fehlt deine Größe"));
pruefe("die Einordnung nennt den Bereich", grabFn("bmiZeichnen").includes("b.name"));
pruefe("und den Vorbehalt fuer Trainierende",
  grabFn("bmiZeichnen").includes("Muskelmasse hebt den Wert"));
pruefe("der Tipp fuehrt zu den Gewichts-Eintraegen",
  src.includes('id="bmi-diagramm" class="abstand stat-tap" onclick="gewichtDetailsOeffnen()"'));
pruefe("gezeichnet wird zusammen mit dem Gewicht (eine Stelle)",
  grabFn("gewichtStatistikZeichnen").includes("bmiZeichnen()"));

/* ---------- 6) Die v160-Abgrenzung gilt weiter ---------- */
/* Der BMI darf NICHT in die Belastungs-Rechnung geraten sein. */
["muskelLast", "rechnungsGrundlage", "satzGewichtung"].forEach(fn => {
  const q = grabFn(fn);
  pruefe(fn + " rechnet weiterhin ohne BMI",
    !/bmi/i.test(q) && !/groesse/i.test(q));
});
pruefe("die Begruendung steht weiter im Quelltext",
  /Körpergewicht und BMI/.test(src));

/* ---------- 7) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v206",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 206);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.206", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
