/* 0.247.0-Test: Die Grundlagen-Zeile zieht sich hinter ihr eigenes "i" zurueck.

   Anlass (Nutzer): "die Infos, die ueber dem i stehen und viel Platz nehmen,
   auch in das i packen."

   Die Zusagen:
   1. DRAUSSEN NUR DIE KURZFORM. `grundlageKurz` nennt Anzahl der Trainings und
      den Stand in Worten — sonst nichts. Kein "Ohne ...", kein "Damit wuerde
      die Einschaetzung genauer", kein Wiedereinsteiger-Hinweis.
   2. NICHTS GEHT VERLOREN. Der volle `grundlageText` und die Ausdauer-
      Einordnung stehen weiter da — nur eben im aufklappbaren Block, ueber dem
      Lern-Text. Die v167-Zusage ("der Nutzer SIEHT, was fehlt") bleibt damit
      erfuellt, sie kostet nur einen Tipp.
   3. EIN "i" FUER BEIDES. Kein zweiter Knopf, kein zweiter Block: derselbe
      Bauer `lernenInfoKnopfHtml` traegt Beschriftung UND Vorspann.
   4. DER ANDERE AUFTRITT BLEIBT UNBERUEHRT. Die Phasen-Karte hat weiter ihren
      eigenen Block ohne Vorspann und mit der Standard-Beschriftung.
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
  "const WARNUNG_MINDEST_TRAININGS = 8;",
  grabBlock("LERNEN_INFO", "[", "]"),
  "function text(s){ return String(s).replace(/[&<>\"']/g, z => " +
    "({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[z])); }",
  grabFn("grundlageText"),
  grabFn("grundlageKurz"),
  grabFn("lernenInfoZeilen"),
  grabFn("lernenKnopfHtml"),
  "module.exports = { grundlageText, grundlageKurz, lernenKnopfHtml };"
].join("\n"))(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* Eine Grundlage, die alles hat, was die Zeile lang macht: fehlende Posten,
   die Wiedereinsteiger-Annahme und zu wenige Trainings fuer eine Warnung. */
const gLang = { trainings:3, stand:"solide", hat:["Schlaf", "Pausen"],
                fehlt:["Erfahrung", "Alter", "Ruhepuls"], reicht:false, annahme:true };
const gVoll = { trainings:47, stand:"stark", hat:["Erfahrung", "Alter", "Schlaf"],
                fehlt:[], reicht:true, annahme:false };

/* ---------- 1) Draussen nur die Kurzform ---------- */
pruefe("die Kurzform nennt Trainings und Stand",
  T.grundlageKurz(gLang) === "Grundlage: 3 Trainings · Stand: solide");
pruefe("die Einzahl stimmt",
  T.grundlageKurz({ trainings:1, stand:"solide", hat:[], fehlt:[], reicht:false, annahme:false })
    .startsWith("Grundlage: 1 Training ·"));
pruefe("ohne Stand bleibt sie trotzdem gueltig",
  T.grundlageKurz({ trainings:5, stand:"", hat:[], fehlt:[], reicht:true, annahme:false })
    === "Grundlage: 5 Trainings");
pruefe("ohne Grundlage kein Text", T.grundlageKurz(null) === "");
{
  const kurz = T.grundlageKurz(gLang), lang = T.grundlageText(gLang);
  pruefe("die Kurzform traegt nichts von der langen Aufforderung",
    !kurz.includes("Ohne ") && !kurz.includes("genauer") &&
    !kurz.includes("Wiedereinsteiger") && !kurz.includes("Für eine Warnung"));
  pruefe("und sie ist deutlich kuerzer als der volle Text",
    kurz.length * 2 < lang.length);
  pruefe("der volle Text sagt weiterhin alles",
    lang.includes("Ohne Erfahrung, Alter, Ruhepuls") && lang.includes("genauer") &&
    lang.includes("Wiedereinsteiger") && lang.includes("Für eine Warnung"));
}

/* ---------- 2) Die sichtbare Zeile traegt die Kurzform und sonst nichts ------
   0.248: Der Rest klappt nicht mehr auf, sondern liegt in `view-lernen`
   (test248). Was hier gilt: draussen NUR die Kurzform. */
{
  const html = T.lernenKnopfHtml(T.grundlageKurz(gLang), "view-muskeln");
  pruefe("die sichtbare Zeile zeigt die Kurzform",
    html.includes(">Grundlage: 3 Trainings · Stand: solide</span>"));
  pruefe("und nichts von der langen Aufforderung",
    !html.includes("genauer") && !html.includes("Wiedereinsteiger"));
  pruefe("es gibt genau EIN i", (html.match(/info-knopf/g) || []).length === 1);
  pruefe("das aria-label traegt dieselbe Beschriftung",
    html.includes('aria-label="Grundlage: 3 Trainings · Stand: solide"'));
}

/* ---------- 3) Verdrahtung ---------- */
{
  const zeile = grabFn("grundlagenZeileHtml");
  pruefe("die Muskelkarte reicht die Kurzform herein",
    zeile.includes('lernenKnopfHtml(grundlageKurz(g), "view-muskeln")'));
  pruefe("die lange Zeile steht NICHT mehr draussen",
    !zeile.includes("grundlageText(") && !zeile.includes("satzloseText("));
}
{
  const seite = grabFn("lernenOeffnen");
  pruefe("der volle Text lebt jetzt in der Lern-Ansicht",
    seite.includes("zeile(grundlageText(g))") && seite.includes("zeile(einordnung)"));
}

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.247.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 247000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.247.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
