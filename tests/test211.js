/* v211-Test: Der Lauf faerbt die Figur mit + das „+"-Menue hat zwei Eintraege.
   (55. Runde, beides Nutzer-Funde aus der Ideen-Box.)

   Urspruenglich prueften hier Abschnitte 1+2 die Zaehlung `trainierteMuskeln`
   (Haeufigkeits-Heatmap). Die ganze Heatmap-Kette ist mit 0.236.0 abgebaut —
   die Einfaerbung laeuft seit 0.226/0.228 ueberall ueber die Auslastung
   (`muskelLast`, geprueft in test197/test226). Geblieben sind die Zusagen,
   die weiterhin lebenden Code treffen:
   1. WER FAERBT, MUSS ANTWORTEN. Ist ein Muskel wegen einer Einheit gefaerbt,
      steht die Einheit auch in der Liste darunter (muskelTrainingDetail).
   2. DIESELBEN BAUSTEINE. Die Belastungs-Rechnung nutzt alsEinheitZaehlbar +
      aktivitaetSaetze — und ein Soll-Eintrag zaehlt nie.
   3. Das Plus-Menue hat zwei Wege (Intervall lebt im Editor weiter).
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
  grabZahl("AKTIVITAET_MINUTEN_JE_SATZ"), grabZahl("AKTIVITAET_MAX_SAETZE"),
  grabBlock("SPORT_LAST_MUSKELN", "{", "}"),
  grabFn("istSollEintrag"), grabFn("aktivitaetSaetze"), grabFn("alsEinheitZaehlbar"),
  "module.exports = { SPORT_LAST_MUSKELN, aktivitaetSaetze, alsEinheitZaehlbar };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const lauf = (min) => ({ datum:"2026-08-02", typ:"aktivitaet", sportart:"laufen", dauerMin:min, saetze:[] });

/* ---------- 1) Dieselben Bausteine: Umrechnung + Soll-Abweisung ---------- */
pruefe("30 Minuten sind drei Satz-Aequivalente", A.aktivitaetSaetze(30) === 3);
pruefe("die Deckel-Regel gilt (2 h sind nicht mehr als 1 h)", A.aktivitaetSaetze(120) === 6);
pruefe("eine sehr kurze Einheit zaehlt anteilig", A.aktivitaetSaetze(5) === 0.5);
pruefe("eine zaehlbare Einheit wird erkannt", A.alsEinheitZaehlbar(lauf(30)) === true);
pruefe("ein abgehakter Soll-Eintrag zaehlt nie",
  A.alsEinheitZaehlbar(Object.assign(lauf(30), { saetze:[{ name:"Laufen", soll:true }] })) === false);
pruefe("mit protokollierten Saetzen zaehlen die Minuten nicht mehr",
  A.alsEinheitZaehlbar(Object.assign(lauf(30), { saetze:[{ name:"Steigerungslaeufe", wdh:5 }] })) === false);
pruefe("eine Einheit ohne Dauer zaehlt nicht", A.alsEinheitZaehlbar(lauf(0)) === false);
pruefe("der Lauf kennt seine Primaer-Muskeln", A.SPORT_LAST_MUSKELN.laufen.p.length > 0);

/* ---------- 2) Wer faerbt, muss antworten ---------- */
{
  const q = grabFn("muskelTrainingDetail");
  pruefe("die Liste kennt die Ausdauer-Einheit", q.includes("alsEinheitZaehlbar(e)"));
  pruefe("sie nennt dieselben Primaer-Muskeln wie die Einfaerbung",
    q.includes("SPORT_LAST_MUSKELN[e.sportart].p"));
  pruefe("und zeigt den Plan-Namen (ersatzweise die Sportart)",
    q.includes("e.plan || sportartName(e.sportart)"));
}
/* EINE Regel: Die Belastungs-Rechnung nutzt dieselben Bausteine. */
pruefe("die Belastungs-Rechnung nutzt dieselbe Bedingung",
  grabFn("muskelLast").includes("alsEinheitZaehlbar(e)"));
/* 0.244: die Umrechnung bekam den persoenlichen Deckel als zweiten Parameter. */
pruefe("und dieselbe Umrechnung",
  // 0.249: gerechnet wird mit den effektiven Minuten (Strecke rettet die Dauer).
  grabFn("muskelLast").includes("aktivitaetSaetze(aktivitaetsMinuten(e, pace),"));

/* ---------- 3) Das Plus-Menue ---------- */
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

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v211",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 211);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.211", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
