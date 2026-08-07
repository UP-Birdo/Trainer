/* v153-Test: drei Wuensche aus der Ideen-Box.
   1) Muskel-Map an der Uebung zeigt BEIDE Seiten, wenn die Uebung beide trifft.
   2) Ein Tag mit Training ist kein Ruhetag mehr — still, ohne Meldung.
   3) Faellt ein Training weg (oder kommt zurueck), zieht der ganze Fortschritt
      nach: Flamme, Heute-Karte, Kalender, Statistiken.
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

const code = [
  "const MUSKELKARTEN = " + grabLiteral("MUSKELKARTEN") + ";",
  "const MUSKEL_SEITE = MUSKELKARTEN.standard.seite;",
  "const MUSKEL_VIEWS = MUSKELKARTEN.standard.views;",   // v216: die Figur-Box traegt ihr Verhaeltnis
  grabFn("figurVerhaeltnis"),
  grabFn("miniFigurHtml"),
  grabFn("muskelFigurenHtml"),
  grabFn("ruhetageOhneTrainingstage"),
  "module.exports = { muskelFigurenHtml, ruhetageOhneTrainingstage, MUSKEL_SEITE };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const { muskelFigurenHtml, ruhetageOhneTrainingstage, MUSKEL_SEITE } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const zaehleFiguren = html => (html.match(/class="mini-figur/g) || []).length;
const ansichten = html => [...html.matchAll(/data-mf-ansicht="(\w+)"/g)].map(m => m[1]);

/* ---------- 1) Beide Seiten, wo beide getroffen werden ---------- */
pruefe("Vorderseite pur -> eine Figur",
  zaehleFiguren(muskelFigurenHtml({ ansicht:"front", muskeln:["pectoral","deltoid"], sekundaer:[] })) === 1);
pruefe("Rueckseite pur -> eine Figur",
  zaehleFiguren(muskelFigurenHtml({ ansicht:"back", muskeln:["latissimus"], sekundaer:[] })) === 1);
const beide = muskelFigurenHtml({ ansicht:"back", muskeln:["latissimus"], sekundaer:["biceps"] });
pruefe("Haupt hinten + Neben vorn -> ZWEI Figuren", zaehleFiguren(beide) === 2);
pruefe("und zwar vorne zuerst, dann hinten",
  JSON.stringify(ansichten(beide)) === JSON.stringify(["front","back"]));
pruefe("beide Figuren tragen dieselben Muskeln (die Karte laesst Fremde weg)",
  (beide.match(/data-mf-muskeln="latissimus"/g) || []).length === 2);
pruefe("Sekundaermuskeln stehen an beiden", (beide.match(/data-mf-sek="biceps"/g) || []).length === 2);
const gemischt = muskelFigurenHtml({ ansicht:"front", muskeln:["quadriceps","hamstrings"], sekundaer:[] });
pruefe("Hauptmuskeln auf beiden Seiten -> zwei Figuren", zaehleFiguren(gemischt) === 2);
pruefe("ohne Muskeln gar nichts", muskelFigurenHtml({ ansicht:"front", muskeln:[], sekundaer:[] }) === "");
pruefe("ohne Info gar nichts", muskelFigurenHtml(null) === "");
pruefe("Extra-Klasse geht an beide Figuren",
  (muskelFigurenHtml({ ansicht:"back", muskeln:["latissimus"], sekundaer:["biceps"] }, "uebung-mini")
    .match(/uebung-mini/g) || []).length === 2);

/* ---------- 2) Trainingstag ist kein Ruhetag (still) ---------- */
const proto = [{ datum:"2026-07-20" }, { datum:"2026-07-22" }];
pruefe("Ruhetag mit Training faellt weg",
  JSON.stringify(ruhetageOhneTrainingstage(["2026-07-20","2026-07-21"], proto)) === JSON.stringify(["2026-07-21"]));
pruefe("Ruhetage ohne Training bleiben",
  JSON.stringify(ruhetageOhneTrainingstage(["2026-07-19","2026-07-21"], proto)) === JSON.stringify(["2026-07-19","2026-07-21"]));
pruefe("mehrere Trainings am selben Tag zaehlen einmal",
  JSON.stringify(ruhetageOhneTrainingstage(["2026-07-20"], proto.concat([{ datum:"2026-07-20" }]))) === "[]");
pruefe("leere Eingaben sind erlaubt",
  JSON.stringify(ruhetageOhneTrainingstage(null, null)) === "[]" &&
  JSON.stringify(ruhetageOhneTrainingstage([], proto)) === "[]");
pruefe("die Reihenfolge bleibt",
  JSON.stringify(ruhetageOhneTrainingstage(["2026-07-25","2026-07-19"], proto)) === JSON.stringify(["2026-07-25","2026-07-19"]));
pruefe("rein: die Eingabe wird nicht veraendert", (() => {
  const liste = ["2026-07-20","2026-07-21"];
  ruhetageOhneTrainingstage(liste, proto);
  return liste.length === 2;
})());

/* ---------- 3) Verdrahtung ---------- */
const sp = grabFn("speichern");
pruefe("Speichern setzt die Invariante durch", sp.includes("ruhetageOhneTrainingstage(sitzung.daten.ruhetage, sitzung.daten.protokoll)"));
pruefe("und meldet dabei NICHTS", !sp.includes("meldung(") || !/meldung\("[^"]*Ruhetag/.test(sp));
const neu = grabFn("fortschrittNeuZeichnen");
["statistikAktualisieren()","flammeZeichnen()","heuteKarteZeichnen()","zieleStartZeichnen()"].forEach(f =>
  pruefe("Fortschritt zeichnet " + f + " neu", neu.includes(f)));
const loeschen = grabFn("eintragLoeschen");
pruefe("Loeschen zieht den Fortschritt nach", loeschen.includes("fortschrittNeuZeichnen()"));
pruefe("Rueckgaengig ebenso", (loeschen.match(/fortschrittNeuZeichnen\(\)/g) || []).length === 2);
pruefe("der Papierkorb ebenso", grabFn("papierkorbWiederherstellen").includes("fortschrittNeuZeichnen()"));
const editor = grabFn("editorZeichnen");
pruefe("die Uebungs-Karte nutzt beide Seiten", editor.includes("muskelFigurenHtml(info)"));
pruefe("zwei Figuren bekommen die schmalere Klasse", editor.includes('zweiSeiten ? " zwei" : ""'));
pruefe("dafuer gibt es eine CSS-Regel", src.includes(".uebung-figur.zwei .mini-figur"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
