/* v110-Test: Statistik-Akkordeon. Zwei Ebenen:
   1) Verdrahtung (Quelltext): jede optionale Statistik aus STAT_OPTIONEN hat eine
      .stat-karte mit passendem statToggle(id) — sonst öffnet die Überschrift nichts.
   2) Verhalten: die ECHTEN statToggle/statAkkordeonAnwenden gegen ein Mini-Fake-DOM
      (nur was die Funktionen anfassen) — Default zu, mehrere gleichzeitig offen,
      erneutes Antippen klappt zu. Extrahiert echten Code (nie kopieren). */
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
/* Objekt-/Array-Literal einer const-Deklaration wörtlich ziehen. */
function grabLiteral(name){
  const decl = "const " + name + " = ";
  const i = src.indexOf(decl);
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  let start = i + decl.length;
  while(start < src.length && src[start] !== "{" && src[start] !== "[") start++;
  const open = src[start], close = open === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === open) tiefe++;
    else if(src[k] === close){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}
function grabConstRaw(name){
  const m = src.match(new RegExp("const " + name + " = [^;]+;"));
  if(!m) throw new Error("Konstante nicht gefunden: " + name);
  return m[0];
}

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---- 1) Verdrahtung ---- */
const STAT_OPTIONEN = eval("(" + grabLiteral("STAT_OPTIONEN") + ")");
const kartenIds = STAT_OPTIONEN.map(o => o[2]);
pruefe("STAT_OPTIONEN hat 6 Einträge", STAT_OPTIONEN.length === 6);
pruefe("6 Statistik-Karten im Markup", (src.match(/class="karte stat-karte"/g) || []).length === 6);
kartenIds.forEach(id => {
  pruefe("Karte vorhanden: " + id, src.includes('id="' + id + '"'));
  pruefe("Toggle verdrahtet: " + id, src.includes("statToggle('" + id + "')"));
});
/* Die alten Info-Texte sind bewusst raus (Nutzer-Wunsch „weniger Text"). */
pruefe("Keine Statistik-Info-Knöpfe mehr",
  !src.includes("infoUmschalten('info-volumen')") && !src.includes("infoUmschalten('info-bestwerte')"));

/* ---- 2) Verhalten gegen Fake-DOM ---- */
function fakeKarte(id){
  const inhalt = { hidden: true };
  const pfeil = { textContent: "›" };
  return { id, _inhalt: inhalt, _pfeil: pfeil,
    querySelector(sel){ return sel === ".stat-inhalt" ? inhalt : sel === ".stat-pfeil" ? pfeil : null; } };
}
const karten = kartenIds.map(fakeKarte);
global.document = { querySelectorAll(sel){ return sel.indexOf(".stat-karte") >= 0 ? karten : []; } };

const code = [
  grabConstRaw("statOffen"),
  grabFn("statToggle"),
  grabFn("statAkkordeonAnwenden"),
  "module.exports = { statToggle, statAkkordeonAnwenden, statOffen };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

const karteVon = id => karten.find(k => k.id === id);

/* Default: alles eingeklappt */
T.statAkkordeonAnwenden();
pruefe("Default: alle Inhalte versteckt", karten.every(k => k._inhalt.hidden === true));
pruefe("Default: alle Pfeile zeigen ›", karten.every(k => k._pfeil.textContent === "›"));

/* Eine öffnen */
T.statToggle("stat-volumen");
pruefe("Volumen offen -> Inhalt sichtbar", karteVon("stat-volumen")._inhalt.hidden === false);
pruefe("Volumen offen -> Pfeil ⌄", karteVon("stat-volumen")._pfeil.textContent === "⌄");
pruefe("Andere bleiben zu", karteVon("stat-trainings")._inhalt.hidden === true);

/* Zweite öffnen — mehrere gleichzeitig offen */
T.statToggle("stat-trainings");
pruefe("Zwei gleichzeitig offen",
  karteVon("stat-volumen")._inhalt.hidden === false && karteVon("stat-trainings")._inhalt.hidden === false);

/* Erneut antippen klappt zu */
T.statToggle("stat-volumen");
pruefe("Erneut antippen -> wieder zu", karteVon("stat-volumen")._inhalt.hidden === true);
pruefe("Zu -> Pfeil wieder ›", karteVon("stat-volumen")._pfeil.textContent === "›");
pruefe("Die andere bleibt offen", karteVon("stat-trainings")._inhalt.hidden === false);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
