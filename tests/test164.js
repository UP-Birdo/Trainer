/* v164-Test: Zurueck-Wischen von der linken Kante + Abbrechen im Aktionsmenue.

   Die Geste erfindet keinen zweiten Weg zurueck, sondern drueckt den
   Zurueck-Knopf der sichtbaren Ansicht. Geprueft wird deshalb BEIDES:
   die reine Wisch-Rechnung (`wischZurueck`) und der Vertrag im HTML —
   welche Ansichten einen markierten Zurueck-Knopf haben und welche
   bewusst KEINEN (Editor, Training, Bewertung, Ergebnis).
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
  const zeile = new RegExp("^const " + name + "\\s*=\\s*[^;]+;", "m").exec(src);
  if(!zeile) throw new Error("Konstante nicht gefunden: " + name);
  return zeile[0];
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabConst("WISCH_KANTE"),
  grabConst("WISCH_WEG"),
  grabConst("WISCH_SCHRAEG"),
  grabFn("wischZurueck"),
  "module.exports = { wischZurueck, WISCH_KANTE, WISCH_WEG, WISCH_SCHRAEG };"
].join("\n"))(modul, modul.exports);
const { wischZurueck, WISCH_KANTE, WISCH_WEG, WISCH_SCHRAEG } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/** Ein Abschnitt der index.html: von <section id="view-X" bis zum </section>. */
function ansicht(id){
  const start = src.indexOf('<section id="' + id + '"');
  if(start < 0) throw new Error("Ansicht nicht gefunden: " + id);
  const ende = src.indexOf("</section>", start);
  return src.slice(start, ende);
}

/* ---------- 1) Die Grenzwerte sind plausibel ---------- */
pruefe("die Kante ist schmal genug, um nicht mit normalem Tippen zu kollidieren",
  WISCH_KANTE > 0 && WISCH_KANTE <= 44);
pruefe("der Weg ist laenger als die Kante — sonst zaehlte jeder Zufallstipp",
  WISCH_WEG > WISCH_KANTE);
pruefe("die Schraege ist kleiner als der Weg — sonst zaehlte Scrollen als Wisch",
  WISCH_SCHRAEG < WISCH_WEG);

/* ---------- 2) Der saubere Wisch zaehlt ---------- */
pruefe("von ganz links weit nach rechts",
  wischZurueck({ x:5, y:300 }, { x:200, y:305 }) === true);
pruefe("genau an der Kante begonnen zaehlt noch",
  wischZurueck({ x:WISCH_KANTE, y:300 }, { x:WISCH_KANTE + WISCH_WEG, y:300 }) === true);
pruefe("genau die Mindestlaenge zaehlt noch",
  wischZurueck({ x:0, y:300 }, { x:WISCH_WEG, y:300 }) === true);
pruefe("genau die erlaubte Schraege zaehlt noch",
  wischZurueck({ x:0, y:300 }, { x:WISCH_WEG, y:300 + WISCH_SCHRAEG }) === true);

/* ---------- 3) Was NICHT zaehlt ---------- */
pruefe("Start in der Bildschirmmitte zaehlt nicht",
  wischZurueck({ x:WISCH_KANTE + 1, y:300 }, { x:400, y:300 }) === false);
pruefe("zu kurz zaehlt nicht",
  wischZurueck({ x:0, y:300 }, { x:WISCH_WEG - 1, y:300 }) === false);
pruefe("nach LINKS zaehlt nicht (das ist die Gegenrichtung)",
  wischZurueck({ x:20, y:300 }, { x:0, y:300 }) === false);
pruefe("senkrechtes Scrollen zaehlt nicht",
  wischZurueck({ x:5, y:300 }, { x:200, y:300 + WISCH_SCHRAEG + 1 }) === false &&
  wischZurueck({ x:5, y:300 }, { x:200, y:300 - WISCH_SCHRAEG - 1 }) === false);
pruefe("reines Hochwischen zaehlt nicht",
  wischZurueck({ x:5, y:400 }, { x:8, y:100 }) === false);
pruefe("fehlende Punkte werfen nicht",
  wischZurueck(null, { x:200, y:300 }) === false &&
  wischZurueck({ x:0, y:0 }, null) === false &&
  wischZurueck(null, null) === false);

/* ---------- 4) Der Vertrag im HTML: markierte Zurueck-Knoepfe ---------- */
const markiert = (src.match(/data-zurueck/g) || []).length;
pruefe("es gibt markierte Zurueck-Knoepfe", markiert >= 20);
pruefe("jeder sichtbare Zurueck-Knopf ist markiert",
  (src.match(/>Zurück<\/button>/g) || []).length ===
  (src.match(/data-zurueck>Zurück<\/button>/g) || []).length);

const mitZurueck = [
  "view-verlauf", "view-gewicht", "view-koerpermasse", "view-kalender", "view-muskeln",
  "view-papierkorb", "view-bibliothek", "view-profil", "view-ziele", "view-sportarten",
  "view-uebung-picker", "view-neuigkeiten", "view-wissen",
  // v164: Auf Stufe 1/2 gibt es keine Tab-Leiste — dort IST dieser Knopf der
  // einzige Weg zurueck (er ist nur ab Stufe 3 ausgeblendet).
  "view-einstellungen"
];
mitZurueck.forEach(id =>
  pruefe(id + " laesst sich wegwischen", ansicht(id).includes("data-zurueck")));
pruefe("das Profil ist keine Sackgasse mehr (v164)",
  ansicht("view-profil").includes('onclick="einstellungenOeffnen()" data-zurueck'));
pruefe("die Sportarten-Ansicht schert nicht mehr aus",
  !ansicht("view-sportarten").includes("‹ Zurück") &&
  !ansicht("view-sportarten").includes("justify-content:flex-start"));

/* ---------- 5) ... und die Ansichten, die bewusst KEINEN haben ---------- */
const ohneZurueck = [
  ["view-editor",     "ein Wisch wuerde hier Aenderungen verlieren"],
  ["view-training",   "ein Wisch wuerde hier das Training abbrechen"],
  ["view-bewertung",  "die Bewertung gehoert zum Training"],
  ["view-ergebnis",   "das Ergebnis gehoert zum Training"],
  ["view-start",      "die Tab-Startseite hat kein Zurueck"],
  ["view-plaene",     "Tab-Ansicht"],
  ["view-statistik",  "Tab-Ansicht"]
];
ohneZurueck.forEach(([id, grund]) =>
  pruefe(id + ": kein Wisch-Zurueck (" + grund + ")", !ansicht(id).includes("data-zurueck")));

/* ---------- 6) Die Verdrahtung der Geste ---------- */
const einrichten = grabFn("wischZurueckEinrichten");
pruefe("die Geste haengt am scrollenden Inhalt", einrichten.includes('getElementById("inhalt")'));
pruefe("und wird nur EINMAL angebunden", einrichten.includes("dataset.wisch"));
pruefe("zwei Finger sind kein Wisch", einrichten.includes("e.touches.length !== 1"));
pruefe("in einem Eingabefeld gilt sie nicht", einrichten.includes('closest("input,textarea,select")'));
pruefe("in einer waagerechten Reihe gilt sie nicht", einrichten.includes("inWaagerechterReihe(ziel)"));
pruefe("sie drueckt den Zurueck-Knopf, statt selbst zu navigieren",
  einrichten.includes("zurueckKnopfDerAnsicht()") && einrichten.includes("knopf.click()"));
pruefe("ein offener Dialog oder ein Menue hat Vorrang", einrichten.includes("ueberlagerungOffen()"));
pruefe("abgebrochene Beruehrungen setzen den Start zurueck", einrichten.includes("touchcancel"));
pruefe("die Geste wird beim Start eingerichtet", src.includes("wischZurueckEinrichten();"));

const knopfSuche = grabFn("zurueckKnopfDerAnsicht");
pruefe("gesucht wird nur in der SICHTBAREN Ansicht", knopfSuche.includes(".view.aktiv"));
pruefe("ein ausgeblendeter Zurueck-Knopf zaehlt nicht", knopfSuche.includes("!knopf.hidden"));

const ueberlagerung = grabFn("ueberlagerungOffen");
pruefe("Dialog und Aktionsmenue gelten als Ueberlagerung",
  ueberlagerung.includes("dialog-hintergrund") && ueberlagerung.includes("menue-hintergrund"));

const reihe = grabFn("inWaagerechterReihe");
pruefe("waagerechte Reihen werden an der Seite selbst erkannt, nicht an Klassennamen",
  reihe.includes("scrollWidth") && reihe.includes("overflowX"));

/* ---------- 7) Abbrechen im Aktionsmenue ---------- */
const menue = grabFn("aktionsMenue");
pruefe("jedes Aktionsmenue endet mit Abbrechen", menue.includes("menue-abbrechen"));
pruefe("und Abbrechen schliesst das Menue", menue.includes("menueSchliessen()"));
pruefe("Abbrechen steht NICHT in der Aktionsliste (sonst verschoeben sich die Indizes)",
  menue.indexOf("menueKlick(") < menue.indexOf("menue-abbrechen"));
pruefe("der Aufruf ohne Ereignis schliesst wirklich",
  grabFn("menueSchliessen").includes("if(e &&"));
pruefe("Abbrechen ist abgesetzt gestaltet", src.includes("#menue .menue-abbrechen{"));

/* ---------- 7b) Zurueck steht links ---------- */
pruefe("der Zurueck-Knopf wird im Kopf nach vorne gezogen",
  src.includes(".kopf [data-zurueck]{order:-1}"));
pruefe("und der Kopf richtet sich dann links aus",
  src.includes(".kopf:has([data-zurueck]){justify-content:flex-start"));

/* ---------- 8) Version und Neuigkeit ----------
   Die Version wird NICHT festgenagelt (das bricht bei jedem Update); geprueft
   wird, dass sie nicht hinter v164 zurueckfaellt und genau einmal dasteht. */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v164",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 164);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.164", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
