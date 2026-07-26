/* v83-Test: Muskelkarte — Datenintegritaet, Treffer-Logik, Toggle.
   Extrahiert die ECHTEN Daten/Funktionen aus index.html (nie kopieren). */
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
  const i = src.indexOf("const " + name + " =");
  if(i < 0) throw new Error("const nicht gefunden: " + name);
  let s = i; while(src[s] !== "{" && src[s] !== "[") s++;
  const auf = src[s], zu = auf === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = s; k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const code = [
  // v139: Die Karte steht in EINER Definition; die Kurznamen leiten sich daraus
  // ab (in der App wie hier). grabConst auf die abgeleiteten Zeilen ginge daneben,
  // weil dort keine Klammer steht.
  grabConst("MUSKELKARTEN"),
  "const MUSKELKARTE_AKTIV = 'standard';",
  grabFn("muskelKarteDef"),
  "const MUSKEL_ORDER = muskelKarteDef().order;",
  "const MUSKEL_VIEWS = muskelKarteDef().views;",
  grabConst("MUSKEL_INFO"),
  "let muskelStatus = { ansicht:'front', gewaehlt:[] };",
  "let muskelDaten = {};",
  "function muskelMalen(){}",
  "function muskelAuswahlZeichnen(){}",
  "function muskelStatusText(){}",
  grabFn("muskelTreffer"),
  grabFn("muskelTippen"),
  "module.exports = { MUSKEL_ORDER, MUSKEL_INFO, MUSKEL_VIEWS, muskelTreffer, muskelTippen," +
  " get status(){ return muskelStatus; }, setDaten(d){ muskelDaten = d; } };"
].join("\n");

const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Datenintegritaet */
pruefe("19 Muskeln", T.MUSKEL_ORDER.length === 19);
pruefe("Alle Order-Keys in INFO", T.MUSKEL_ORDER.every(k => T.MUSKEL_INFO[k]));
pruefe("Jeder Muskel Name/Latein/Region", T.MUSKEL_ORDER.every(k => { const m = T.MUSKEL_INFO[k]; return m.name && m.latin && m.region; }));
pruefe("Jeder Muskel >=1 Uebung", T.MUSKEL_ORDER.every(k => Array.isArray(T.MUSKEL_INFO[k].ex) && T.MUSKEL_INFO[k].ex.length >= 1));
pruefe("Keine INFO-Leiche", Object.keys(T.MUSKEL_INFO).every(k => T.MUSKEL_ORDER.indexOf(k) >= 0));
pruefe("Ansichten front+back", T.MUSKEL_VIEWS.front && T.MUSKEL_VIEWS.back && T.MUSKEL_VIEWS.front.w === 591 && T.MUSKEL_VIEWS.back.w === 468);

/* 2) Treffer-Logik: kuenstliche Index-Karte, ein Pixel = deltoid */
const meta = T.MUSKEL_VIEWS.front;
const hit = new Uint8Array(meta.w * meta.h);
const gidDeltoid = T.MUSKEL_ORDER.indexOf("deltoid") + 1;
const px = 100, py = 200;
hit[py * meta.w + px] = gidDeltoid;
T.setDaten({ front: { hit, pixel:{} } });
T.status.ansicht = "front";
/* v122: Die Ansicht kommt jetzt vom getippten Figur-Block (data-ansicht), damit
   „Beide" zwei Figuren nebeneinander stellen kann — das Ereignis muss deshalb
   ein `closest` mitbringen (im Browser die .muskel-figur um die Tipp-Flaeche). */
const zielFlaeche = (ansicht) => ({
  getBoundingClientRect: () => ({ left:0, top:0, width:meta.w, height:meta.h }),
  closest: () => ({ dataset: { ansicht } })
});
const treff = { currentTarget: zielFlaeche("front"), clientX: px + 0.5, clientY: py + 0.5 };
pruefe("Treffer auf Deltoid", T.muskelTreffer(treff) === "deltoid");
const leer = { currentTarget: zielFlaeche("front"), clientX: 5.5, clientY: 5.5 };
pruefe("Leere Flaeche kein Treffer", T.muskelTreffer(leer) === null);
/* Derselbe Tipp auf die HINTERE Figur darf nicht in der vorderen Karte suchen. */
const hinten = { currentTarget: zielFlaeche("back"), clientX: px + 0.5, clientY: py + 0.5 };
pruefe("Tipp auf die andere Figur nutzt deren Karte", T.muskelTreffer(hinten) === null);

/* 3) Toggle: an, dann aus */
T.status.gewaehlt = [];
T.muskelTippen(treff);
pruefe("Tippen waehlt Deltoid", T.status.gewaehlt.length === 1 && T.status.gewaehlt[0] === "deltoid");
T.muskelTippen(treff);
pruefe("Nochmal Tippen hebt auf", T.status.gewaehlt.length === 0);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
