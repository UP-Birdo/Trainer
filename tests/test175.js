/* v175-Test: Wischen zum Löschen — die letzte fehlende iOS-Listen-Geste.

   Aus dem Navigations-Vergleich der 34. Runde. Gebaut auf dem Register aus
   v163: Jede Liste weiss dort schon, wie sie loescht, was in den Papierkorb
   wandert und wer danach neu zeichnet — die Geste haengt deshalb an der EINEN
   Stelle, durch die jede Zeile jeder Liste laeuft (`listenZeileHtml`).

   Geprueft werden die vier Wachen gegen Fehlausloesung und die Zusagen:
   1. Zu schraeg = Scrollen, zu kurz = Antippen.
   2. Immer nur EINE Zeile offen.
   3. Im Auswahl-Modus KEINE Wisch-Geste (dort heisst ein Tipp „anhaken").
   4. Die Zurueck-Geste aus v164 tritt zurueck, solange eine Zeile offen ist.
   Dazu: das Einzel-Loeschen laeuft ueber dasselbe Register — also fuer JEDE
   Liste mit Papierkorb, Rueckgaengig und Neuzeichnen.
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
  grabConst("WISCH_ZEILE_WEG"),
  grabConst("WISCH_ZEILE_SCHRAEG"),
  grabConst("WISCH_KANTE"),
  grabConst("WISCH_WEG"),
  grabConst("WISCH_SCHRAEG"),
  grabFn("wischZeile"),
  grabFn("wischZurueck"),
  "module.exports = { wischZeile, wischZurueck, WISCH_ZEILE_WEG, WISCH_ZEILE_SCHRAEG };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const P = (x, y) => ({ x, y });
const W = A.WISCH_ZEILE_WEG, S = A.WISCH_ZEILE_SCHRAEG;

/* ---------- 1) Die Geste selbst ---------- */
pruefe("nach links legt den Loeschen-Knopf frei",
  A.wischZeile(P(300, 200), P(300 - W - 10, 200)) === "auf");
pruefe("nach rechts macht wieder zu",
  A.wischZeile(P(100, 200), P(100 + W + 10, 200)) === "zu");
/* „Mindestens W" — dieselbe Lesart wie `wischZurueck` in v164, damit die
   beiden waagerechten Gesten nicht unterschiedlich streng sind. */
pruefe("genau die Mindestweite reicht",
  A.wischZeile(P(300, 200), P(300 - W, 200)) === "auf");
pruefe("einen Pixel darunter nicht mehr",
  A.wischZeile(P(300, 200), P(300 - W + 1, 200)) === null);
pruefe("die Zurueck-Geste ist genauso streng (mindestens, nicht mehr als)",
  A.wischZurueck(P(10, 200), P(10 + 70, 200)) === true);

/* Wache 1: zu schraeg = Scrollen. */
pruefe("senkrecht ist Scrollen, nicht Wischen",
  A.wischZeile(P(300, 200), P(300 - W - 40, 200 + S + 10)) === null);
pruefe("auch nach oben gescrollt loest nichts aus",
  A.wischZeile(P(300, 300), P(300 - W - 40, 300 - S - 10)) === null);
pruefe("etwas Schraeglage ist erlaubt",
  A.wischZeile(P(300, 200), P(300 - W - 40, 200 + S - 1)) === "auf");
pruefe("genau an der Grenze noch erlaubt",
  A.wischZeile(P(300, 200), P(300 - W - 40, 200 + S)) === "auf");

/* Wache 2: zu kurz = Antippen. */
pruefe("ein Wackeln beim Tippen loest nichts aus",
  A.wischZeile(P(300, 200), P(295, 202)) === null);
pruefe("gar keine Bewegung auch nicht",
  A.wischZeile(P(300, 200), P(300, 200)) === null);

/* Randfaelle. */
pruefe("ohne Anfang kommt null", A.wischZeile(null, P(10, 10)) === null);
pruefe("ohne Ende kommt null", A.wischZeile(P(10, 10), null) === null);
pruefe("die Geste haengt NICHT an der Bildschirmkante (anders als v164)",
  A.wischZeile(P(370, 200), P(370 - W - 10, 200)) === "auf" &&
  A.wischZeile(P(40, 200), P(40 - W + 5 - 10, 200)) === "auf");

/* ---------- 2) Verhaeltnis zur Zurueck-Geste (v164) ---------- */
/* Beide sind waagerecht — sie duerfen sich nicht in die Quere kommen. Die
   Zurueck-Geste geht nach RECHTS und nur von der linken Kante; die Zeilen-
   Geste zum Oeffnen geht nach LINKS. Der einzige Ueberschneidungsfall ist
   „Zeile zumachen" nahe der Kante — dafuer gibt es die Wache im Quelltext. */
pruefe("ein Linkswisch loest die Zurueck-Geste NIE aus",
  A.wischZurueck(P(10, 200), P(10 - W - 10, 200)) === false);
pruefe("die Zurueck-Geste braucht weiter die linke Kante",
  A.wischZurueck(P(300, 200), P(300 + 100, 200)) === false);
const zurueck = grabFn("wischZurueckEinrichten");
pruefe("und tritt zurueck, solange eine Zeile offen ist",
  /if\(wischZeileOffen\(\)\) return;/.test(zurueck));

/* ---------- 3) Nur EINE Zeile offen ---------- */
const oeffnen = grabFn("wischZeileOeffnen");
pruefe("beim Oeffnen wird die vorige geschlossen",
  /wischZeileSchliessen\(\);/.test(oeffnen));
const offen = grabFn("wischZeileOffen");
pruefe("eine geloeschte Zeile gilt nicht mehr als offen (Neuzeichnen)",
  /isConnected/.test(offen));

/* ---------- 4) Im Auswahl-Modus keine Wisch-Geste ---------- */
const zeileHtml = grabFn("listenZeileHtml");
pruefe("ohne Kennung bleibt die Zeile unveraendert",
  /if\(kennung === undefined \|\| kennung === null\) return innen;/.test(zeileHtml));
pruefe("im Auswahl-Modus kommt der Kaesten-Umschlag",
  /if\(listenAuswahlTyp === typ\)\{/.test(zeileHtml) && /listen-wahl/.test(zeileHtml));
pruefe("und NUR ausserhalb der Wisch-Umschlag",
  zeileHtml.indexOf('class="wisch"') > zeileHtml.indexOf("listen-wahl"));
pruefe("der Umschlag traegt den Loeschen-Knopf",
  /wisch-loeschen/.test(zeileHtml) && /listenEinzelLoeschen\(/.test(zeileHtml));
pruefe("die Kennung wird fuer den onclick entschaerft (v169)",
  /jsArg\(String\(kennung\)\)/.test(zeileHtml));
pruefe("der Umschlag entsteht an EINER Stelle, nicht in den Zeichnern",
  (src.match(/class="wisch"/g) || []).length === 1);
/* Und trotzdem gilt er fuer JEDE Liste — weil jede durch diese Stelle laeuft. */
["papierkorb", "tageswert", "koerpermass", "gewicht", "verlauf"].forEach(t =>
  pruefe("die Liste " + t + " laeuft durch listenZeileHtml",
    new RegExp('listenZeileHtml\\("' + t + '"').test(src)));

/* ---------- 5) Einzel-Loeschen ueber dasselbe Register ---------- */
const einzeln = grabFn("listenEinzelLoeschen");
const sammel = grabFn("listenAuswahlLoeschen");
pruefe("es holt seine Liste aus dem Register", /LISTEN_TYPEN\[typ\]/.test(einzeln));
pruefe("es findet den Eintrag ueber die Kennung des Registers",
  /String\(d\.kennung\(e\)\) === String\(kennung\)/.test(einzeln));
pruefe("ein unbekannter Eintrag loescht nichts", /if\(!eintrag\) return;/.test(einzeln));
pruefe("es legt eine flache Kopie fuer Rueckgaengig an",
  /const vorher = d\.liste\(\)\.slice\(\);/.test(einzeln) &&
  /const vorher = d\.liste\(\)\.slice\(\);/.test(sammel));
pruefe("es nutzt den Papierkorb, wo das Register einen vorsieht",
  /if\(d\.korb\)\{/.test(einzeln) && /inPapierkorb\(k\.typ, k\.name, eintrag\)/.test(einzeln));
pruefe("Rueckgaengig holt ihn dort wieder raus",
  /papierkorbEntfernen\(korbId\)/.test(einzeln));
pruefe("es speichert und zeichnet neu",
  /speichern\(\);/.test(einzeln) && /d\.zeichnen\(\);/.test(einzeln));
pruefe("es bietet Rueckgaengig an", /zeigenToast\([\s\S]*?, "info", \(\) =>/.test(einzeln));
pruefe("es schliesst die offene Zeile", /wischZeileSchliessen\(\);/.test(einzeln));
pruefe("es entfernt genau EINEN Eintrag",
  /d\.liste\(\)\.filter\(e => e !== eintrag\)/.test(einzeln));
/* Bewusst OHNE Rueckfrage — das Freilegen ist die Bestaetigung. Die
   Sammel-Loeschung fragt weiterhin, dort trifft ein Tipp viele. */
pruefe("das Einzel-Loeschen fragt NICHT", !/frage\(/.test(einzeln));
pruefe("die Sammel-Loeschung fragt weiterhin", /frage\(/.test(sammel));

/* ---------- 6) Anbindung und Aufraeumen ---------- */
const einrichten = grabFn("wischZeileEinrichten");
pruefe("die Geste haengt per Delegation an inhalt, nicht je Zeile",
  /getElementById\("inhalt"\)/.test(einrichten) && /closest\("\.wisch"\)/.test(einrichten));
pruefe("sie wird beim Start angebunden", /wischZeileEinrichten\(\);/.test(src));
pruefe("touchcancel raeumt den Anfang weg", /touchcancel/.test(einrichten));
pruefe("ein Tipp auf die offene Zeile schliesst sie, statt etwas auszuloesen",
  /stopPropagation\(\)/.test(einrichten) && /closest\("\.wisch-loeschen"\)/.test(einrichten));
pruefe("und zwar in der Capture-Phase (vor den onclick-Attributen)",
  /\}, true\);/.test(einrichten));
pruefe("der Ansichtswechsel schliesst eine offene Zeile",
  /wischZeileSchliessen\(\);/.test(grabFn("listenAuswahlPruefen")));

/* ---------- 7) Das Aussehen ---------- */
pruefe("der Umschlag schneidet den Knopf ab, solange er zu ist",
  /\.wisch\{position:relative;overflow:hidden\}/.test(src));
pruefe("der Inhalt liegt UEBER dem Knopf",
  /\.wisch-inhalt\{[^}]*z-index:1/.test(src) && /\.wisch-loeschen\{[^}]*z-index:0/.test(src));
pruefe("der Inhalt ist deckend (sonst schiene das Rot durch)",
  /\.wisch-inhalt\{[^}]*background:var\(--ground\)/.test(src) &&
  /\.karte \.wisch-inhalt\{background:var\(--panel\)\}/.test(src));
pruefe("offen schiebt sich der Inhalt genau um die Knopfbreite weg",
  /\.wisch-loeschen\{[^}]*width:88px/.test(src) &&
  /\.wisch\.offen \.wisch-inhalt\{transform:translateX\(-88px\)\}/.test(src));
pruefe("der Knopf traegt die Warnfarbe des Hauses",
  /\.wisch-loeschen\{[^}]*background:var\(--warn\)/.test(src));
pruefe("geschlossen ist er auch fuer Vorlese-Programme weg",
  /\.wisch-loeschen\{[^}]*visibility:hidden/.test(src));

/* ---------- 8) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v175",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 175);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.175", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
