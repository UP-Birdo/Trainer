/* v81-Test: Feedback -> GitHub-Issue (Repo-Ableitung + URL-Bau). */
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

function bauen(hostname, pathname, repoOverride){
  const code = [
    "const GITHUB_REPO = " + JSON.stringify(repoOverride || "") + ";",
    "const ANZEIGE_VERSION = '0.081';",
    "const location = { hostname:" + JSON.stringify(hostname) + ", pathname:" + JSON.stringify(pathname) + ", href:'' };",
    "let meldungen = []; function meldung(t){ meldungen.push(t); }",
    "let toasts = []; function zeigenToast(t){ toasts.push(t); }",
    "function stufe(){ return 5; }",
    "function systemName(){ return 'iPhone'; }",
    "let geoeffnet = null;",
    "const window = { open: (u) => { geoeffnet = u; return {}; } };",
    "const felder = { 'feedback-art': { value:'bug' }, 'feedback-text': { value:'Timer bleibt stehen\\nnach Pause' } };",
    "const document = { getElementById: id => felder[id] };",
    grabFn("githubRepoPfad"),
    grabFn("githubIssueUrl"),
    grabFn("feedbackSenden"),
    "module.exports = { githubRepoPfad, feedbackSenden, get geoeffnet(){ return geoeffnet; }," +
    " get meldungen(){ return meldungen; }, felder };"
  ].join("\n");
  const modul = { exports: {} };
  new Function("module", "exports", code)(modul, modul.exports);
  return modul.exports;
}

let ok = 0, fehler = 0;
function pruefe(name, bedingung){
  if(bedingung){ ok++; }
  else { fehler++; console.error("FEHLT: " + name); }
}

/* 1) Repo-Ableitung aus der Pages-Adresse */
const a = bauen("deinname.github.io", "/training/");
pruefe("Ableitung benutzer/repo", a.githubRepoPfad() === "deinname/training");

/* 2) Fremde Domain ohne Override -> null + Meldung statt kaputter URL */
const b = bauen("localhost", "/");
pruefe("Keine Ableitung lokal", b.githubRepoPfad() === null);
b.feedbackSenden();
pruefe("Lokal: Meldung statt URL", b.geoeffnet === null && b.meldungen.length === 1);

/* 3) Override gewinnt */
const c = bauen("localhost", "/", "jkb/training");
pruefe("Override greift", c.githubRepoPfad() === "jkb/training");

/* 4) URL-Bau: Titel, Body mit Kontext, Label */
a.feedbackSenden();
pruefe("Issue-URL geht ans Repo", a.geoeffnet && a.geoeffnet.startsWith("https://github.com/deinname/training/issues/new?"));
pruefe("Titel mit Art-Präfix + erster Zeile", a.geoeffnet.includes("title=" + encodeURIComponent("[Bug] Timer bleibt stehen")));
pruefe("Body mit Kontextzeile", decodeURIComponent(a.geoeffnet).includes("Trainer 0.081 · Stufe 5 · iPhone"));
pruefe("Label = Art", a.geoeffnet.includes("labels=bug"));

/* 5) Leere Beschreibung -> Meldung, nichts geöffnet */
const d = bauen("deinname.github.io", "/training/");
d.felder["feedback-text"].value = "   ";
d.feedbackSenden();
pruefe("Leer: Meldung statt URL", d.geoeffnet === null && d.meldungen.length === 1);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
