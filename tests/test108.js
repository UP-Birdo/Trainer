/* v108-Test: der Wizard erzwingt keinen Trainingstag mehr.
   Kern des Vertrags ist die SPLITS-Tabelle: Sie muss 0..6 Tage abdecken, und
   0 wie 1 Tag ergeben GENAU EINEN Ganzkörper-Plan (bei 0 Tagen dann ohne festen
   Tag, s. plaeneErstellen). Die Plan-Zahl der Zusammenfassung liest ihre Länge —
   deshalb sichert dieser Test sie ab. Extrahiert das ECHTE Literal (nie kopieren). */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

/* Objekt-/Array-Literal einer `const NAME = …`-Deklaration wörtlich herausschneiden
   (ab dem ersten { bzw. [ bis zur ausgeglichenen schließenden Klammer). */
function grabConst(name){
  const decl = "const " + name + " = ";
  const i = src.indexOf(decl);
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  const start = src.indexOf("{", i);
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === "{") tiefe++;
    else if(src[k] === "}"){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const SPLITS = eval("(" + grabConst("SPLITS") + ")");

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const KATS = new Set(["beine", "druck", "zug", "rumpf", "cardio"]);

/* 1) Der neue Tag-freie Fall: 0 und 1 Tag ergeben je genau einen Plan. */
pruefe("SPLITS[0] existiert", Array.isArray(SPLITS[0]));
pruefe("SPLITS[1] existiert", Array.isArray(SPLITS[1]));
pruefe("0 Tage -> genau 1 Plan", SPLITS[0].length === 1);
pruefe("1 Tag -> genau 1 Plan", SPLITS[1].length === 1);
pruefe("0-Tage-Plan heißt Ganzkörper", SPLITS[0][0][0] === "Ganzkörper");
pruefe("1-Tag-Plan heißt Ganzkörper", SPLITS[1][0][0] === "Ganzkörper");

/* 2) Der Ganzkörper-Fall trainiert alle Grund-Kategorien (kein leerer Plan). */
const kats0 = new Set(SPLITS[0][0][1]);
pruefe("Ganzkörper deckt beine/druck/zug/rumpf ab",
  kats0.has("beine") && kats0.has("druck") && kats0.has("zug") && kats0.has("rumpf"));
pruefe("Ganzkörper nutzt nur bekannte Kategorien", SPLITS[0][0][1].every(k => KATS.has(k)));

/* 3) Die bestehenden Splits bleiben unverändert: N Tage -> N Pläne (2..6). */
for(let n = 2; n <= 6; n++){
  pruefe(n + " Tage -> " + n + " Pläne", Array.isArray(SPLITS[n]) && SPLITS[n].length === n);
}

/* 4) Jeder Split-Eintrag ist [Titel, Kategorien[]] mit gültigen Kategorien. */
let formOk = true;
Object.keys(SPLITS).forEach(k => SPLITS[k].forEach(([titel, kategorien]) => {
  if(typeof titel !== "string" || !Array.isArray(kategorien) || !kategorien.every(c => KATS.has(c))) formOk = false;
}));
pruefe("Alle Split-Einträge sind [Titel, gültige Kategorien]", formOk);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
