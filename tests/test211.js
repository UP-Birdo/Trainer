/* v211-Test: Der Lauf faerbt die Figur mit + das „+"-Menue hat zwei Eintraege.
   (55. Runde, beides Nutzer-Funde aus der Ideen-Box.)

   Der Fehler, den dieser Test festnagelt: `trainierteMuskeln` lief NUR ueber
   `e.saetze` — eine reine Ausdauer-Einheit hat keine, also blieb die Figur nach
   einem Lauf grau. Dabei rechnet `muskelLast` sie seit v197 laengst mit: Die
   Karte warnte vor zu viel Beinarbeit und zeigte die Beine ungefaerbt.

   Die drei Zusagen:
   1. DER LAUF ZAEHLT. Mit derselben Umrechnung wie v197 (10 min = 1 Satz-
      Aequivalent, gedeckelt bei 6) und denselben Bedingungen.
   2. KEINE DOPPELZAEHLUNG. Wo Saetze stehen, zaehlen die Saetze; Soll-Eintraege
      zaehlen nie.
   3. WER FAERBT, MUSS ANTWORTEN. Ist ein Muskel wegen einer Einheit gefaerbt,
      steht die Einheit auch in der Liste darunter.
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
function grabZahl(name){
  const t = new RegExp("^const " + name + " = [^;\\n]*;", "m").exec(src);
  if(!t) throw new Error("Konstante nicht gefunden: " + name);
  return t[0];
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabBlock("MUSKELKARTEN", "{", "}"),
  "const MUSKELKARTE_AKTIV = 'standard';",
  grabFn("muskelKarteDef"),
  "const MUSKEL_ORDER = muskelKarteDef().order;",
  "const MUSKEL_SEITE = muskelKarteDef().seite;",
  grabBlock("MUSKEL_INFO", "{", "}"), grabBlock("KAT_MUSKELN", "{", "}"),
  grabBlock("UEBUNGEN_DB", "[", "]"), grabBlock("UEBUNG_MUSKELN", "{", "}"),
  grabBlock("SPORT_MUSKELN", "{", "}"),
  grabFn("muskelAufKarte"), grabFn("muskelnAufKarte"), grabFn("uebungMuskelSatz"),
  grabFn("muskelSatzAnzeige"), grabFn("normName"), grabFn("uebungMuskeln"),
  grabZahl("AKTIVITAET_MINUTEN_JE_SATZ"), grabZahl("AKTIVITAET_MAX_SAETZE"),
  grabBlock("SPORT_LAST_MUSKELN", "{", "}"),
  grabFn("istSollEintrag"), grabFn("aktivitaetSaetze"), grabFn("alsEinheitZaehlbar"),
  grabFn("tagDifferenz"), grabFn("trainierteMuskeln"),
  grabZahl("HEAT_MAX_ALPHA"), grabFn("heatAlpha"),
  "module.exports = { SPORT_LAST_MUSKELN, aktivitaetSaetze, alsEinheitZaehlbar," +
  " trainierteMuskeln, heatAlpha, MUSKEL_ORDER };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const HEUTE = "2026-08-02";
const lauf = (datum, min) => ({ datum, typ:"aktivitaet", sportart:"laufen", dauerMin:min, saetze:[] });

/* ---------- 1) Der Lauf zaehlt ---------- */
{
  const z = A.trainierteMuskeln([lauf(HEUTE, 30)], HEUTE, 7);
  pruefe("nach einem Lauf sind die Beine nicht mehr leer", Object.keys(z).length > 0);
  /* Die PRIMAER-Muskeln einer Lauf-Einheit — dieselbe Quelle wie v197. */
  A.SPORT_LAST_MUSKELN.laufen.p.forEach(m =>
    pruefe("der Lauf faerbt " + m, z[m] > 0));
  pruefe("30 Minuten sind drei Satz-Aequivalente", z.quadriceps === 3);
  /* Mitarbeitende Muskeln bleiben draussen — wie beim Krafttraining auch. */
  A.SPORT_LAST_MUSKELN.laufen.s.forEach(m =>
    pruefe("mitarbeitende Muskeln bleiben draussen (" + m + ")", z[m] === undefined));
}
pruefe("die Deckel-Regel gilt auch hier (2 h sind nicht mehr als 1 h)",
  A.trainierteMuskeln([lauf(HEUTE, 120)], HEUTE, 7).quadriceps === 6);
pruefe("und eine sehr kurze Einheit zaehlt anteilig",
  A.trainierteMuskeln([lauf(HEUTE, 5)], HEUTE, 7).quadriceps === 0.5);
/* Das Fenster gilt wie zuvor. */
pruefe("ausserhalb des Fensters zaehlt nichts",
  Object.keys(A.trainierteMuskeln([lauf("2026-07-01", 30)], HEUTE, 7)).length === 0);
pruefe("ein Eintrag in der Zukunft auch nicht",
  Object.keys(A.trainierteMuskeln([lauf("2026-08-09", 30)], HEUTE, 7)).length === 0);

/* ---------- 2) Keine Doppelzaehlung ---------- */
{
  /* Wo Saetze stehen, zaehlen die Saetze (v199-Linie) — die Minuten NICHT
     zusaetzlich. Der Satz selbst faellt hier mangels Uebungs-Zuordnung weg;
     entscheidend ist, dass die Dauer nicht heimlich dazukommt. */
  const mitSatz = Object.assign(lauf(HEUTE, 30), { saetze:[{ name:"Steigerungslaeufe", wdh:5 }] });
  pruefe("mit protokollierten Saetzen zaehlen die Minuten nicht mehr",
    A.trainierteMuskeln([mitSatz], HEUTE, 7).quadriceps === undefined);
}
/* Ein abgehakter Eintrag traegt Soll-SAETZE (`saetze[].soll`) — er ist eine
   Absicht, keine Messung, und darf die Figur nicht faerben. Er faellt hier
   ohnehin schon ueber „wo Saetze stehen, zaehlen die Saetze" heraus; geprueft
   wird beides, damit die Zusage auch nach einem Umbau haelt. */
pruefe("ein abgehakter Soll-Eintrag zaehlt nie",
  Object.keys(A.trainierteMuskeln(
    [Object.assign(lauf(HEUTE, 30), { saetze:[{ name:"Laufen", soll:true }] })], HEUTE, 7)).length === 0);
pruefe("und alsEinheitZaehlbar weist ihn ausdruecklich ab",
  A.alsEinheitZaehlbar(Object.assign(lauf(HEUTE, 30), { saetze:[{ name:"Laufen", soll:true }] })) === false);
pruefe("eine Sportart ohne Last-Zuordnung faerbt nichts",
  Object.keys(A.trainierteMuskeln(
    [{ datum:HEUTE, typ:"aktivitaet", sportart:"gibtsnicht", dauerMin:30, saetze:[] }], HEUTE, 7)).length === 0);
pruefe("eine Einheit ohne Dauer auch nicht",
  Object.keys(A.trainierteMuskeln([lauf(HEUTE, 0)], HEUTE, 7)).length === 0);
/* Kraft bleibt, wie es war: ein Satz = ein Punkt je primaerem Muskel. */
pruefe("ein Kraft-Eintrag zaehlt unveraendert",
  A.trainierteMuskeln([{ datum:HEUTE, typ:"kraft",
    saetze:[{ name:"Kniebeugen" }, { name:"Kniebeugen" }] }], HEUTE, 7) !== null);
/* Zwei Laeufe summieren sich — die Farbe saettigt, aber die Zahl waechst. */
pruefe("zwei Laeufe summieren sich",
  A.trainierteMuskeln([lauf(HEUTE, 30), lauf("2026-08-01", 30)], HEUTE, 7).quadriceps === 6);
pruefe("und die Einfaerbung kommt damit klar (kein Sprung ueber den Deckel)",
  A.heatAlpha(3) > A.heatAlpha(0.5) && A.heatAlpha(6) <= 235);

/* ---------- 3) Wer faerbt, muss antworten ---------- */
{
  const q = grabFn("muskelTrainingDetail");
  pruefe("die Liste kennt die Ausdauer-Einheit", q.includes("alsEinheitZaehlbar(e)"));
  pruefe("sie nennt dieselben Primaer-Muskeln wie die Einfaerbung",
    q.includes("SPORT_LAST_MUSKELN[e.sportart].p"));
  pruefe("und zeigt den Plan-Namen (ersatzweise die Sportart)",
    q.includes("e.plan || sportartName(e.sportart)"));
}
/* EINE Regel: Einfaerbung und Belastung teilen sich die Bedingung. */
pruefe("Einfaerbung und Belastungs-Rechnung nutzen dieselbe Bedingung",
  grabFn("trainierteMuskeln").includes("alsEinheitZaehlbar(e)") &&
  grabFn("muskelLast").includes("alsEinheitZaehlbar(e)"));
pruefe("und dieselbe Umrechnung",
  grabFn("trainierteMuskeln").includes("aktivitaetSaetze(e.dauerMin)") &&
  grabFn("muskelLast").includes("aktivitaetSaetze(e.dauerMin)"));

/* ---------- 4) Das Plus-Menue ---------- */
{
  const wege = grabFn("planNeuWege");
  pruefe("planNeuWege liefert genau zwei Wege", /return \["uebung", "eigen"\];/.test(wege));
  pruefe("der Intervall-Weg haengt an keiner Sportart mehr", !/wege\.push\("intervall"\)/.test(wege));
  const menue = grabFn("planNeuMenue");
  pruefe("und das Menue kennt ihn nicht mehr", !/intervall:\s*\{/.test(menue));
}
/* Die Entscheidung lebt im Editor weiter — sonst waere sie verloren. */
pruefe("der Editor-Umschalter Dauer/Runden steht weiter",
  src.includes('onclick="planIntervallSetzen(false)"') &&
  src.includes('onclick="planIntervallSetzen(true)"'));
pruefe("und erscheint genau bei Sportarten mit Runden-Training",
  /getElementById\("akt-art-block"\)\.hidden = !sp\.intervall;/.test(src));
/* Nichts vom alten Anlege-Bildschirm ist zurueckgeblieben. */
pruefe("der eigene Anlege-Bildschirm ist restlos weg",
  !/<section id="view-intervall-neu"/.test(src) &&
  !/function intervallPlanNeu\(/.test(src) &&
  !/"view-intervall-neu": 3/.test(src));
pruefe("der gefuehrte Timer selbst bleibt",
  /<section id="view-intervall"/.test(src) && /function intervallOeffnen\(/.test(src));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v211",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 211);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.211", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
