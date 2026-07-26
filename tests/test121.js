/* v121-Test: Nicht-Kraft Etappe 4 — Ziel + Fortschritt je Messgröße.
   Kern sind die reinen Rechen-Funktionen: `massZahl` (Wert -> Zahl, Ordinalskala
   als Rang), `massVergleich` (Ziel erreicht?), `massKlemmen`/`massSchritt` (ein
   Schritt weiter, in den Grenzen), `planZielText` (eine Ziel-Zeile) sowie
   `intervallSteigern` (Runde mehr, solange die 20-%-Hausregel hält).
   Dazu strukturelle Verdrahtungs-Checks. */
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

const code = [
  // Zwei Messgrößen-Arten wie in SPORTARTEN: Zahl (Yoga) und Ordinalskala (Klettern).
  "const SPORTS = { yoga:{ mass:{ label:'Beweglichkeit', einheit:'\\u00B0', schritt:5, start:30, max:180 } }," +
    " klettern:{ mass:{ label:'Schwierigkeit', skala:['5a','5b','5c','6a','6a+'], start:'5a' } }," +
    " laufen:{ strecke:{ einheit:'km' } } };",
  "function sportart(id){ return SPORTS[id] || {}; }",
  "function zahlKurz(n){ return String(Math.round(n * 100) / 100).replace('.', ','); }",
  "function begrenzen(w, min, max){ return Math.min(max, Math.max(min, w)); }",
  "function aktivitaetText(id, strecke, sek){ return sek ? Math.round(sek/60) + ' min' : ''; }",
  "const STEIGERUNG_MAX = 0.20;",
  grabFn("massText"),
  grabFn("massZahl"),
  grabFn("massVergleich"),
  grabFn("massSchritt"),
  grabFn("massKlemmen"),
  grabFn("planZielText"),
  grabFn("intervallSteigern"),
  "module.exports = { massZahl, massVergleich, massSchritt, massKlemmen, planZielText, intervallSteigern };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const { massZahl, massVergleich, massSchritt, massKlemmen, planZielText, intervallSteigern } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) massZahl — die Brücke zwischen beiden Arten. */
pruefe("Zahl bleibt Zahl", massZahl("yoga", 45) === 45);
pruefe("Zahl als Text wird Zahl", massZahl("yoga", "45") === 45);
pruefe("Komma-Eingabe wird verstanden", massZahl("yoga", "40,5") === 40.5);
pruefe("Grad wird Rang", massZahl("klettern", "6a") === 3);
pruefe("erster Grad = Rang 0", massZahl("klettern", "5a") === 0);
pruefe("unbekannter Grad -> null", massZahl("klettern", "9z") === null);
pruefe("leer -> null", massZahl("yoga", "") === null);
pruefe("null -> null", massZahl("yoga", null) === null);
pruefe("Sportart ohne Messgröße -> null", massZahl("laufen", 5) === null);

/* 2) massVergleich — „Ziel erreicht?". Fehlende Werte MÜSSEN null geben
      (null >= 0 wäre in JS wahr — genau die Falle, die der Aufrufer prüft). */
pruefe("Ziel übertroffen", massVergleich("yoga", 40, 30) === 1);
pruefe("Ziel genau erreicht", massVergleich("yoga", 30, 30) === 0);
pruefe("Ziel verfehlt", massVergleich("yoga", 25, 30) === -1);
pruefe("Grad übertroffen", massVergleich("klettern", "6a", "5c") === 1);
pruefe("Grad verfehlt", massVergleich("klettern", "5b", "6a") === -1);
pruefe("ohne Messwert -> null", massVergleich("yoga", "", 30) === null);
pruefe("ohne Ziel -> null", massVergleich("yoga", 40, undefined) === null);
pruefe("Sportart ohne Messgröße -> null", massVergleich("laufen", 5, 3) === null);

/* 3) massSchritt — ein Schritt weiter, in den Grenzen. */
pruefe("Zahl +1 Schritt", massSchritt("yoga", 30, 1) === 35);
pruefe("Zahl -1 Schritt", massSchritt("yoga", 30, -1) === 25);
pruefe("Zahl nie unter einen Schritt", massSchritt("yoga", 5, -1) === 5);
pruefe("Zahl nie über max", massSchritt("yoga", 180, 1) === 180);
pruefe("ohne Ausgangswert zählt start", massSchritt("yoga", "", 1) === 35);
pruefe("Grad +1 Rang", massSchritt("klettern", "5c", 1) === "6a");
pruefe("Grad -1 Rang", massSchritt("klettern", "5c", -1) === "5b");
pruefe("Skalen-Ende bleibt stehen", massSchritt("klettern", "6a+", 1) === "6a+");
pruefe("Skalen-Anfang bleibt stehen", massSchritt("klettern", "5a", -1) === "5a");
pruefe("unbekannter Grad -> start", massSchritt("klettern", "9z", 1) === "5a");
pruefe("ohne Messgröße unverändert", massSchritt("laufen", 5, 1) === 5);

/* 4) massKlemmen — freie Eingabe in die Grenzen. */
pruefe("klemmt nach oben", massKlemmen("yoga", 999) === 180);
pruefe("klemmt nach unten", massKlemmen("yoga", 0) === 5);
pruefe("rundet auf Zehntel", massKlemmen("yoga", 42.46) === 42.5);
pruefe("Unsinn -> start", massKlemmen("yoga", "abc") === 30);
pruefe("Skala unverändert durchgereicht", massKlemmen("klettern", "6a") === "6a");

/* 5) planZielText — eine Zeile für Plan-Karte, Heute-Karte und Stoppuhr. */
pruefe("Dauer + Messgrößen-Ziel",
  planZielText({ sportart:"yoga", dauer:1800, strecke:0, massZiel:30 }) === "30 min · Beweglichkeit 30°");
pruefe("ohne Ziel nur die Dauer",
  planZielText({ sportart:"yoga", dauer:1800, strecke:0 }) === "30 min");
pruefe("Grad-Ziel als Text",
  planZielText({ sportart:"klettern", dauer:3600, strecke:0, massZiel:"6a" }) === "60 min · Schwierigkeit 6a");
pruefe("Sportart ohne Messgröße unberührt",
  planZielText({ sportart:"laufen", dauer:1800, strecke:5, massZiel:30 }) === "30 min");

/* 6) intervallSteigern — Runde mehr, solange der Zuwachs ≤ 20 % bleibt. */
const i8 = intervallSteigern({ runden:8, belastung:30, pause:15 });
pruefe("8 Runden -> 9 Runden", i8.runden === 9 && i8.belastung === 30);
pruefe("Pause bleibt", i8.pause === 15);
const i5 = intervallSteigern({ runden:5, belastung:30, pause:15 });
pruefe("5 Runden (genau 20 %) -> 6 Runden", i5.runden === 6 && i5.belastung === 30);
const i3 = intervallSteigern({ runden:3, belastung:30, pause:15 });
pruefe("3 Runden (33 % wäre zu viel) -> Belastung statt Runde", i3.runden === 3 && i3.belastung === 35);
const i1 = intervallSteigern({ runden:1, belastung:60, pause:0 });
pruefe("1 Runde -> Belastung 66 auf 65 gerundet", i1.runden === 1 && i1.belastung === 65);
const iKlein = intervallSteigern({ runden:2, belastung:10, pause:5 });
pruefe("kleine Belastung wächst mindestens 5 s", iKlein.belastung === 15);

/* 7) Verdrahtung im Quelltext. */
pruefe("Editor-Feld akt-mass vorhanden", src.includes('id="akt-mass"') && src.includes('id="akt-mass-select"'));
pruefe("Editor zeichnet das Ziel-Feld", src.includes("function massZielFeldZeichnen("));
pruefe("Sportart-Wechsel setzt massZiel",
  /editorPlan\.massZiel = sportart\(id\)\.mass \? sportart\(id\)\.mass\.start : null/.test(src));
pruefe("Erfassung wird aus massZiel vorbelegt", src.includes("plan.massZiel != null ? plan.massZiel"));
pruefe("Steigerung nur bei erreichtem Ziel",
  src.includes("const massReif = vergleich !== null && vergleich >= 0"));
pruefe("Intervall-Plan steigert Runden statt Uhr",
  src.includes("echterPlan.intervall = intervallSteigern(echterPlan.intervall)"));
pruefe("Statistik-Kachel messwerte verdrahtet",
  src.includes('id="messwerte-karte"') && src.includes('["messwerte",') &&
  src.includes("function messwerteZeichnen(") && src.includes('if(id === "messwerte")'));
pruefe("Yoga trägt max-Grenze", /id:"yoga"[\s\S]{0,700}max:180/.test(src));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
