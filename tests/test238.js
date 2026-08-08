/* 0.238.0-Test: Vorher-Nachher-Vorschau (62. Runde C, Teil 2).

   Die Zusagen:
   1. DIESELBE KETTE: Der Plan wird als fiktiver Eintrag mit Note 3 durch
      muskelAuslastung + quotenDeckeln geschickt — keine zweite Rechnung.
   2. EHRLICHE WARNUNG: Gewarnt wird nur, was DIESES Training ueber die
      1,3-Schwelle schoebe (nachher > vorher) — im Konjunktiv.
   3. STUFEN-REGEL: ab Stufe 4 (wie die Muskelkarte), sonst versteckt.
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
  grabFn("planAlsEintrag"),
  "const MUSKEL_INFO = { quadriceps:{ name:'Oberschenkel (vorn)' }, pectoral:{ name:'Brust' }," +
  " glutes:{ name:'Gesaess' }, latissimus:{ name:'Latissimus' } };",
  grabFn("nachherWarnungText"),
  "module.exports = { planAlsEintrag, nachherWarnungText };"
].join("\n"))(modul, modul.exports);
const N = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Der Plan als fiktiver Eintrag ---------- */
{
  const plan = { typ:"kraft", uebungen:[
    { name:"Kniebeugen", saetze:3, wdh:10, gewicht:60 },
    { name:"Plank", saetze:2, wdh:0, gewicht:0 }
  ]};
  const e = N.planAlsEintrag(plan, "2026-08-08");
  pruefe("jede Uebung kommt mit ihren geplanten Saetzen", e.saetze.length === 5);
  pruefe("Note 3 als Annahme, an jedem Satz", e.saetze.every(s => s.note === 3));
  pruefe("der Eintrag traegt das heutige Datum", e.datum === "2026-08-08");
  pruefe("Name und Werte kommen aus dem Plan",
    e.saetze[0].name === "Kniebeugen" && e.saetze[0].gewicht === 60 && e.saetze[0].wdh === 10);
}
pruefe("ein Aktivitaets-Plan ergibt nichts (laeuft nicht durch die Vorschau)",
  N.planAlsEintrag({ typ:"aktivitaet", sportart:"laufen", uebungen:[] }, "2026-08-08") === null);
pruefe("ein leerer Plan ergibt nichts",
  N.planAlsEintrag({ typ:"kraft", uebungen:[] }, "2026-08-08") === null);
pruefe("ohne Satz-Zahl zaehlt EIN Satz (Unendlichkeitsmodus vor dem ersten Mal)",
  N.planAlsEintrag({ typ:"kraft", uebungen:[{ name:"Kniebeugen" }] }, "2026-08-08").saetze.length === 1);

/* ---------- 2) Die Warnung ---------- */
pruefe("warnt, was DIESES Training ueber die Schwelle schoebe",
  N.nachherWarnungText({ quadriceps:1.4 }, { quadriceps:0.8 }).includes("Oberschenkel (vorn)") &&
  N.nachherWarnungText({ quadriceps:1.4 }, { quadriceps:0.8 }).includes("wäre danach"));
pruefe("schweigt unter der Schwelle", N.nachherWarnungText({ quadriceps:1.2 }, { quadriceps:0.8 }) === "");
pruefe("schweigt, wenn der Muskel schon heute rot ist und nichts dazukommt",
  N.nachherWarnungText({ quadriceps:1.4 }, { quadriceps:1.4 }) === "");
pruefe("mehrere Muskeln stehen im Plural",
  N.nachherWarnungText({ quadriceps:1.4, pectoral:1.5 }, {}).includes("wären danach"));
pruefe("leer bei leeren Quoten", N.nachherWarnungText(null, null) === "");

/* ---------- 3) Verdrahtung ---------- */
pruefe("nachherQuoten schickt den Plan durch dieselbe Kette",
  grabFn("nachherQuoten").includes("planAlsEintrag(plan") &&
  grabFn("nachherQuoten").includes("muskelAuslastung(") &&
  grabFn("nachherQuoten").includes("quotenDeckeln(a)"));
pruefe("auslastungsQuoten nutzt denselben Deckel-Baustein",
  grabFn("auslastungsQuoten").includes("quotenDeckeln(a)"));
pruefe("der Basis-Deckel misst sich am ECHTEN Protokoll",
  grabFn("quotenDeckeln").includes("basisReicht(sitzung.daten.protokoll)"));
pruefe("die Vorschau zeichnet den Nachher-Stand",
  grabFn("vorschauZeichnen").includes("vorschauNachherZeichnen(p)"));
{
  const vz = grabFn("vorschauNachherZeichnen");
  pruefe("Stufen-Regel: dieselbe Stufe wie die Muskelkarte",
    vz.includes('viewErlaubt("view-muskeln")'));
  pruefe("ohne Quoten bleibt die Karte versteckt", vz.includes("el.hidden = true"));
  pruefe("dieselbe Mal-Funktion und Legende wie ueberall",
    vz.includes("miniLastFigur(") && vz.includes("lastLegendeHtml()"));
  pruefe("die Warnung vergleicht mit dem Ist-Stand",
    vz.includes("nachherWarnungText(nachher, auslastungsQuoten())"));
  pruefe("ein Tipp oeffnet die Muskelkarte", vz.includes('onclick="muskelnOeffnen()"'));
}
pruefe("der Behaelter steht in der Vorschau-Ansicht",
  src.includes('id="vorschau-nachher"'));

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf 0.238.0",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 238000);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.238.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
