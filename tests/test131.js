/* v131-Test: Grundeinstellungen des Plans hinter EINER Zeile.
   Kern ist die reine `planEinstText` — was die zugeklappte Zeile anzeigt:
   Tage/Takt plus, je nach Plan-Typ, Ziel (Aktivitaet) bzw. Reihenfolge/Bonus
   (Kraft). Dazu strukturelle Checks, dass wirklich ALLE Bloecke im Aufklapper
   liegen und der Editor-Kopf nur noch Name + Sportart zeigt.
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
  "const WOCHENTAGE = ['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];",
  "const SP = { kraft:{}, yoga:{ mass:{ label:'Beweglichkeit', einheit:'\\u00B0' } }, laufen:{ strecke:{ einheit:'km' } } };",
  "function sportart(id){ return SP[id] || {}; }",
  "function zahlKurz(n){ return String(n).replace('.', ','); }",
  "function aktivitaetText(id, strecke, sek){ return sek ? Math.round(sek/60) + ' min' : ''; }",
  grabFn("massText"), grabFn("massZahl"), grabFn("planZielText"),
  grabFn("planTageText"), grabFn("planEinstText"),
  "module.exports = { planEinstText };"
].join("\n"))(modul, modul.exports);
const planEinstText = modul.exports.planEinstText;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* 1) Kraft-Plan: Tage + Reihenfolge + Bonus. */
pruefe("Kraft ohne alles",
  planEinstText({ typ:"kraft", sportart:"kraft", tage:[] }) === "kein fester Tag");
pruefe("Kraft mit Tagen",
  planEinstText({ typ:"kraft", sportart:"kraft", tage:[1,4] }) === "Mo, Do");
pruefe("Zirkel wird genannt",
  planEinstText({ typ:"kraft", sportart:"kraft", tage:[1], reihenfolge:"zirkel" }) === "Mo · Zirkel");
pruefe("Klassisch wird NICHT genannt (Normalfall)",
  planEinstText({ typ:"kraft", sportart:"kraft", tage:[1], reihenfolge:"klassisch" }) === "Mo");
pruefe("Bonus wird genannt",
  planEinstText({ typ:"kraft", sportart:"kraft", tage:[], aufwaermen:true, dehnen:true })
    === "kein fester Tag · Aufwärmen · Dehnen");
pruefe("nur Dehnen",
  planEinstText({ typ:"kraft", sportart:"kraft", tage:[], dehnen:true }) === "kein fester Tag · Dehnen");
pruefe("alles zusammen",
  planEinstText({ typ:"kraft", sportart:"kraft", tage:[1], wochenTakt:2, reihenfolge:"zirkel", aufwaermen:true })
    === "Mo · alle 2 Wochen · Zirkel · Aufwärmen");

/* 2) Aktivitaets-Plan: Tage + Ziel statt Reihenfolge/Bonus. */
pruefe("Aktivitaet zeigt das Ziel",
  planEinstText({ typ:"aktivitaet", sportart:"yoga", tage:[], dauer:1800, strecke:0, massZiel:30 })
    === "kein fester Tag · 30 min · Beweglichkeit 30°");
pruefe("Aktivitaet ohne Ziel nur die Dauer",
  planEinstText({ typ:"aktivitaet", sportart:"laufen", tage:[2], dauer:3600, strecke:5 }) === "Di · 60 min");
pruefe("Aktivitaet ignoriert Kraft-Felder",
  planEinstText({ typ:"aktivitaet", sportart:"laufen", tage:[], dauer:0, strecke:0, reihenfolge:"zirkel", aufwaermen:true })
    === "kein fester Tag");

/* 3) Struktur: alles liegt im EINEN Aufklapper, Kopf zeigt nur Name + Sportart. */
const editorHtml = src.split('<section id="view-editor"')[1].split("</section>")[0];
pruefe("eine Aufklapp-Zeile", (editorHtml.match(/editorEinstUmschalten\(\)/g) || []).length === 1);
pruefe("Wochentage liegen drin",
  editorHtml.indexOf('id="editor-einst-block"') < editorHtml.indexOf('id="plan-tag"'));
pruefe("Aktivitaets-Felder liegen drin",
  editorHtml.indexOf('id="editor-einst-block"') < editorHtml.indexOf('id="editor-aktivitaet"'));
pruefe("Kraft-Felder liegen drin",
  editorHtml.indexOf('id="editor-einst-block"') < editorHtml.indexOf('id="editor-kraft"'));
pruefe("Name und Sportart bleiben oben (vor dem Aufklapper)",
  editorHtml.indexOf('id="plan-name"') < editorHtml.indexOf('id="editor-einst-block"') &&
  editorHtml.indexOf('id="plan-sportart"') < editorHtml.indexOf('id="editor-einst-block"'));
pruefe("Uebungsliste steht NACH dem Aufklapper",
  editorHtml.indexOf('id="editor-einst-block"') < editorHtml.indexOf('id="uebung-liste"'));
pruefe("alter v126-Block ist ersetzt", !src.includes('id="plan-tage-block"'));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
