/* v165-Test: Aufwaermen und Dehnen folgen dem Schwerpunkt des Trainings.

   Bis v164 lief immer dieselbe feste Sechser-Folge. Jetzt traegt jeder
   Katalog-Eintrag die Muskeln, fuer die er etwas bringt, und `bonusAuswahl`
   waehlt gegen die Muskeln des Plans. Geprueft wird die Auswahl selbst (rein,
   also mit echten Katalogen UND mit Mini-Katalogen) und der Vertrag der
   Kataloge: gueltige Muskel-Schluessel, jede Region abgedeckt, ein Rueckfall
   fuer Plaene ohne erkannte Muskeln.
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
function grabLiteral(name, klammer){
  const auf = klammer || "[", zu = auf === "[" ? "]" : "}";
  const i = src.indexOf("const " + name + " = ");
  if(i < 0) throw new Error("Literal nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf(auf, i); k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}
function grabConst(name){
  const zeile = new RegExp("^const " + name + "\\s*=\\s*[^;]+;", "m").exec(src);
  if(!zeile) throw new Error("Konstante nicht gefunden: " + name);
  return zeile[0];
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabLiteral("MUSKEL_INFO", "{"),
  grabLiteral("AUFWAERMEN"),
  grabLiteral("DEHNEN"),
  grabConst("BONUS_ANZAHL"),
  grabFn("bonusRegionen"),
  grabFn("bonusAuswahl"),
  grabFn("bonusSchritte"),
  "module.exports = { MUSKEL_INFO, AUFWAERMEN, DEHNEN, BONUS_ANZAHL, bonusRegionen, bonusAuswahl, bonusSchritte };"
].join("\n"))(modul, modul.exports);
const { MUSKEL_INFO, AUFWAERMEN, DEHNEN, BONUS_ANZAHL,
        bonusRegionen, bonusAuswahl, bonusSchritte } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const namen = liste => liste.map(b => b.name);
const KATALOGE = [["Aufwaermen", AUFWAERMEN], ["Dehnen", DEHNEN]];

/* ---------- 1) Die Kataloge sind gewachsen und sauber ---------- */
pruefe("der Aufwaerm-Katalog ist deutlich groesser als die alte Sechser-Folge",
  AUFWAERMEN.length >= 12);
pruefe("der Dehn-Katalog ebenso", DEHNEN.length >= 12);
KATALOGE.forEach(([was, katalog]) => {
  pruefe(was + ": jeder Eintrag hat Namen und Dauer",
    katalog.every(b => typeof b.name === "string" && b.name && b.dauer > 0));
  pruefe(was + ": keine doppelten Namen",
    new Set(namen(katalog)).size === katalog.length);
  pruefe(was + ": jeder Eintrag ist entweder allgemein oder hat Muskeln",
    katalog.every(b => b.allgemein || (Array.isArray(b.muskeln) && b.muskeln.length > 0)));
  pruefe(was + ": alle Muskel-Schluessel sind echt",
    katalog.every(b => (b.muskeln || []).every(m => !!MUSKEL_INFO[m])));
  pruefe(was + ": es gibt einen Rueckfall aus mindestens sechs Eintraegen",
    katalog.filter(b => b.standard).length >= BONUS_ANZAHL);
});
pruefe("Aufwaermen hat allgemeine Eintraege (Kreislauf)",
  AUFWAERMEN.filter(b => b.allgemein).length >= 1);

/* ---------- 2) Jede Region kommt in beiden Katalogen vor ---------- */
const alleRegionen = [...new Set(Object.keys(MUSKEL_INFO).map(m => MUSKEL_INFO[m].region))];
KATALOGE.forEach(([was, katalog]) => {
  const abgedeckt = new Set();
  katalog.forEach(b => (b.muskeln || []).forEach(m => abgedeckt.add(MUSKEL_INFO[m].region)));
  alleRegionen.forEach(r =>
    pruefe(was + ": Region " + r + " ist abgedeckt", abgedeckt.has(r)));
});

/* ---------- 3) Regionen-Text ---------- */
pruefe("aus Muskeln werden Regionen", bonusRegionen(["pectoral", "deltoid"]) === "Brust · Schultern");
pruefe("doppelte Regionen stehen nur einmal da", bonusRegionen(["quadriceps", "hamstrings"]) === "Beine");
pruefe("ohne Muskeln bleibt der Text leer",
  bonusRegionen([]) === "" && bonusRegionen(null) === "" && bonusRegionen(undefined) === "");
pruefe("unbekannte Schluessel werden uebergangen", bonusRegionen(["gibtsnicht", "abs"]) === "Bauch");

/* ---------- 4) Die Auswahl mit einem Mini-Katalog (nachvollziehbar) ---------- */
const MINI = [
  { name:"Allgemein",  dauer:60, allgemein:true, standard:true },
  { name:"Brust",      dauer:30, standard:true, muskeln:["pectoral"] },
  { name:"BrustArm",   dauer:30, muskeln:["pectoral","triceps"] },
  { name:"Bein",       dauer:30, standard:true, muskeln:["quadriceps"] },
  { name:"BeinGesaess",dauer:30, muskeln:["quadriceps","glutes"] }
];
const nurBrust = bonusAuswahl(MINI, ["pectoral"], 5);
pruefe("das Allgemeine steht vorn", nurBrust[0].name === "Allgemein");
pruefe("nur die passenden kommen mit",
  namen(nurBrust).join(",") === "Allgemein,Brust,BrustArm");
pruefe("Beine bleiben bei einem Brust-Plan draussen",
  !namen(nurBrust).some(n => n.indexOf("Bein") === 0));

const zweiTreffer = bonusAuswahl(MINI, ["quadriceps", "glutes"], 5);
pruefe("mehr Treffer stehen vor weniger Treffern",
  namen(zweiTreffer).join(",") === "Allgemein,BeinGesaess,Bein");

pruefe("die Anzahl wird eingehalten", bonusAuswahl(MINI, ["pectoral", "quadriceps"], 3).length === 3);
pruefe("ohne Angabe ist BONUS_ANZAHL die Obergrenze",
  bonusAuswahl(AUFWAERMEN, ["pectoral"]).length <= BONUS_ANZAHL);
// Ein schmaler Plan bekommt BEWUSST weniger: mit Bein-Uebungen aufzufuellen
// waere genau das Rauschen, das v165 abschafft.
pruefe("ein reiner Brust-Plan bekommt nur, was passt",
  bonusAuswahl(AUFWAERMEN, ["pectoral"]).length < BONUS_ANZAHL);
pruefe("ein Ganzkoerper-Plan schoepft die Obergrenze aus",
  bonusAuswahl(AUFWAERMEN, ["pectoral","deltoid","latissimus","quadriceps","glutes","abs"]).length
    === BONUS_ANZAHL);

/* ---------- 5) Rueckfall ohne erkannte Muskeln ---------- */
[[], null, undefined, ["gibtsnichtmuskel"]].forEach((eingabe, i) => {
  const r = bonusAuswahl(MINI, eingabe, 5);
  pruefe("Rueckfall " + i + ": die Grundfolge, nicht nichts",
    namen(r).join(",") === "Allgemein,Brust,Bein");
});
pruefe("der echte Aufwaerm-Rueckfall ist die alte Grundfolge",
  namen(bonusAuswahl(AUFWAERMEN, [])).length === BONUS_ANZAHL &&
  namen(bonusAuswahl(AUFWAERMEN, [])).every(n =>
    AUFWAERMEN.find(b => b.name === n).standard === true));

/* ---------- 6) Die Auswahl ist rein und wiederholbar ---------- */
const vorher = JSON.stringify(AUFWAERMEN);
const a1 = bonusAuswahl(AUFWAERMEN, ["pectoral", "deltoid", "triceps"]);
const a2 = bonusAuswahl(AUFWAERMEN, ["pectoral", "deltoid", "triceps"]);
pruefe("zweimal dieselbe Eingabe ergibt denselben Ablauf",
  JSON.stringify(a1) === JSON.stringify(a2));
pruefe("der Katalog wird dabei nicht veraendert", JSON.stringify(AUFWAERMEN) === vorher);
pruefe("die Rueckgabe sind Kopien, keine Katalog-Eintraege",
  a1.every(b => !AUFWAERMEN.includes(b)));
pruefe("und traegt kein allgemein/standard mehr mit sich",
  a1.every(b => b.standard === undefined && b.allgemein === undefined));

/* ---------- 7) Oberkoerper bekommt Oberkoerper ---------- */
const oben = bonusAuswahl(AUFWAERMEN, ["pectoral", "deltoid", "triceps", "latissimus"]);
const untenMuskeln = ["quadriceps", "hamstrings", "calves", "adductors", "tibialis"];
pruefe("ein Oberkoerper-Plan waermt keine reinen Bein-Uebungen auf",
  oben.every(gewaehlt => {
    const roh = AUFWAERMEN.find(b => b.name === gewaehlt.name);
    return roh.allgemein || (roh.muskeln || []).some(m => !untenMuskeln.includes(m));
  }));
const untenDehnen = bonusAuswahl(DEHNEN, untenMuskeln);
pruefe("ein Bein-Plan dehnt keine reinen Oberkoerper-Muskeln",
  untenDehnen.every(gewaehlt => {
    const roh = DEHNEN.find(b => b.name === gewaehlt.name);
    return roh.allgemein || (roh.muskeln || []).some(m => untenMuskeln.includes(m));
  }));
pruefe("und jede gewaehlte Uebung sagt, wofuer sie da ist",
  untenDehnen.filter(b => b.fuer).length >= untenDehnen.length - 1);

/* ---------- 8) Aus der Auswahl werden Ablauf-Schritte ---------- */
const schritte = bonusSchritte(bonusAuswahl(DEHNEN, ["pectoral"]), "dehnen");
pruefe("jeder Schritt kennt seinen Typ", schritte.every(s => s.typ === "dehnen"));
pruefe("die Nummerierung stimmt",
  schritte.every((s, i) => s.nummer === i + 1 && s.gesamt === schritte.length));
pruefe("die Dauer wandert in die Sekunden", schritte.every(s => s.sekunden > 0));
pruefe("die Begruendung wandert mit", schritte.some(s => s.fuer));
pruefe("die Ansage nennt Name und Dauer",
  schritte[0].ansage === schritte[0].name + ", " + schritte[0].sekunden + " Sekunden.");

/* ---------- 9) Verdrahtung ---------- */
const ablauf = grabFn("ablaufErzeugen");
pruefe("der Ablauf holt die Muskeln des Plans", ablauf.includes("planMuskelListe(plan)"));
pruefe("Aufwaermen waehlt aus dem Katalog", ablauf.includes("bonusAuswahl(AUFWAERMEN, muskeln)"));
pruefe("Dehnen ebenso", ablauf.includes("bonusAuswahl(DEHNEN, muskeln)"));
pruefe("planMuskelListe fasst beide Seiten zusammen",
  grabFn("planMuskelListe").includes("m.front.concat(m.back)"));
pruefe("im Training steht, wofuer die Uebung da ist",
  src.includes('s.fuer ? "Für: " + s.fuer : ""'));
pruefe("in der Vorschau ebenso", src.includes('(schritt.fuer ? " · " + schritt.fuer : "")'));

/* ---------- 10) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v165",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 165);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.165", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
