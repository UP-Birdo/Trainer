/* v148-Test: Uebungs-Suche als eigene Ansicht mit uebergeordneten Filtern.
   Kern sind `pickerKandidaten` (welche Uebungen die Filter uebrig lassen) und
   `pickerFilterHtml` (welche Filter-Reihen es je Plan-Typ gibt). Dazu der
   Aufbau der Ansicht und die Verdrahtung.
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
function grabLiteral(name){
  const decl = "const " + name + " = ";
  const i = src.indexOf(decl);
  if(i < 0) throw new Error("Konstante nicht gefunden: " + name);
  let start = i + decl.length;
  while(start < src.length && src[start] !== "{" && src[start] !== "[") start++;
  const auf = src[start], zu = auf === "{" ? "}" : "]";
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === auf) tiefe++;
    else if(src[k] === zu){ tiefe--; if(tiefe === 0) return src.slice(start, k + 1); }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const code = [
  "const UEBUNGEN_DB = " + grabLiteral("UEBUNGEN_DB") + ";",
  "const SPORT_UEBUNGEN = " + grabLiteral("SPORT_UEBUNGEN") + ";",
  "const GERAETE = " + grabLiteral("GERAETE") + ";",
  "const BIB_KATS = " + grabLiteral("BIB_KATS") + ";",
  grabFn("normName"),
  grabFn("text"),
  grabFn("sportUebungen"),
  /* Der Nutzer hat in diesem Test ALLE Geraete — so laesst sich pruefen, dass die
     Filter greifen, und nicht nur die Geraete-Konfiguration. */
  "function meineGeraete(){ return ['keine'].concat(GERAETE.map(g => g.id)); }",
  "let suchText = '';",
  "function getElementById(id){ return id === 'picker-suche' ? { value: suchText } : null; }",
  "const document = { getElementById };",
  "const sitzung = { daten: { einrichtung: { sportarten:['kraft','laufen'] }, eigeneUebungen: {} } };",
  "let editorPlan = { sportart:'kraft', typ:'kraft', uebungen:[] };",
  "let pickerFilter = { kat:'alle', geraet:'alle', art:'alle' };",
  grabFn("pickerKandidaten"),
  grabFn("pickerFilterHtml"),
  "module.exports = { pickerKandidaten, pickerFilterHtml, GERAETE," +
    " setPlan: p => { editorPlan = p; }, setFilter: f => { pickerFilter = f; }," +
    " setSuche: s => { suchText = s; } };"
].join("\n");
const modul = { exports: {} };
new Function("module", "exports", code)(modul, modul.exports);
const { pickerKandidaten, pickerFilterHtml, setPlan, setFilter, setSuche } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const kraftPlan = () => ({ sportart:"kraft", typ:"kraft", uebungen:[] });
const laufPlan  = () => ({ sportart:"laufen", typ:"aktivitaet", uebungen:[] });

/* ---------- 1) Bereichs-Filter (Muskelgruppe) ---------- */
setPlan(kraftPlan()); setSuche("");
setFilter({ kat:"alle", geraet:"alle", art:"alle" });
const alle = pickerKandidaten();
pruefe("ohne Filter kommt die ganze Bibliothek (ist: " + alle.length + ")", alle.length === UEBUNGEN_DB_LAENGE());
function UEBUNGEN_DB_LAENGE(){ return eval("(" + grabLiteral("UEBUNGEN_DB") + ")").length; }

setFilter({ kat:"beine", geraet:"alle", art:"alle" });
const beine = pickerKandidaten();
pruefe("Bereich Beine filtert (ist: " + beine.length + ")", beine.length === 40);
pruefe("Bereich Beine enthaelt Kniebeugen", beine.includes("Kniebeugen"));
pruefe("Bereich Beine enthaelt kein Bankdruecken", !beine.includes("LH-Bankdrücken"));

/* ---------- 2) Geraete-Filter, auch Koerpergewicht ---------- */
setFilter({ kat:"alle", geraet:"keine", art:"alle" });
const koerper = pickerKandidaten();
pruefe("Koerpergewicht liefert nur geraetelose Uebungen", koerper.includes("Liegestütze") && !koerper.includes("Beinpresse"));

/* ---------- 3) Beide Filter zusammen ---------- */
setFilter({ kat:"druck", geraet:"keine", art:"alle" });
const kombi = pickerKandidaten();
pruefe("Bereich UND Geraet greifen gemeinsam",
  kombi.includes("Liegestütze") && !kombi.includes("Kniebeugen") && !kombi.includes("LH-Bankdrücken"));

/* ---------- 4) Suchtext bleibt zusaetzlich wirksam ---------- */
setFilter({ kat:"alle", geraet:"alle", art:"alle" });
setSuche("kniebeug");
pruefe("Suchtext filtert weiter", pickerKandidaten().every(n => normNameTest(n).includes("kniebeug")));
function normNameTest(s){ return s.toLowerCase().replace(/[^a-z0-9äöüß]/g, ""); }
setSuche("");

/* ---------- 5) Schon im Plan = nicht mehr in der Liste ---------- */
setPlan({ sportart:"kraft", typ:"kraft", uebungen:[{ name:"Kniebeugen" }] });
setFilter({ kat:"beine", geraet:"alle", art:"alle" });
pruefe("was im Plan steht, taucht nicht mehr auf", !pickerKandidaten().includes("Kniebeugen"));

/* ---------- 6) Aktivitaets-Plan: Filter nach Art ---------- */
setPlan(laufPlan());
setFilter({ kat:"alle", geraet:"alle", art:"alle" });
pruefe("Laufen bietet alle seine Drills", pickerKandidaten().length === 8);
setFilter({ kat:"alle", geraet:"alle", art:"technik" });
const technik = pickerKandidaten();
pruefe("Art Technik filtert", technik.includes("Steigerungsläufe") && !technik.includes("Bergsprints"));
setFilter({ kat:"alle", geraet:"alle", art:"kondition" });
pruefe("Art Kondition filtert", pickerKandidaten().includes("Bergsprints"));

/* ---------- 7) Welche Filter-Reihen es gibt ---------- */
setPlan(kraftPlan()); setFilter({ kat:"alle", geraet:"alle", art:"alle" });
const kraftFilter = pickerFilterHtml();
pruefe("Kraft bekommt zwei Reihen", (kraftFilter.match(/filter-reihe/g) || []).length === 2);
pruefe("Kraft-Reihen heissen Bereich und Geraet",
  kraftFilter.includes("Bereich") && kraftFilter.includes("Gerät"));
pruefe("Koerpergewicht steht als eigener Filter drin", kraftFilter.includes("Körpergewicht"));
pruefe("kein System-Auswahlfeld mehr", !kraftFilter.includes("<select"));
setPlan(laufPlan());
const aktFilter = pickerFilterHtml();
pruefe("Aktivitaet bekommt eine Reihe", (aktFilter.match(/filter-reihe/g) || []).length === 1);
pruefe("Aktivitaets-Reihe heisst Art", aktFilter.includes("Art") && aktFilter.includes("Technik"));
setPlan({ sportart:"", typ:"", uebungen:[] });
pruefe("ohne Sportart gibt es nichts zu filtern", pickerFilterHtml() === "");

/* ---------- 8) Aufbau der Ansicht ---------- */
const ansicht = src.split('<section id="view-uebung-picker"')[1].split("</section>")[0];
pruefe("die Ansicht gibt es", src.includes('<section id="view-uebung-picker" class="view">'));
pruefe("sie ist ab Stufe 3 erlaubt", src.includes('"view-uebung-picker": 3'));
pruefe("Suchfeld vorhanden", ansicht.includes('id="picker-suche"'));
pruefe("Filter-Bereich vorhanden", ansicht.includes('id="picker-filter"'));
pruefe("Eigene Uebung steht GANZ UNTEN",
  ansicht.indexOf('id="picker-karten"') < ansicht.indexOf('id="picker-eigen-karte"'));
pruefe("Hinweis erst-ins-Suchfeld-tippen ist weg", !src.includes("Tippe ins Suchfeld"));
pruefe("pickerBodyZeichnen ist entfallen", !src.includes("function pickerBodyZeichnen("));

/* ---------- 9) Verdrahtung ---------- */
pruefe("Editor zeigt nur noch den Eingang", grabFn("uebungPickerZeichnen").includes('onclick="uebungPickerOeffnen()"'));
pruefe("Oeffnen setzt die Filter zurueck",
  grabFn("uebungPickerOeffnen").includes('pickerFilter = { kat:"alle", geraet:"alle", art:"alle" }'));
pruefe("Oeffnen wechselt die Ansicht", grabFn("uebungPickerOeffnen").includes('zeige("view-uebung-picker")'));
pruefe("Fertig fuehrt zurueck in den Editor", grabFn("pickerZurueck").includes('zeige("view-editor")'));
pruefe("Auswaehlen bleibt in der Suche", grabFn("pickerKarteHinzu").includes("pickerAnsichtZeichnen()"));
pruefe("eigene Uebung fuehrt in den Editor", grabFn("eigeneErstellen").includes('zeige("view-editor")'));
pruefe("Filter-Klick zeichnet Reihen und Karten neu",
  grabFn("pickerFilterSetzen").includes("pickerFilterHtml()") && grabFn("pickerFilterSetzen").includes("pickerKartenZeichnen()"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
