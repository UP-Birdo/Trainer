/* v187-Test: Automatische Ruhetage fuer JEDEN vergangenen Tag ohne Training.

   Nutzer-Ansage: „Jeder Tag, an dem kein Training stattfindet, wird einen Tag
   spaeter als Ruhetag eingetragen." Der Befund dahinter: v103 begann seine
   Schleife einen Tag NACH dem letzten Besuch — bei taeglicher Nutzung wurde
   damit nie ein Ruhetag vermerkt (gestern war man da, heute ist nicht vorbei).

   Die zwei Zusagen, die hier festgehalten werden:
   1. Der Besuchstag selbst zaehlt mit, sobald er vorbei ist.
   2. HEUTE wird nie markiert — der Tag laeuft noch.
   Dazu: der Alltagsfall (ein einzelner Ruhetag) bleibt still.
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

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("tageVerschieben"),
  grabFn("autoRuhetage"),
  grabFn("autoRuheMelden"),
  "module.exports = { autoRuhetage, autoRuheMelden, tageVerschieben };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const HEUTE = "2026-07-30";
const tag = n => A.tageVerschieben(HEUTE, n);      // tag(-1) = gestern
const proto = (...tage) => tage.map(d => ({ datum:d }));

/* ---------- 1) Der Kern: der Besuchstag zaehlt mit ---------- */
pruefe("gestern besucht, nicht trainiert -> gestern wird Ruhetag",
  JSON.stringify(A.autoRuhetage(tag(-1), HEUTE, [], [])) === JSON.stringify([tag(-1)]));
pruefe("gestern besucht UND trainiert -> kein Ruhetag",
  A.autoRuhetage(tag(-1), HEUTE, proto(tag(-1)), []).length === 0);
pruefe("drei Tage weg, nichts trainiert -> drei Ruhetage",
  JSON.stringify(A.autoRuhetage(tag(-3), HEUTE, [], [])) ===
  JSON.stringify([tag(-3), tag(-2), tag(-1)]));
pruefe("die Reihenfolge ist aufsteigend (aeltester zuerst)", (() => {
  const l = A.autoRuhetage(tag(-4), HEUTE, [], []);
  return l.every((d, i) => i === 0 || d > l[i-1]);
})());
pruefe("trainierte Tage fallen einzeln heraus",
  JSON.stringify(A.autoRuhetage(tag(-3), HEUTE, proto(tag(-2)), [])) ===
  JSON.stringify([tag(-3), tag(-1)]));
pruefe("schon vermerkte Ruhetage kommen nicht doppelt",
  JSON.stringify(A.autoRuhetage(tag(-3), HEUTE, [], [tag(-2)])) ===
  JSON.stringify([tag(-3), tag(-1)]));
pruefe("alles schon vermerkt -> nichts neu",
  A.autoRuhetage(tag(-2), HEUTE, [], [tag(-2), tag(-1)]).length === 0);

/* ---------- 2) HEUTE wird NIE markiert ---------- */
pruefe("heute steht nie in der Liste",
  A.autoRuhetage(tag(-5), HEUTE, [], []).indexOf(HEUTE) < 0);
pruefe("heute besucht -> gar nichts zu tun",
  A.autoRuhetage(HEUTE, HEUTE, [], []).length === 0);
pruefe("ein Besuch in der Zukunft ergibt nichts (Uhr verstellt)",
  A.autoRuhetage(tag(1), HEUTE, [], []).length === 0);
pruefe("die letzte Zeile ist immer gestern",
  A.autoRuhetage(tag(-9), HEUTE, [], []).pop() === tag(-1));

/* ---------- 3) Randfaelle ---------- */
pruefe("ohne letzten Besuch passiert nichts (neues Konto)",
  A.autoRuhetage("", HEUTE, [], []).length === 0 &&
  A.autoRuhetage(null, HEUTE, [], []).length === 0);
pruefe("ohne heute passiert nichts", A.autoRuhetage(tag(-2), "", [], []).length === 0);
pruefe("kaputte Protokoll-Eintraege werfen nicht", (() => {
  try {
    return A.autoRuhetage(tag(-2), HEUTE, [null, {}, { datum:tag(-1) }], []).length === 1;
  } catch(e){ return false; }
})());
pruefe("fehlende Listen werfen nicht",
  A.autoRuhetage(tag(-1), HEUTE, null, null).length === 1 &&
  A.autoRuhetage(tag(-1), HEUTE, undefined, undefined).length === 1);
pruefe("die Eingaben werden nicht veraendert (rein)", (() => {
  const p = proto(tag(-2)), r = [tag(-3)];
  const pv = JSON.stringify(p), rv = JSON.stringify(r);
  A.autoRuhetage(tag(-4), HEUTE, p, r);
  return JSON.stringify(p) === pv && JSON.stringify(r) === rv;
})());
pruefe("ein Monatswechsel wird richtig ueberschritten",
  JSON.stringify(A.autoRuhetage("2026-06-29", "2026-07-02", [], [])) ===
  JSON.stringify(["2026-06-29", "2026-06-30", "2026-07-01"]));

/* ---------- 4) Wann wird gemeldet? ---------- */
pruefe("nichts neu -> keine Meldung",
  A.autoRuheMelden([], null, tag(-1)) === false &&
  A.autoRuheMelden(null, null, tag(-1)) === false);
pruefe("EIN Ruhetag ist Alltag und bleibt still",
  A.autoRuheMelden([tag(-1)], null, tag(-1)) === false);
pruefe("zwei Ruhetage werden gemeldet",
  A.autoRuheMelden([tag(-2), tag(-1)], null, tag(-2)) === true);
pruefe("ein einzelner Ruhetag MIT erloschener Flamme wird gemeldet",
  A.autoRuheMelden([tag(-1)], tag(-1), tag(-2)) === true);
pruefe("eine Flamme, die VOR dem letzten Besuch erlosch, meldet nicht erneut",
  A.autoRuheMelden([tag(-1)], tag(-5), tag(-2)) === false);
pruefe("es kommt immer ein echter Wahrheitswert",
  typeof A.autoRuheMelden([tag(-1)], null, tag(-1)) === "boolean" &&
  typeof A.autoRuheMelden([tag(-2), tag(-1)], null, tag(-2)) === "boolean");

/* ---------- 5) Verdrahtung ---------- */
const ein = grabFn("autoRuhetageEintragen");
pruefe("die Eintragung nutzt die reine Funktion", ein.includes("autoRuhetage(vorher, heute,"));
pruefe("und die reine Melde-Entscheidung", ein.includes("autoRuheMelden(neu, erloschen, vorher)"));
pruefe("die alte Schleife ist weg (kein tageVerschieben(vorher, 1) mehr)",
  !ein.includes("tageVerschieben(vorher, 1)"));
pruefe("es laeuft weiter nur einmal je Sitzung", ein.includes("autoRuheGeprueft"));
pruefe("Stufe 1/2 bleibt aussen vor (Leitplanke 8)", ein.includes("stufe() < 3"));
pruefe("der Besuch wird auch ohne Eintrag gemerkt",
  ein.indexOf("d.letzterBesuch = heute;") < ein.indexOf("autoRuhetage(vorher"));
pruefe("gespeichert wird in jedem Fall",
  (ein.match(/speichern\(\);/g) || []).length >= 2);
pruefe("der Kalender wird nur bei echten Neueintraegen neu gezeichnet",
  ein.indexOf("if(!neu.length) return;") < ein.indexOf("kalenderZeichnen();"));
pruefe("die Meldung nennt weiter den Zeitraum und die Flamme",
  ein.includes("Seit deinem letzten Besuch") && ein.includes("Flamme ist am"));
/* v153: Ein Tag mit Training darf kein Ruhetag bleiben — die Invariante sitzt im
   speichern() und ist der Schutz, wenn spaeter nachgetragen wird. */
pruefe("die v153-Invariante ist unangetastet",
  /ruhetageOhneTrainingstage\(/.test(grabFn("speichern")));

/* ---------- 6) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v187",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 187);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.187", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
