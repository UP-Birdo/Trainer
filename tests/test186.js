/* v186-Test: Intervall-Plaene aus dem Assistenten (ROADMAP, 21. Runde — die
   zweite Haelfte des Intervall-Wunsches).

   Die Zusagen, um die es geht:
   1. Die Frage kommt NUR bei Sportarten mit Runden-Training, und sie steht VOR
      der Dauer-Frage — „In Runden" ersetzt Dauer und Strecke (v133), also
      duerfen deren Fragen danach wegfallen.
   2. Die Gesamtdauer wird GERECHNET, mit derselben Funktion wie Timer und
      Editor. Eine zweite Rechnung waere eine zweite Wahrheit.
   3. Die Standardwerte sind EINE Wahrheit (`IV_STANDARD`) und unveraendert
      8/30/15; eine Sportart darf eine eigene Vorgabe nennen.
   4. Ohne Runden bleibt alles genau wie bis v185.
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
/** Das echte SPORTARTEN-Literal — damit die Vorgaben der Sportarten wirklich
    geprueft werden und nicht ein Nachbau. */
function grabSportarten(){
  const i = src.indexOf("const SPORTARTEN = [");
  if(i < 0) throw new Error("SPORTARTEN nicht gefunden");
  let tiefe = 0;
  for(let k = src.indexOf("[", i); k < src.length; k++){
    if(src[k] === "[") tiefe++;
    else if(src[k] === "]"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: SPORTARTEN");
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabSportarten(),
  grabFn("sportart"),
  grabFn("planTypFuer"),
  grabConst("IV_STANDARD"),
  grabFn("ivStandardFuer"),
  grabFn("wzRundenGewaehlt"),
  grabFn("intervallPhasen"),
  grabFn("intervallGesamt"),
  grabFn("aktivitaetsFelderVorbereiten"),
  "module.exports = { SPORTARTEN, sportart, IV_STANDARD, ivStandardFuer, wzRundenGewaehlt," +
  " intervallPhasen, intervallGesamt, aktivitaetsFelderVorbereiten };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) IV_STANDARD ist eine Wahrheit und unveraendert ---------- */
pruefe("die Standardwerte sind unveraendert 8/30/15",
  A.IV_STANDARD.runden === 8 && A.IV_STANDARD.belastung === 30 && A.IV_STANDARD.pause === 15);
pruefe("der Editor-Umschalter nutzt die Konstante",
  grabFn("planIntervallSetzen").includes("IV_STANDARD"));
/* v211 (Nutzer-Ansage): Der eigene Anlege-Bildschirm ist entfallen — Runden
   sind eine Entscheidung IM Plan, keine eigene Plan-Art. Damit gibt es
   `intervallPlanNeu` nicht mehr; die Zusage wird zur Gegenprobe, dass wirklich
   NICHTS davon zurueckgeblieben ist. */
/* Geprueft wird auf CODE, nicht auf Text: Der Quelltext erklaert an zwei
   Stellen, was hier entfallen ist, und nennt die Namen dabei — ein bloszes
   Suchen nach dem Wort schluege auf dem eigenen Merkzettel an. */
pruefe("die eigene Intervall-Anlage ist restlos entfallen",
  !/function intervallPlanNeu\(/.test(src) &&
  !/function intervallPlanSpeichern\(/.test(src) &&
  !/function intervallSportarten\(/.test(src) &&
  !/<section id="view-intervall-neu"/.test(src) &&
  !/zeige\("view-intervall-neu"\)/.test(src) &&
  !/id="iv-runden"/.test(src));
/* Genau ZWEI Stellen duerfen die Zahlen kennen: die Konstante selbst und die
   Stelle, die sie in IV_GRENZEN abgrenzt — nirgends sonst noch ein 8/30/15. */
pruefe("keine hartkodierte Kopie mehr im Editor",
  !/intervall = \{ runden:8/.test(src));

/* ---------- 2) ivStandardFuer ---------- */
pruefe("ohne eigene Vorgabe kommt der Haus-Standard", (() => {
  const v = A.ivStandardFuer("laufen");
  return v.runden === 8 && v.belastung === 30 && v.pause === 15;
})());
pruefe("Kampfsport hat seine eigene Runde (3 x 3 min, 1 min Pause)", (() => {
  const v = A.ivStandardFuer("kampfsport");
  return v.runden === 3 && v.belastung === 180 && v.pause === 60;
})());
pruefe("eine Pause von 0 wuerde nicht durch den Standard ersetzt", (() => {
  // Sanity der Schreibweise: 0 ist ein gueltiger Wert, kein fehlender.
  const fn = grabFn("ivStandardFuer");
  return fn.includes("eigen.pause != null");
})());
pruefe("es kommt immer ein vollstaendiger Satz Werte heraus",
  A.SPORTARTEN.filter(s => s.intervall).every(s => {
    const v = A.ivStandardFuer(s.id);
    return v.runden > 0 && v.belastung > 0 && v.pause >= 0;
  }));
/* Die Vorgabe ist ein DATENFELD an der Sportart: genau ein Eintrag je Sportart,
   die eine hat — und keine Zuweisung sonst irgendwo im Code. Gelesen wird sie an
   genau einer Stelle. */
pruefe("die eigene Vorgabe steht nur an der Sportart",
  (src.match(/intervallStandard:/g) || []).length ===
  A.SPORTARTEN.filter(s => s.intervallStandard).length);
pruefe("und wird an genau einer Stelle gelesen",
  grabFn("ivStandardFuer").includes(".intervallStandard") &&
  ["planIntervallSetzen", "aktivitaetsPlaeneBauen", "wzZusammenfassung"]
    .every(fn => !grabFn(fn).includes("intervallStandard")));

/* DIE LADEREIHENFOLGE — teuer bezahlt in genau dieser Version.
   `WIZARD_FRAGEN` ruft `ivStandardFuer` beim AUFBAU auf, also muss `IV_STANDARD`
   zu diesem Zeitpunkt schon initialisiert sein. Stand die Konstante weiter unten
   (bei IV_GRENZEN, wo sie thematisch hingehoert haette), warf das Laden der App
   „Cannot access 'IV_STANDARD' before initialization" — und die Seite blieb
   weiss. `--check` sieht das nicht, es prueft nur Syntax. */
pruefe("IV_STANDARD steht VOR der Fragenliste (Temporal Dead Zone)",
  src.indexOf("const IV_STANDARD") < src.indexOf("const WIZARD_FRAGEN") &&
  src.indexOf("const IV_STANDARD") > 0);
pruefe("ivStandardFuer ebenfalls",
  src.indexOf("function ivStandardFuer") < src.indexOf("const WIZARD_FRAGEN"));
pruefe("und SPORTARTEN steht vor beiden (ivStandardFuer liest sportart)",
  src.indexOf("const SPORTARTEN") < src.indexOf("const IV_STANDARD"));

/* ---------- 3) wzRundenGewaehlt ---------- */
pruefe("ohne Antwort keine Runden", A.wzRundenGewaehlt({}, "laufen") === false);
pruefe("mit durch keine Runden",
  A.wzRundenGewaehlt({ ivart_laufen:"durch" }, "laufen") === false);
pruefe("mit runden ja", A.wzRundenGewaehlt({ ivart_laufen:"runden" }, "laufen") === true);
pruefe("kaputte Eingaben werfen nicht",
  A.wzRundenGewaehlt(null, "laufen") === false && A.wzRundenGewaehlt(undefined, "laufen") === false);
/* Der wichtige Fall: Eine Sportart OHNE Runden-Training darf nie einen
   Intervall-Plan bekommen, auch wenn irgendwo ein Feld gesetzt wurde. */
pruefe("eine Sportart ohne Runden-Training kann es nicht",
  A.wzRundenGewaehlt({ ivart_yoga:"runden" }, "yoga") === false);
pruefe("es liefert immer einen echten Wahrheitswert",
  typeof A.wzRundenGewaehlt({}, "laufen") === "boolean");

/* ---------- 4) Die Felder werden angelegt ---------- */
const e = A.aktivitaetsFelderVorbereiten({});
A.SPORTARTEN.filter(s => s.planTyp === "aktivitaet").forEach(s => {
  if(s.intervall) pruefe("Feld angelegt fuer " + s.id, e["ivart_" + s.id] === "durch");
  else pruefe("kein Feld fuer " + s.id + " (kein Runden-Training)", e["ivart_" + s.id] === undefined);
});
pruefe("die Vorbelegung ist das Verhalten bis v185 (durchgehend)",
  A.SPORTARTEN.filter(s => s.intervall).every(s => !A.wzRundenGewaehlt(e, s.id)));
pruefe("eine bestehende Antwort wird nicht ueberschrieben",
  A.aktivitaetsFelderVorbereiten({ ivart_laufen:"runden" }).ivart_laufen === "runden");

/* ---------- 5) Die Frage: nur wo es sie gibt, und VOR der Dauer ---------- */
const fragenBlock = src.slice(src.indexOf('.concat(...SPORTARTEN.filter(s => s.planTyp === "aktivitaet")'),
                              src.indexOf("let wzSchritt = 0;"));
pruefe("der Frage-Block ist auffindbar", fragenBlock.length > 200);
pruefe("die Frage haengt an s.intervall", /s\.intervall \? \{ id:"ivart_"/.test(fragenBlock));
pruefe("Sportarten ohne Runden erzeugen keine leere Frage", /\.filter\(Boolean\)/.test(fragenBlock));
pruefe("die Intervall-Frage steht VOR der Dauer-Frage",
  fragenBlock.indexOf('id:"ivart_"') < fragenBlock.indexOf('id:"dauer_"'));
pruefe("die Dauer-Frage entfaellt bei Runden",
  /id:"dauer_"[\s\S]*?nurWenn: e => \(e\.sportarten \|\| \[\]\)\.includes\(s\.id\) && !wzRundenGewaehlt\(e, s\.id\)/.test(fragenBlock));
pruefe("die Strecken-Frage ebenso",
  /id:"strecke_"[\s\S]*?nurWenn: e => \(e\.sportarten \|\| \[\]\)\.includes\(s\.id\) && !wzRundenGewaehlt\(e, s\.id\)/.test(fragenBlock));
/* Die Ziel- und Uebungs-Fragen bleiben: Ein Runden-Plan kann sehr wohl Drills
   haben, und eine Messgroesse haengt nicht an der Dauer. */
pruefe("die Uebungs-Frage bleibt unberuehrt",
  /id:"drills_"[\s\S]*?nurWenn: e => \(e\.sportarten \|\| \[\]\)\.includes\(s\.id\),/.test(fragenBlock));
pruefe("die Frage nennt beide Antworten",
  fragenBlock.includes('"durch"') && fragenBlock.includes('"runden"'));
pruefe("und zeigt die Vorgabe der Sportart in der Antwort",
  /optionen: \[\["durch"[\s\S]*?ivStandardFuer\(s\.id\)/.test(fragenBlock));
pruefe("die Frage ist keine Zahl-Frage (sonst wuerde durch zu NaN)",
  !grabFn("wzZahlFeld").includes("ivart_"));

/* ---------- 6) Der Plan-Bau ---------- */
const bau = grabFn("aktivitaetsPlaeneBauen");
pruefe("er fragt ueber dieselbe Funktion", bau.includes("wzRundenGewaehlt(einrichtung, id)"));
pruefe("er nimmt die Vorgabe der Sportart", bau.includes("ivStandardFuer(id)"));
pruefe("die Dauer wird GERECHNET, nicht gesetzt",
  /intervallGesamt\(intervallPhasen\(iv\.runden, iv\.belastung, iv\.pause\)\)/.test(bau));
pruefe("ohne Runden gilt weiter die Antwort aus dem Wizard",
  bau.includes('einrichtung["dauer_" + id] || 3600'));
pruefe("das Intervall-Feld landet im Plan", /intervall: iv/.test(bau));
pruefe("ein Runden-Plan hat keine Strecke", /strecke: \(!iv && sp\.strecke\)/.test(bau));
pruefe("die Zeit-Einheit folgt der gerechneten Dauer", /zeitEinheit: dauer >= 3600/.test(bau));

/* Die Rechnung selbst — gegen die ECHTEN Funktionen, damit die Zahl im Plan
   nachweislich die des Timers ist. */
const ivL = A.ivStandardFuer("laufen");
const gesamtL = A.intervallGesamt(A.intervallPhasen(ivL.runden, ivL.belastung, ivL.pause));
pruefe("Laufen: 8 Runden ergeben 8x30 + 7x15 Sekunden", gesamtL === 8 * 30 + 7 * 15);
const ivK = A.ivStandardFuer("kampfsport");
const gesamtK = A.intervallGesamt(A.intervallPhasen(ivK.runden, ivK.belastung, ivK.pause));
pruefe("Kampfsport: 3 Runden ergeben 3x180 + 2x60 Sekunden", gesamtK === 3 * 180 + 2 * 60);
pruefe("und damit mehr als eine Stunde? Nein — die Einheit bleibt Minuten", gesamtK < 3600);

/* ---------- 7) Zusammenfassung und Vorbelegung ---------- */
const zus = grabFn("wzZusammenfassung");
pruefe("die Zusammenfassung kennt den Runden-Fall", zus.includes("wzRundenGewaehlt(einrichtung, id)"));
pruefe("sie zeigt die Intervall-Kurzform statt einer Dauer",
  /iv \? intervallText\(\{ intervall: iv \}\)/.test(zus));
pruefe("und laesst die Strecke weg", /sp\.strecke && !iv/.test(zus));
pruefe("ein bestehender Runden-Plan belegt die Frage vor",
  /if\(p\.intervall\) einrichtung\["ivart_" \+ p\.sportart\] = "runden";/.test(src));

/* ---------- 8) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v186",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 186);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.186", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
