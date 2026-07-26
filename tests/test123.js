/* v123-Test: weniger Text auf den einfachen Stufen (Stufe 1 am wenigsten).
   Reine Text-/Markup-Reduktion -> struktureller Quelltext-Check: der Muster-
   Hinweis der Stufe 1 steht hinter dem Info-Knopf im Kopf (und nicht mehr ueber
   der Liste), Platzhalter/Untertitel sind kurz bzw. weg, und die zwei Fuell-Saetze
   auf Heute sind verschwunden — der INFORMATIVE Ruhetag-Untertitel bleibt.
   Hinweis: in Test-LABELS keine typografischen Anfuehrungszeichen verwenden —
   ein ASCII-Schluss-Quote darin beendet den String (Haus-Falle, s. DECISIONS). */
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

/* 1) Stufe 1: der Muster-Hinweis ist ein „i" im Kopf, keine Textwand mehr. */
pruefe("Info-Knopf im Pläne-Kopf", src.includes('id="plaene-info-knopf"'));
pruefe("Info-Text als eigener, versteckter Block", /id="info-notizblock" class="meta info-text" hidden/.test(src));
pruefe("Hinweis-Wand über der Liste weg", !/const hinweis = s <= 1/.test(src));
pruefe("kurzer Platzhalter in der Textarea", src.includes('placeholder="Eine Übung je Zeile"'));
pruefe("Leer-Zustand ohne Plus-Erklärung",
  src.includes('<div class="leer">Noch nichts notiert.</div>'));
pruefe("Getan-Untertitel entfernt", !src.includes("Kurz festhalten, was du gemacht hast."));

/* 2) Das „i" gibt es NUR auf Stufe 1 und klappt beim Stufenwechsel zu. */
const kopf = grabFn("notizblockKopfSetzen");
pruefe("Info-Knopf nur auf Stufe 1", /info\.hidden = stufe\(\) > 1/.test(kopf));
pruefe("aufgeklappter Text wird beim Stufenwechsel eingeklappt",
  /text && stufe\(\) > 1/.test(kopf) && kopf.includes("text.hidden = true"));
pruefe("Titel/Mehr-Verhalten unverändert (Regression)",
  kopf.includes('einfach ? "Notizblock" : "Pläne"') && kopf.includes("mehr.hidden = !einfach"));

/* 3) „Heute": Füll-Sätze weg, informativer Untertitel bleibt. */
const heute = grabFn("heuteKarteZeichnen");
pruefe("Füll-Satz nach dem Training weg", !heute.includes("Gut gemacht"));
pruefe("Erledigt-Überschrift bleibt", heute.includes("<h2>Erledigt</h2>"));
pruefe("Ruhetag-Frage weg", !heute.includes("trainiert trotzdem"));
pruefe("Ruhetag-Zustand bleibt sichtbar", heute.includes("Als Ruhetag markiert."));
pruefe("Ruhetag-Knöpfe unberührt (Regression)",
  heute.includes("ruhetagHeute()") && heute.includes("heuteTrainingEintragen()"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
