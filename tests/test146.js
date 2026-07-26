/* v146-Test: zwei Wuensche aus der Ideen-Box.
   1) Plan-Editor: Name und Sportart liegen in den Einstellungen, der Name steht
      als Ueberschrift, die Aktivitaets-Werte stehen AUSSERHALB der Einstellungen.
   2) Muskelkarte: im Erkunden-Modus ist hoechstens EIN Muskel gewaehlt.
   Die Struktur wird ueber die Verschachtelung geprueft (Position im Abschnitt),
   nicht ueber Zeichenabstaende — Lehre aus v136.
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
  /* muskelTippen: der Treffer kommt sonst aus dem Bild-Pixel — hier reicht der
     Schluessel selbst als Ereignis. Die Zeichen-Funktionen sind reine Anzeige. */
  "let muskelStatus = { ansicht:'front', gewaehlt:[], modus:'erkunden' };",
  "function muskelTreffer(e){ return e; }",
  "function muskelMalen(){}",
  "function muskelAuswahlZeichnen(){}",
  "function muskelStatusText(){}",
  grabFn("muskelTippen"),
  "module.exports = { muskelTippen, status: () => muskelStatus };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const { muskelTippen, status } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 2) Editor-Struktur: was liegt wo? ---------- */
const abStart = src.indexOf('<section id="view-editor"');
const abEnde  = src.indexOf("</section>", abStart);
const editor  = src.slice(abStart, abEnde);
const pos = teil => editor.indexOf(teil);

const blockAuf = pos('<div id="editor-einst-block"');
const blockZu  = pos("</div><!-- /editor-einst-block -->");
pruefe("Einstellungs-Block existiert und ist geschlossen", blockAuf > 0 && blockZu > blockAuf);

const drin = teil => pos(teil) > blockAuf && pos(teil) < blockZu;
pruefe("Name liegt in den Einstellungen", drin('<input id="plan-name"'));
pruefe("Sportart liegt in den Einstellungen", drin('<div id="plan-sportart"'));
pruefe("Wochentage liegen in den Einstellungen", drin('<div id="plan-tag"'));
pruefe("Kraft-Block (Reihenfolge/Bonus) liegt in den Einstellungen", drin('<div id="editor-kraft"'));
pruefe("Aktivitaets-Werte liegen AUSSERHALB der Einstellungen", pos('<div id="editor-aktivitaet"') > blockZu);
pruefe("Aktivitaets-Block ist eine eigene Karte", editor.includes('<div id="editor-aktivitaet" class="karte" hidden>'));
pruefe("Name aktualisiert die Zeile beim Tippen", editor.includes('oninput="planNameTippen(this.value)"'));

/* ---------- 3) Editor-Verdrahtung ---------- */
const zeichnen = grabFn("editorZeichnen");
pruefe("ohne Sportart klappt der Block zwangsweise auf",
  zeichnen.includes("const einstOffen = editorEinstOffen || !hatSport"));
pruefe("Block folgt dieser Entscheidung",
  zeichnen.includes('document.getElementById("editor-einst-block").hidden = !einstOffen'));
pruefe("Tippen zeichnet den Editor NICHT neu (Fokus bliebe sonst nicht im Feld)",
  !grabFn("planNameTippen").includes("editorZeichnen"));

/* ---------- 4) Erkunden-Modus: hoechstens EIN Muskel ---------- */
muskelTippen("biceps");
pruefe("erster Tipp waehlt den Muskel", JSON.stringify(status().gewaehlt) === '["biceps"]');
muskelTippen("triceps");
pruefe("zweiter Tipp ERSETZT die Wahl", JSON.stringify(status().gewaehlt) === '["triceps"]');
muskelTippen("triceps");
pruefe("derselbe Muskel nochmal hebt auf", JSON.stringify(status().gewaehlt) === "[]");
muskelTippen("abs");
muskelTippen("glutes");
muskelTippen("calves");
pruefe("nie mehr als einer, egal wie oft getippt wird", status().gewaehlt.length === 1);
pruefe("kein Treffer laesst die Wahl unberuehrt",
  (muskelTippen(null), JSON.stringify(status().gewaehlt) === '["calves"]'));

/* Heatmap-Modus war schon immer einfach-waehlend — er muss es bleiben. */
status().modus = "trainiert";
muskelTippen("neck");
pruefe("Heatmap-Modus waehlt weiterhin genau einen", JSON.stringify(status().gewaehlt) === '["neck"]');

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
