/* v208-Test: Teilbereiche der Muskelkarte (Muskel-Map v2).

   Die vier Zusagen, die dieser Test haelt:
   1. DIE REIHENFOLGE IST DIE NUMMER. MUSKEL_TEILE steht in derselben Ordnung,
      die tools\Muskelkarte-Bauen.ps1 in den GRUEN-Kanal der Index-Karte brennt.
      Wer hier umsortiert, ohne das Werkzeug laufen zu lassen, faerbt den
      falschen Abschnitt — der Test haelt die Reihenfolge deshalb hart fest.
   2. NUR VERFEINERN, NIE HINZUERFINDEN. UEBUNG_TEILE darf zu einer Uebung nur
      Muskeln nennen, die UEBUNG_MUSKELN fuer sie ohnehin fuehrt (primaer oder
      sekundaer). Sonst gaebe es zwei Wahrheiten darueber, was eine Uebung
      trifft — genau der Fehler, den v195 beseitigt hat.
   3. KEINE ZWEITE MUSKEL-LISTE. Die 19 Muskeln bleiben 19: Ein Teilbereich hat
      keine eigene Kapazitaet und darf in der Belastungs-Rechnung nicht auftauchen.
   4. SCHWEIGEN IST ERLAUBT. Eine Uebung ohne Eintrag liefert ein leeres Feld,
      keinen Fehler und keine Vermutung (v125-Linie).
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
  grabFn("normName"),
  grabBlock("MUSKEL_TEILE", "{", "}"),
  grabBlock("UEBUNG_TEILE", "{", "}"),
  grabBlock("UEBUNG_MUSKELN", "{", "}"),
  grabBlock("UEBUNGEN_DB", "[", "]"),
  grabFn("muskelTeile"),
  grabFn("muskelTeil"),
  grabFn("muskelTeilNummer"),
  grabFn("uebungTeileFuer"),
  "module.exports = { MUSKEL_TEILE, UEBUNG_TEILE, UEBUNG_MUSKELN, UEBUNGEN_DB," +
  " muskelTeile, muskelTeil, muskelTeilNummer, uebungTeileFuer };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* Die Muskel-Reihenfolge aus der Karten-Definition — sie ist der Rot-Kanal. */
const ORDER = JSON.parse("[" + /order: \[([^\]]*)\]/.exec(src)[1].replace(/"/g, '"') + "]");

/* ---------- 1) Die Tabelle selbst ---------- */
pruefe("neun Muskeln haben Teilbereiche", Object.keys(A.MUSKEL_TEILE).length === 9);
pruefe("es sind 21 Abschnitte",
  Object.keys(A.MUSKEL_TEILE).reduce((s, k) => s + A.MUSKEL_TEILE[k].length, 0) === 21);
Object.keys(A.MUSKEL_TEILE).forEach(k => {
  pruefe(k + " ist ein Muskel der Karte", ORDER.indexOf(k) >= 0);
  const teile = A.MUSKEL_TEILE[k];
  pruefe(k + " hat mindestens zwei Abschnitte", teile.length >= 2);
  pruefe(k + ": jeder Abschnitt hat Id, Name und lateinischen Namen",
    teile.every(t => t.id && t.name && t.latin));
  pruefe(k + ": die Ids sind eindeutig",
    new Set(teile.map(t => t.id)).size === teile.length);
});

/* Die Reihenfolge IST die Nummer im Gruen-Kanal — hart festgehalten, weil sie
   sonst still gegen die erzeugten Index-Karten verrutschen kann. */
const ERWARTET = {
  pectoral:  ["upper","mid","lower"],
  abs:       ["upper","lower"],
  quadriceps:["outer","mid","inner"],
  biceps:    ["outer","inner"],
  trapezius: ["upper","mid","lower"],
  latissimus:["upper","lower"],
  triceps:   ["outer","inner"],
  hamstrings:["outer","inner"],
  calves:    ["gastro","soleus"]
};
Object.keys(ERWARTET).forEach(k => {
  pruefe(k + ": Reihenfolge unveraendert (sonst faerbt der falsche Abschnitt)",
    JSON.stringify(A.MUSKEL_TEILE[k].map(t => t.id)) === JSON.stringify(ERWARTET[k]));
});

/* ---------- 2) Die Zugriffs-Funktionen ---------- */
pruefe("ein Muskel ohne Abschnitte liefert ein leeres Feld", A.muskelTeile("glutes").length === 0);
pruefe("ein unbekannter Muskel auch", A.muskelTeile("gibtsnicht").length === 0);
pruefe("die Brust hat drei", A.muskelTeile("pectoral").length === 3);
pruefe("die Liste ist eine Kopie (aussen aendern faerbt nichts um)",
  (() => { const l = A.muskelTeile("pectoral"); l.pop(); return A.muskelTeile("pectoral").length === 3; })());
pruefe("muskelTeil findet den Abschnitt", A.muskelTeil("pectoral", "upper").name === "Oberer Brustbereich");
pruefe("und liefert null bei Unsinn",
  A.muskelTeil("pectoral", "gibtsnicht") === null && A.muskelTeil("glutes", "upper") === null);
pruefe("die Nummer ist 1-basiert (Gruen-Kanal)",
  A.muskelTeilNummer("pectoral", "upper") === 1 && A.muskelTeilNummer("pectoral", "lower") === 3);
pruefe("unbekannt ist 0 — und 0 heisst im Bild kein Abschnitt",
  A.muskelTeilNummer("pectoral", "gibtsnicht") === 0 && A.muskelTeilNummer("glutes", "upper") === 0);

/* ---------- 3) UEBUNG_TEILE verfeinert nur, es erfindet nicht ---------- */
const dbNamen = new Set(A.UEBUNGEN_DB.map(u => u.name));
/* Ein doppelter Schluessel im Objekt-Literal faellt still unter den Tisch (der
   letzte gewinnt) — beim Bau von v208 ist genau das zweimal passiert. */
{
  const roh = /const UEBUNG_TEILE = \{[\s\S]*?\n\};/.exec(src)[0];
  const namen = (roh.match(/^  "[^"]*"/gm) || []).map(s => s.trim());
  pruefe("kein Uebungsname steht zweimal in UEBUNG_TEILE",
    new Set(namen).size === namen.length && namen.length === Object.keys(A.UEBUNG_TEILE).length);
}
function muskelnDerUebung(name){
  const e = A.UEBUNG_MUSKELN[name];
  if(!e) return null;
  return Array.isArray(e) ? e.slice() : (e.p || []).concat(e.s || []);
}
Object.keys(A.UEBUNG_TEILE).forEach(name => {
  pruefe("die Uebung gibt es wirklich: " + name, dbNamen.has(name));
  const gefuehrt = muskelnDerUebung(name);
  pruefe("sie hat eine Muskel-Zuordnung: " + name, gefuehrt !== null);
  Object.keys(A.UEBUNG_TEILE[name]).forEach(m => {
    // Zusage 2: kein Muskel, den UEBUNG_MUSKELN nicht ohnehin fuehrt.
    pruefe(name + " nennt nur gefuehrte Muskeln (" + m + ")",
      gefuehrt !== null && gefuehrt.indexOf(m) >= 0);
    pruefe(name + ": " + m + " hat ueberhaupt Abschnitte", A.muskelTeile(m).length > 0);
    A.UEBUNG_TEILE[name][m].forEach(id =>
      pruefe(name + ": " + m + "/" + id + " gibt es", A.muskelTeil(m, id) !== null));
  });
});
/* Jeder Abschnitt sollte mindestens EINE Uebung haben — sonst stuende er in der
   App als leeres Versprechen da. */
Object.keys(A.MUSKEL_TEILE).forEach(m => {
  A.MUSKEL_TEILE[m].forEach(t => {
    const treffer = Object.keys(A.UEBUNG_TEILE)
      .filter(n => (A.UEBUNG_TEILE[n][m] || []).indexOf(t.id) >= 0);
    pruefe("mindestens eine Uebung fuer " + m + "/" + t.id, treffer.length > 0);
  });
});

/* ---------- 4) uebungTeileFuer ---------- */
pruefe("Schraegbank hebt den oberen Brustbereich",
  JSON.stringify(A.uebungTeileFuer("Schrägbankdrücken KH", "pectoral")) === '["upper"]');
pruefe("Dips den unteren",
  JSON.stringify(A.uebungTeileFuer("Dips am Barren", "pectoral")) === '["lower"]');
pruefe("dieselben Dips treffen am Trizeps beide Koepfe",
  A.uebungTeileFuer("Dips am Barren", "triceps").length === 2);
pruefe("der Beinstrecker arbeitet ueber den mittleren Kopf",
  JSON.stringify(A.uebungTeileFuer("Beinstrecker", "quadriceps")) === '["mid"]');
pruefe("sitzendes Wadenheben trifft den Schollenmuskel",
  JSON.stringify(A.uebungTeileFuer("Sitzendes Wadenheben", "calves")) === '["soleus"]');
/* Zusage 4: Schweigen ist erlaubt. */
pruefe("eine Uebung ohne Eintrag liefert leer", A.uebungTeileFuer("Superman", "abs").length === 0);
pruefe("ein unbekannter Name auch", A.uebungTeileFuer("Gibt es nicht", "pectoral").length === 0);
pruefe("ein Muskel, den die Uebung nicht verfeinert, auch",
  A.uebungTeileFuer("Beinstrecker", "pectoral").length === 0);
pruefe("ohne Argumente wird nichts geraten",
  A.uebungTeileFuer(null, "pectoral").length === 0 && A.uebungTeileFuer("Kniebeugen", null).length === 0);
/* Der Name wird wie ueberall auch normalisiert gefunden. */
pruefe("Gross- und Kleinschreibung ist egal",
  JSON.stringify(A.uebungTeileFuer("beinstrecker", "quadriceps")) === '["mid"]');

/* ---------- 5) Die 19 Muskeln bleiben 19 ---------- */
pruefe("die Karte fuehrt weiterhin 19 Muskeln", ORDER.length === 19);
/* Zusage 3: Die Belastungs-Rechnung darf von Teilbereichen nichts wissen. */
["muskelLast", "satzGewichtung", "rechnungsGrundlage", "muskelAuslastung"].forEach(fn => {
  pruefe(fn + " rechnet ohne Teilbereiche", !/TEILE|teilId|muskelTeil/.test(grabFn(fn)));
});
pruefe("kein Teilbereich taucht in MUSKEL_ORDER auf",
  !ORDER.some(m => /:/.test(m)));

/* ---------- 6) Verdrahtung ---------- */
pruefe("die Teil-Tabelle haengt an der Karten-Definition",
  src.includes("MUSKELKARTEN.standard.teile = MUSKEL_TEILE;"));
pruefe("der Gruen-Kanal wird beim Laden ausgelesen",
  /const t = data\[i\*4 \+ 1\];/.test(grabFn("muskelKarteLaden")));
pruefe("und als eigene Pixel-Liste abgelegt",
  grabFn("muskelKarteLaden").includes("teilPixel"));
pruefe("ein Abschnitt laesst sich einzeln faerben",
  grabFn("muskelMalen").includes("muskelTeilAufCanvas"));
pruefe("der ganze Muskel bleibt dabei als blasses Umfeld stehen",
  /malen\(d\.pixel\[MUSKEL_ORDER\.indexOf\(key\) \+ 1\], 55\)/.test(grabFn("muskelTeilAufCanvas")));
pruefe("ein Muskelwechsel raeumt den Abschnitt weg",
  grabFn("muskelTippen").includes("muskelStatus.teil = null"));
pruefe("die Abschnitte stehen unter den Uebungen, nicht darueber",
  grabFn("muskelAuswahlZeichnen").includes("zeilen + hinweis + muskelTeileHtml(key)"));
pruefe("das Werkzeug, das die Index-Karten baut, ist genannt",
  /tools.Muskelkarte-Bauen\.ps1/.test(src));

/* ---------- 7) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v208",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 208);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.208", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
