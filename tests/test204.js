/* v204-Test: Die Zahlen erscheinen, wenn die Karte ins Blickfeld kommt
   (52. Runde B — Nutzer-Entscheidung „beim Scrollen automatisch").

   Der Wunsch lautete „erst wenn man drueber hovert"; ein iPhone hat kein
   Hovern, und `:hover` bleibt dort nach dem Antippen kleben (die Falle aus
   v97). Der Nutzer hat sich fuer das Scrollen entschieden.

   Die vier Punkte, an denen der Bau steht:
   1. DAS BAND. Gemessen wird nicht der Bildschirm, sondern sein mittleres
      Fuenftel (`FOKUS_BAND` schneidet oben und unten je 40 % weg). Mit dem
      ganzen Bildschirm waeren alle sichtbaren Karten „im Fokus" — dann klappte
      alles auf und der Wunsch waere ins Gegenteil verkehrt.
   2. ZURUECKKLAPPEN. Anders als die spaeten Figuren (v179) meldet sich der
      Beobachter NICHT ab — sonst staende nach einmal Durchscrollen wieder alles
      offen da.
   3. RUECKFALL. Ohne `IntersectionObserver` bleibt alles offen; wer „Bewegung
      reduzieren" gewaehlt hat, bekommt die Zahlen ohne Animation.
   4. NUR DIE ZAHLEN. Name, Marke und Figur bleiben immer sichtbar — sonst waere
      die Liste im eingeklappten Zustand nicht mehr benutzbar.
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
function grabLine(anfang){
  const zeile = src.split("\n").find(z => z.trim().startsWith(anfang));
  if(!zeile) throw new Error("Zeile nicht gefunden: " + anfang);
  return zeile.trim();
}

/* Der Beobachter wird ECHT gefahren: ein winziger IntersectionObserver-Ersatz
   merkt sich die Optionen und spielt Scroll-Ereignisse ein. */
const modul = { exports: {} };
new Function("module", "exports", [
  "let letzteOptionen = null, beobachtet = [], rueckruf = null, abgemeldet = [];",
  "function KlassenListe(){ const s = new Set(); return {" +
  "  add: k => s.add(k), remove: k => s.delete(k), contains: k => s.has(k)," +
  "  toggle: (k, an) => { if(an) s.add(k); else s.delete(k); } }; }",
  "function macheElement(){ return { classList: KlassenListe() }; }",
  /* Der Rueckfall wird echt geprueft: dann gibt es die Klasse GAR NICHT
     (`typeof ... !== "function"`), statt dass sie beim Aufruf wirft. */
  "const echterStub = function(cb, opt){" +
  "  rueckruf = cb; letzteOptionen = opt;" +
  "  return { observe: el => beobachtet.push(el), unobserve: el => abgemeldet.push(el)," +
  "           disconnect(){ beobachtet = []; } }; };",
  "let IntersectionObserver = echterStub;",
  "let elemente = [];",
  "const document = { getElementById: () => ({ id:'inhalt' })," +
  "  querySelectorAll: () => elemente };",
  grabLine("const FOKUS_BAND"),
  "let fokusBeobachter = null;",
  grabFn("fokusAufklappen"),
  "module.exports = {" +
  "  lauf(anzahl, mit){ IntersectionObserver = mit === false ? undefined : echterStub;" +
  "    elemente = []; beobachtet = []; abgemeldet = [];" +
  "    for(let i = 0; i < anzahl; i++) elemente.push(macheElement());" +
  "    fokusAufklappen('#x');" +
  "    return { elemente, beobachtet, abgemeldet, optionen: letzteOptionen }; }," +
  "  scrolle(treffer){ rueckruf(treffer.map(t => ({ target: t.el, isIntersecting: t.drin }))); }," +
  "  get FOKUS_BAND(){ return FOKUS_BAND; } };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Das Band ---------- */
const lauf = A.lauf(3);
pruefe("alle Karten werden beobachtet", lauf.beobachtet.length === 3);
pruefe("das Fenster ist der scrollende Inhalt, nicht das Fenster",
  lauf.optionen.root && lauf.optionen.root.id === "inhalt");
pruefe("gemessen wird ein schmales Band", lauf.optionen.rootMargin === A.FOKUS_BAND);
/* Vier Werte, sonst ist es kein Band — die folgenden Pruefungen setzen das
   voraus und duerfen nicht daran abstuerzen. */
const raender = A.FOKUS_BAND.split(" ");
const vollstaendig = raender.length === 4;
pruefe("das Band nennt alle vier Raender", vollstaendig);
pruefe("es schneidet oben UND unten weg",
  vollstaendig && /^-\d+%$/.test(raender[0]) && /^-\d+%$/.test(raender[2]));
pruefe("und laesst weniger als die halbe Hoehe uebrig",
  vollstaendig && /^-\d+%$/.test(raender[0]) && /^-\d+%$/.test(raender[2]) &&
  (100 - parseInt(raender[0].slice(1), 10) - parseInt(raender[2].slice(1), 10)) < 50);
pruefe("seitlich wird nichts abgeschnitten",
  vollstaendig && raender[1] === "0px" && raender[3] === "0px");

/* ---------- 2) Auf- und wieder zuklappen ---------- */
A.scrolle([{ el: lauf.elemente[1], drin: true }]);
pruefe("was ins Band kommt, klappt auf", lauf.elemente[1].classList.contains("im-fokus"));
pruefe("die anderen bleiben zu",
  !lauf.elemente[0].classList.contains("im-fokus") &&
  !lauf.elemente[2].classList.contains("im-fokus"));
A.scrolle([{ el: lauf.elemente[1], drin: false }, { el: lauf.elemente[2], drin: true }]);
pruefe("was hinausscrollt, klappt wieder zu", !lauf.elemente[1].classList.contains("im-fokus"));
pruefe("und die naechste auf", lauf.elemente[2].classList.contains("im-fokus"));
pruefe("keine Karte wird abgemeldet (sonst bliebe alles offen)",
  lauf.abgemeldet.length === 0);
pruefe("das steht auch so im Quelltext",
  !grabFn("fokusAufklappen").includes("unobserve"));

/* ---------- 3) Rueckfaelle ---------- */
const ohne = A.lauf(2, false);
pruefe("ohne Beobachter bleibt alles offen",
  ohne.elemente.every(e => e.classList.contains("im-fokus")));
pruefe("ohne Karten passiert gar nichts", A.lauf(0).beobachtet.length === 0);
pruefe("der vorige Beobachter wird abgeloest (kein Stapel)",
  grabFn("fokusAufklappen").includes("fokusBeobachter.disconnect()"));
pruefe("wer Bewegung reduziert, sieht die Zahlen ohne Animation",
  /@media \(prefers-reduced-motion: reduce\)\{[\s\S]{0,160}\.fokus-info\{[^}]*grid-template-rows:1fr/.test(src));

/* ---------- 4) Was eingeklappt sichtbar bleibt ---------- */
const karte = grabFn("planListeZeichnen");
pruefe("die Plan-Karte traegt die Fokus-Klasse", karte.includes('" auf-fokus"'));
pruefe("im Auswahl-Modus bleibt sie offen (dort wird verglichen)",
  karte.includes('(planAuswahlModus ? "" : " auf-fokus")'));
pruefe("nur die Zahlen liegen in der Huelle", karte.includes('<div class="fokus-info"><div class="meta">'));
pruefe("Name und Marke stehen ausserhalb",
  karte.indexOf("<h2>' + haken + text(p.name)") < karte.indexOf('class="fokus-info"'));
pruefe("die Muskel-Figur bleibt sichtbar",
  karte.indexOf('class="fokus-info"') < karte.indexOf("planFigurenHtml(p)"));
pruefe("die Liste haengt den Beobachter ein", karte.includes('fokusAufklappen("#plan-liste")'));
const vorschau = grabFn("vorschauZeichnen");
pruefe("die Vorschau-Zeile ebenfalls", vorschau.includes('class="vs-zeile auf-fokus"'));
pruefe("dort liegt die Satz-Zeile in der Huelle",
  vorschau.includes('<span class="fokus-info"><small>'));
pruefe("der Uebungsname bleibt aussen (er fuehrt zur Erklaerung, v169)",
  vorschau.indexOf("nameHtml") < vorschau.indexOf('class="fokus-info"'));
pruefe("und der Beobachter wird auch hier gesetzt",
  vorschau.includes('fokusAufklappen("#vorschau-liste")'));
/* Das Stylesheet: eingeklappt unsichtbar, aufgeklappt da. */
pruefe("eingeklappt ist die Huelle auf null", /\.fokus-info\{[^}]*grid-template-rows:0fr/.test(src));
pruefe("aufgeklappt auf ihre eigene Hoehe", /\.im-fokus \.fokus-info\{[^}]*grid-template-rows:1fr/.test(src));
pruefe("der Inhalt wird dabei beschnitten (sonst ragt er heraus)",
  /\.fokus-info > \*\{[^}]*overflow:hidden/.test(src));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v204",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 204);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.204", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
