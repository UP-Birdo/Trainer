/* v82-Test: Fehlerfaenger — Dedupe, Issue-URL, niemals selbst werfen. */
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
function grabLine(marker){
  const i = src.indexOf(marker);
  if(i < 0) throw new Error("Zeile nicht gefunden: " + marker);
  return src.slice(i, src.indexOf("\n", i));
}

const code = [
  "const GITHUB_REPO = '';",
  "const ANZEIGE_VERSION = '0.082';",
  "const location = { hostname:'deinname.github.io', pathname:'/training/', href:'' };",
  "let dialoge = []; function frage(t, mit, cb){ dialoge.push(t); cb(true); }",   // immer Ja -> URL wird gebaut
  "let meldungen = []; function meldung(t){ meldungen.push(t); }",
  "function stufe(){ return 3; }",
  "function systemName(){ return 'iPhone'; }",
  "function setTimeout(fn){ fn(); }",                                             // sofort ausfuehren
  "let geoeffnet = null;",
  "const window = { open: u => { geoeffnet = u; return {}; }, addEventListener: () => {} };",
  "const document = { querySelector: () => ({ id:'view-plaene' }) };",
  grabLine("const fehlerSchonGezeigt"),
  grabFn("githubRepoPfad"),
  grabFn("githubIssueUrl"),
  grabFn("fehlerBehandeln"),
  "module.exports = { fehlerBehandeln, get dialoge(){ return dialoge; }, get geoeffnet(){ return geoeffnet; } };"
].join("\n");

const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const T = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bedingung){
  if(bedingung){ ok++; }
  else { fehler++; console.error("FEHLT: " + name); }
}

/* 1) Fehler -> Dialog + Issue-URL mit Stack und Kontext */
T.fehlerBehandeln("x is not a function", "TypeError: x is not a function\n  at kaputt (index.html:42)");
pruefe("Dialog gezeigt", T.dialoge.length === 1 && T.dialoge[0].includes("x is not a function"));
pruefe("Issue-URL gebaut", T.geoeffnet && T.geoeffnet.startsWith("https://github.com/deinname/training/issues/new?"));
const dekodiert = decodeURIComponent(T.geoeffnet);
pruefe("Stacktrace im Body", dekodiert.includes("at kaputt (index.html:42)"));
pruefe("Kontext im Body", dekodiert.includes("Trainer 0.082 · Stufe 3 · iPhone") && dekodiert.includes("view-plaene"));
pruefe("Label bug", T.geoeffnet.includes("labels=bug"));
pruefe("Titel mit Praefix", T.geoeffnet.includes("title=" + encodeURIComponent("[Fehler] x is not a function")));

/* 2) Derselbe Fehler nur EINMAL pro Sitzung */
T.fehlerBehandeln("x is not a function", "egal");
pruefe("Dedupe: kein zweiter Dialog", T.dialoge.length === 1);

/* 3) Anderer Fehler -> neuer Dialog; fehlender Stack faellt nicht um */
T.fehlerBehandeln("anderes Problem", null);
pruefe("Neuer Fehler -> neuer Dialog", T.dialoge.length === 2);
pruefe("Ohne Stack: Platzhalter", decodeURIComponent(T.geoeffnet).includes("kein Stacktrace"));

/* 4) Kaputte Eingaben werfen NIE */
let geworfen = false;
try { T.fehlerBehandeln(undefined, undefined); T.fehlerBehandeln({ seltsam: true }, 42); }
catch(e){ geworfen = true; }
pruefe("Fehlerfaenger wirft selbst nie", !geworfen);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
