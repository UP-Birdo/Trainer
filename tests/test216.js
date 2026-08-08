/* v216-Test: Drei Befunde des Nutzers. (58. Runde.)

   Die drei Zusagen:
   1. DIE FARBE SITZT AUF DEM MUSKEL. Die Figur-Box traegt das Seitenverhaeltnis
      ihres Bildes; Bild UND Canvas fuellen sie ganz. Vorher richtete sich die
      Box nach dem Bild und der Canvas nach der Box — wo ein Browser die Breite
      eines hoehenskalierten Bildes anders bestimmt (Safari), lag die Farbe
      daneben.
   2. DIE VORSCHAU-ZEILEN STEHEN UNTEREINANDER, auch bei langen Namen: Ausrichtung
      an der ersten Zeile, Titel nimmt den freien Platz, Figur bleibt rechts.
   3. RUHETAGE LASSEN SICH STREICHEN — auch die automatischen. Dafuer die neue
      Liste `ruheAus`: Der automatische Ruhetag ist nicht gespeichert, sondern
      ergibt sich aus „vergangener Tag ohne Training"; ohne Gegenliste kaeme er
      sofort zurueck. Ein Tag mit Training braucht keine der beiden Listen.
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
  grabBlock("MUSKELKARTEN", "{", "}"),
  'const MUSKELKARTE_AKTIV = "standard";',
  grabFn("muskelKarteDef"),
  "const MUSKEL_VIEWS = muskelKarteDef().views;",
  grabFn("figurVerhaeltnis"),
  grabFn("tageVerschieben"),
  grabFn("tagStatus"),
  grabFn("ruhetagSchalten"),
  grabFn("autoRuhetage"),
  grabFn("ruhetageOhneTrainingstage"),
  "module.exports = { MUSKEL_VIEWS, figurVerhaeltnis, tagStatus, ruhetagSchalten," +
  " autoRuhetage, ruhetageOhneTrainingstage };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die Figur-Box traegt das Verhaeltnis ihres Bildes ---------- */
/* v223: Der Stil traegt jetzt zusaetzlich die Skala der Ansicht (`--fs`) — das
   Seitenverhaeltnis selbst bleibt die v216-Zusage und steht unveraendert vorn. */
pruefe("die Vorderseite bekommt ihr Verhaeltnis",
  A.figurVerhaeltnis("front").startsWith(' style="aspect-ratio:591/1086'));
pruefe("die Rueckseite ihr eigenes",
  A.figurVerhaeltnis("back").startsWith(' style="aspect-ratio:468/786'));
pruefe("eine unbekannte Ansicht liefert nichts (und bricht nichts)",
  A.figurVerhaeltnis("seite") === "");
/* Genau darum geht es: die beiden Seiten haben VERSCHIEDENE Verhaeltnisse. */
pruefe("die beiden Verhaeltnisse sind wirklich verschieden",
  A.MUSKEL_VIEWS.front.w / A.MUSKEL_VIEWS.front.h !== A.MUSKEL_VIEWS.back.w / A.MUSKEL_VIEWS.back.h);
/* Verdrahtung: beide Bau-Stellen setzen es, und Bild wie Canvas fuellen die Box. */
pruefe("die kleine Figur setzt es", grabFn("miniFigurHtml").includes("figurVerhaeltnis("));
pruefe("die grosse Karte setzt es", grabFn("muskelFigurenAufbauen").includes("figurVerhaeltnis("));
/* v217 (Korrektur an v216): Die BREITE gibt den Ton an, die Hoehe folgt dem Bild.
   v216 wollte es ueber `aspect-ratio` an einer hoehen-getriebenen Box loesen —
   Safari hat daraus eine riesige Figur gemacht. Jetzt steht nirgends mehr eine
   Box, deren Breite ein Browser aus einem hoehenskalierten Bild ableiten muss. */
pruefe("das Bild gibt der Box die Hoehe (grosse Karte)",
  /\.muskel-figur img\{display:block;width:100%;height:auto/.test(src));
pruefe("das Bild gibt der Box die Hoehe (kleine Figur)",
  /\.mini-figur img\{display:block;width:100%;height:auto/.test(src));
/* v223: Feste BREITE bleibt die Regel — sie steht nur als `--fb`. Der
   handgetunte Sonderfall fuer die Rueckseite (113 statt 103 px) ist entfallen:
   Den Groessen-Unterschied der beiden Zeichnungen rechnet jetzt `--fs` ueberall
   gleich heraus, statt an dieser einen Stelle von Hand. */
pruefe("die Vorschau setzt feste Breiten statt einer festen Hoehe",
  /\.koerper-vorschau \.mini-figur\{--fb:103px;height:auto\}/.test(src) &&
  !/#koerper-back\{width:/.test(src));
pruefe("die Doppel-Ansicht teilt sich die Breite",
  /muskel-doppelt \.muskel-figur\{[^}]*width:calc\(\(100% - 8px\) \/ 2\);height:auto/.test(src));
/* Die beiden Breiten muessen zu den Bildmaßen passen — sonst waere die Figur
   verzerrt. Gerechnet: 190 px Zielhoehe x Seitenverhaeltnis, auf 1 px genau. */
pruefe("103 px passen zur Vorderseite",
  Math.abs(103 - 190 * A.MUSKEL_VIEWS.front.w / A.MUSKEL_VIEWS.front.h) < 1);
pruefe("113 px passen zur Rueckseite",
  Math.abs(113 - 190 * A.MUSKEL_VIEWS.back.w / A.MUSKEL_VIEWS.back.h) < 1);

/* ---------- 2) Die Vorschau-Zeilen ---------- */
pruefe("die Zeile richtet sich an der ersten Textzeile aus",
  /\.vs-zeile\{display:flex;gap:10px;align-items:flex-start/.test(src));
pruefe("der Titel nimmt den freien Platz", /\.vs-titel\{[^}]*flex:1 1 auto/.test(src));
pruefe("die Figur bleibt am rechten Rand", /\.vs-zeile \.mini-figur\{margin-left:auto/.test(src));
pruefe("die Nummer schrumpft nicht", /\.vs-nr\{[^}]*flex:0 0 auto/.test(src));

/* ---------- 3) Ruhetage streichen ---------- */
const heute = "2026-08-14";
const leer = {};
const mitTraining = { "2026-08-12": [{ datum:"2026-08-12", sportart:"kraft" }] };

/* Ohne Gegenliste: ein vergangener leerer Tag ist automatischer Ruhetag. */
pruefe("vergangener Tag ohne alles = automatischer Ruhetag",
  A.tagStatus("2026-08-10", heute, leer, new Set(), null, false, new Set()).art === "autoruhe");
/* Mit Gegenliste bleibt er leer — das ist der ganze Sinn der Sache. */
pruefe("gestrichener Tag bleibt leer",
  A.tagStatus("2026-08-10", heute, leer, new Set(), null, false, new Set(["2026-08-10"])).art === "leer");
pruefe("ein markierter Ruhetag bleibt Ruhetag",
  A.tagStatus("2026-08-10", heute, leer, new Set(["2026-08-10"]), null, false, new Set()).art === "ruhe");
/* Training schlaegt beides — auch wenn beide Listen den Tag noch tragen. */
pruefe("Training schlaegt Ruhetag UND Streichung",
  A.tagStatus("2026-08-12", heute, mitTraining, new Set(["2026-08-12"]), null, false,
              new Set(["2026-08-12"])).art === "trainiert");
/* Alte Aufrufer ohne die neue Liste funktionieren unveraendert weiter. */
pruefe("ohne die neue Liste bleibt alles wie vorher",
  A.tagStatus("2026-08-10", heute, leer, new Set(), null, false).art === "autoruhe");

/* Das Umschalten selbst. */
const w1 = A.ruhetagSchalten("2026-08-10", ["2026-08-10","2026-08-11"], [], false);
pruefe("streichen nimmt aus den Ruhetagen raus", w1.ruhetage.indexOf("2026-08-10") < 0);
pruefe("und traegt in die Streichliste ein", w1.ruheAus.indexOf("2026-08-10") >= 0);
pruefe("die anderen Ruhetage bleiben", w1.ruhetage.indexOf("2026-08-11") >= 0);
const w2 = A.ruhetagSchalten("2026-08-10", [], ["2026-08-10"], true);
pruefe("markieren traegt wieder als Ruhetag ein", w2.ruhetage.indexOf("2026-08-10") >= 0);
pruefe("und raeumt die Streichung weg", w2.ruheAus.indexOf("2026-08-10") < 0);
pruefe("kein Tag steht je in beiden Listen",
  w1.ruhetage.every(d => w1.ruheAus.indexOf(d) < 0) && w2.ruhetage.every(d => w2.ruheAus.indexOf(d) < 0));
/* Zweimal streichen darf keinen Doppeleintrag erzeugen. */
const w3 = A.ruhetagSchalten("2026-08-10", [], ["2026-08-10"], false);
pruefe("zweimal streichen bleibt ein Eintrag",
  w3.ruheAus.filter(d => d === "2026-08-10").length === 1);

/* Die Automatik traegt Gestrichenes nicht erneut ein. */
pruefe("die Automatik respektiert die Streichung",
  A.autoRuhetage("2026-08-10", "2026-08-13", [], [], ["2026-08-10","2026-08-11"]).length === 1);
pruefe("ohne Streichliste arbeitet sie wie bisher",
  A.autoRuhetage("2026-08-10", "2026-08-13", [], []).length === 3);

/* Ein Trainingstag braucht keine der beiden Listen (Invariante aus v153). */
pruefe("die Streichliste wird beim Training mitgereinigt",
  JSON.stringify(A.ruhetageOhneTrainingstage(["2026-08-12"], [{ datum:"2026-08-12" }])) === "[]");
pruefe("und das Speichern raeumt beide Listen",
  (grabFn("speichern").match(/ruhetageOhneTrainingstage\(/g) || []).length === 2);
/* Das Tag-Fenster nennt den automatischen Ruhetag und bietet das Streichen an. */
const fenster = grabFn("tagOeffnen");
pruefe("das Tag-Fenster kennt den automatischen Ruhetag", fenster.includes("istAutoRuhe"));
pruefe("es nennt ihn beim Namen", fenster.includes("Ruhetag (automatisch)"));
pruefe("es bietet Streichen an", fenster.includes("Ruhetag streichen"));
pruefe("an einem Trainingstag gibt es den Knopf nicht", /if\(!proto\.length\)\s*\n?\s*aktionen\.push/.test(fenster));
/* Das neue Feld gehoert in die Nachruestung (additiver Datenvertrag). */
pruefe("das neue Feld wird nachgeruestet", /Array\.isArray\(daten\.ruheAus\)/.test(src));

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v216",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 216);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.216", punkte:['));
/* v217: die Korrektur an der Figuren-Ausrichtung hat ihre eigene Neuigkeit. */
pruefe("die Korrektur ist als Neuigkeit vermerkt", src.includes('{ stand:"0.217", punkte:['));
pruefe("die Legende unter den Vorschau-Figuren ist weg",
  /koerper-legende[\s\S]{0,120}leg\.innerHTML = ""/.test(grabFn("koerperVorschauZeichnen")));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
