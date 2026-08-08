/* 0.235.0-Test: Beschwerden faerben die Karte direkt — die Fruehwarn-Luecke.

   Nutzer-Frage: „Sind die Antwortmoeglichkeiten an die Muskel-Map angebunden,
   um frueh zu warnen?" Beim Nachpruefen kam die Luecke heraus: Die Farbe haengt
   an der Quote (Last / Kapazitaet) — ein Muskel OHNE Last blieb GRUEN, selbst
   mit gemeldeten Schmerzen, und „stark" erreichte die fette Warnung (1,3) nie.

   Die Zusage: Eine gemeldete Beschwerde gibt der Quote einen BODEN —
   Schmerz stark -> 1,3 (tiefrot + Warnung), Schmerz leicht / Kater stark -> 1,0,
   Kater leicht -> 0,7. Der Boden gilt auch auf jungen Konten: Er ist kein
   Urteil der App, sondern eine Aussage des Nutzers.
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
function grabZeile(name){
  const m = new RegExp("const " + name + "\\s*=").exec(src);
  if(!m) throw new Error("Konstante nicht gefunden: " + name);
  return src.slice(m.index, src.indexOf("\n", m.index));
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("tagDifferenz"), grabZeile("BESCHWERDE_TAGE"),
  grabFn("beschwerdeStand"), grabFn("beschwerdeQuoteFloor"),
  "module.exports = { beschwerdeQuoteFloor };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const HEUTE = "2026-08-10";
const b = (art, wert) => [{ datum: HEUTE, muskel:"deltoid", art, wert }];

/* ---------- 1) Der Boden ---------- */
pruefe("ohne Meldung kein Boden", A.beschwerdeQuoteFloor([], "deltoid", HEUTE) === 0);
pruefe("starker Schmerz hebt auf die rote Warnschwelle",
  A.beschwerdeQuoteFloor(b("schmerz", 2), "deltoid", HEUTE) === 1.3);
pruefe("leichter Schmerz auf den Richtwert",
  A.beschwerdeQuoteFloor(b("schmerz", 1), "deltoid", HEUTE) === 1.0);
pruefe("starker Kater ebenso",
  A.beschwerdeQuoteFloor(b("kater", 2), "deltoid", HEUTE) === 1.0);
pruefe("leichter Kater deutlich Richtung benutzt",
  A.beschwerdeQuoteFloor(b("kater", 1), "deltoid", HEUTE) === 0.7);
pruefe("Schmerz schlaegt Kater",
  A.beschwerdeQuoteFloor(b("schmerz", 2).concat(b("kater", 1)), "deltoid", HEUTE) === 1.3);
pruefe("fremde Muskeln bekommen keinen Boden",
  A.beschwerdeQuoteFloor(b("schmerz", 2), "abs", HEUTE) === 0);
/* Er klingt mit der Meldung aus (BESCHWERDE_TAGE, 0.228). */
pruefe("eine alte Meldung traegt keinen Boden mehr",
  A.beschwerdeQuoteFloor([{ datum:"2026-08-01", muskel:"deltoid", art:"schmerz", wert:2 }], "deltoid", HEUTE) === 0);

/* ---------- 2) Verdrahtung ---------- */
const ausl = grabFn("muskelAuslastung");
pruefe("die Quote bekommt den Boden in der Auslastung",
  ausl.includes("beschwerdeQuoteFloor(beschwerden, m, heute)") && ausl.includes("Math.max("));
const quoten = grabFn("auslastungsQuoten");
pruefe("der Boden uebersteht den Basis-Deckel junger Konten",
  quoten.indexOf("Math.min(a[m].quote, deckel)") < quoten.indexOf("beschwerdeQuoteFloor(") &&
  quoten.includes("if(boden > q[m]) q[m] = boden"));
/* Damit erreicht „stark" die fette Warnung: dieselbe 1,3 wie lastWarnungText. */
pruefe("die Warnschwelle ist dieselbe 1,3",
  grabFn("lastWarnungText").includes("1.3") &&
  grabFn("beschwerdeQuoteFloor").includes("return 1.3"));

/* ---------- 3) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("APP_VERSION passt zu VERSION", (() => {
  const [, mi, pa] = /const VERSION = "([\d.]+)";/.exec(src)[1].split(".");
  return Number(/const APP_VERSION = (\d+);/.exec(src)[1]) === Number(mi) * 1000 + Number(pa);
})());
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.235.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
