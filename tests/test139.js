/* v139-Test: Muskelkarte austauschbar + Sekundaermuskeln.
   Kern sind die Alias-Schicht (`muskelAufKarte`/`muskelnAufKarte` — sie macht
   einen Kartenwechsel schmerzfrei) und `uebungMuskelSatz` (alte Listen-Form UND
   neue Form mit Sekundaermuskeln). Dazu die Integritaet der aktiven Karte:
   Reihenfolge, Namen und Seiten muessen zusammenpassen, sonst faerbt sich der
   falsche Muskel — und die Uebungs-Zuordnungen duerfen nur bekannte Muskeln nennen.
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

const MUSKELKARTEN = eval("(" + grabLiteral("MUSKELKARTEN") + ")");
const MUSKEL_INFO = eval("(" + grabLiteral("MUSKEL_INFO") + ")");
const UEBUNG_MUSKELN = eval("(" + grabLiteral("UEBUNG_MUSKELN") + ")");
const KAT_MUSKELN = eval("(" + grabLiteral("KAT_MUSKELN") + ")");
const UEBUNGEN_DB = eval("(" + grabLiteral("UEBUNGEN_DB") + ")");

/* Die Alias-Funktionen gegen eine KUENSTLICHE Karte pruefen — genau der Fall,
   fuer den sie gebaut sind (eine feinere Karte, die einen Muskel aufteilt). */
const modul = { exports: {} };
new Function("module", "exports", [
  "const MUSKELKARTEN = { fein: { order:['brust_oben','brust_unten','biceps'], seite:{}, " +
  "  alias:{ pectoral:['brust_oben','brust_unten'], serratus:['nicht_da'] } } };",
  "const MUSKELKARTE_AKTIV = 'fein';",
  grabFn("muskelKarteDef"), grabFn("muskelAufKarte"), grabFn("muskelnAufKarte"),
  grabFn("uebungMuskelSatz"),
  "module.exports = { muskelAufKarte, muskelnAufKarte, uebungMuskelSatz };"
].join("\n"))(modul, modul.exports);
const { muskelAufKarte, muskelnAufKarte, uebungMuskelSatz } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Alias-Schicht — der Kern der Austauschbarkeit. */
pruefe("bekannter Muskel bleibt", muskelAufKarte("biceps").join() === "biceps");
pruefe("aufgeteilter Muskel wird zu seinen Teilen",
  muskelAufKarte("pectoral").join() === "brust_oben,brust_unten");
pruefe("Alias auf einen Muskel, den die Karte NICHT hat, verschwindet",
  muskelAufKarte("serratus").length === 0);
pruefe("voellig unbekannter Muskel verschwindet", muskelAufKarte("quatsch").length === 0);
pruefe("leer bleibt leer", muskelAufKarte("").length === 0 && muskelAufKarte(null).length === 0);
pruefe("Liste uebersetzen, Reihenfolge bleibt",
  muskelnAufKarte(["biceps","pectoral"]).join() === "biceps,brust_oben,brust_unten");
pruefe("keine Doppelten", muskelnAufKarte(["pectoral","brust_oben"]).join() === "brust_oben,brust_unten");
pruefe("leere Liste", muskelnAufKarte([]).length === 0 && muskelnAufKarte(undefined).length === 0);

/* 2) uebungMuskelSatz — beide Datenformen. */
pruefe("alte Form: nur primaer",
  JSON.stringify(uebungMuskelSatz(["biceps"])) === '{"p":["biceps"],"s":[]}');
pruefe("neue Form: primaer + sekundaer",
  JSON.stringify(uebungMuskelSatz({ p:["biceps"], s:["pectoral"] }))
    === '{"p":["biceps"],"s":["brust_oben","brust_unten"]}');
pruefe("ein Muskel ist nie primaer UND sekundaer",
  JSON.stringify(uebungMuskelSatz({ p:["biceps"], s:["biceps"] })) === '{"p":["biceps"],"s":[]}');
pruefe("leerer Eintrag", JSON.stringify(uebungMuskelSatz(null)) === '{"p":[],"s":[]}');

/* 3) Integritaet der AKTIVEN Karte (die echte). */
const karte = MUSKELKARTEN.standard;
pruefe("Karte hat Bilder fuer beide Seiten", !!(karte.views.front.img && karte.views.back.karte));
pruefe("jeder Muskel hat einen Namen",
  karte.order.every(k => MUSKEL_INFO[k] && MUSKEL_INFO[k].name));
pruefe("jeder Muskel hat eine Seite",
  karte.order.every(k => karte.seite[k] === "front" || karte.seite[k] === "back"));
pruefe("keine Seiten-Leiche", Object.keys(karte.seite).every(k => karte.order.indexOf(k) >= 0));
pruefe("keine Namens-Leiche", Object.keys(MUSKEL_INFO).every(k => karte.order.indexOf(k) >= 0));
pruefe("Muskelzahl passt in den Rot-Kanal (<=255)", karte.order.length <= 255);
pruefe("keine doppelte Muskel-id", new Set(karte.order).size === karte.order.length);

/* 4) Uebungs-Zuordnungen nennen nur Muskeln, die es gibt. */
const gueltig = new Set(karte.order);
const schlecht = [];
Object.keys(UEBUNG_MUSKELN).forEach(name => {
  const e = UEBUNG_MUSKELN[name];
  const alle = Array.isArray(e) ? e : (e.p || []).concat(e.s || []);
  alle.forEach(m => { if(!gueltig.has(m)) schlecht.push(name + ":" + m); });
});
pruefe("nur bekannte Muskeln in UEBUNG_MUSKELN" + (schlecht.length ? " (" + schlecht.slice(0,5).join(", ") + ")" : ""),
  schlecht.length === 0);
const namenDB = new Set(UEBUNGEN_DB.map(u => u.name));
const leichen = Object.keys(UEBUNG_MUSKELN).filter(n => !namenDB.has(n));
pruefe("keine Uebungs-Leiche" + (leichen.length ? " (" + leichen.join(", ") + ")" : ""), leichen.length === 0);
pruefe("jede Kategorie nennt nur bekannte Muskeln",
  Object.keys(KAT_MUSKELN).every(k => KAT_MUSKELN[k].muskeln.every(m => gueltig.has(m))));

/* 5) Sekundaermuskeln sind wirklich angekommen. */
const mitSek = Object.keys(UEBUNG_MUSKELN).filter(n => !Array.isArray(UEBUNG_MUSKELN[n]));
pruefe("mindestens 15 Grunduebungen mit Sekundaermuskeln", mitSek.length >= 15);
pruefe("jede davon hat p und s",
  mitSek.every(n => (UEBUNG_MUSKELN[n].p || []).length && (UEBUNG_MUSKELN[n].s || []).length));

/* 6) Verdrahtung. */
pruefe("EIN Wort schaltet die Karte um", /const MUSKELKARTE_AKTIV = "standard"/.test(src));
pruefe("abgeleitete Konstanten kommen aus der Karte",
  src.includes("const MUSKEL_ORDER = muskelKarteDef().order") &&
  src.includes("const MUSKEL_VIEWS = muskelKarteDef().views") &&
  src.includes("const MUSKEL_SEITE = muskelKarteDef().seite"));
pruefe("Mal-Routine kennt Sekundaermuskeln",
  grabFn("muskelnAufCanvas").includes("malen(sekundaer, Math.round(alpha * 0.45))"));
pruefe("EIN Bauer fuer alle Mini-Figuren", src.includes("function miniFigurHtml("));
pruefe("Bibliothek nennt die mitbelasteten Muskeln", src.includes("Mitbelastet: "));
pruefe("Figuren heller gezeichnet", /\.mini-figur img\{[^}]*opacity:1/.test(src));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
