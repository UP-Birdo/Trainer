/* v192-Test: Etappe 1 der Uebungs-Entscheidung — die Uebung wird die
   Grundeinheit (Nutzer-Ansage, ausdruecklich als wichtige Entscheidung
   markiert).

   Die Zusagen dieser Etappe:
   1. Es gibt einen Weg „Einzelne Uebung": aus der Bibliothek waehlen -> sofort
      startbar, OHNE festen Tag. Er steht an erster Stelle im Plus-Menue.
   2. Der Tab heisst „Uebungen" (Nav-Leiste und Titel), und die Liste
      unterscheidet SICHTBAR zwischen Uebung und Plan.
   3. Die Unterscheidung ist ABGELEITET, nicht gespeichert: genau eine Uebung
      ohne Termin = Uebung, alles andere = Plan. Damit stimmt sie auch, wenn
      eine Uebung spaeter einen Tag bekommt (Etappe 2).
   4. Der Ersatz zuerst, das Entfernen zuletzt: Der Assistent steht in dieser
      Etappe NOCH — er verschwindet erst in Etappe 3. Sonst haette ein neuer
      Nutzer voruebergehend keinen Weg zu seinem ersten Training.
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
function grabSportarten(){
  const i = src.indexOf("const SPORTARTEN = [");
  let tiefe = 0;
  for(let k = src.indexOf("[", i); k < src.length; k++){
    if(src[k] === "[") tiefe++;
    else if(src[k] === "]"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("SPORTARTEN unausgeglichen");
}

/* Die echten Funktionen werden extrahiert (nie kopiert). Was sie an der
   Aussenwelt anfassen — Speichern, Zeichnen, Ansicht, Toast — steht hier als
   Attrappe, die mitschreibt: So laesst sich pruefen, WAS passiert ist. */
const modul = { exports: {} };
new Function("module", "exports", [
  grabSportarten(),
  grabFn("sportart"),
  "let uebungEinzelModus = false;",
  "let editorPlan = null;",
  "let sitzung = { daten: { plaene: [], eigeneUebungen: {} } };",
  "const spur = { toast:null, ansicht:null, gezeichnet:0, gespeichert:0 };",
  "function speichern(){ spur.gespeichert++; }",
  "function planListeZeichnen(){ spur.gezeichnet++; }",
  "function zeige(id){ spur.ansicht = id; }",
  "function zeigenToast(t){ spur.toast = t; }",
  grabFn("planArt"),
  grabFn("planArtName"),
  grabFn("planArtMarkeHtml"),
  grabFn("eigeneUebungenAblegen"),
  grabFn("planSichern"),
  grabFn("einzelUebungAbschliessen"),
  grabFn("planNeuWege"),
  "module.exports = { planArt, planArtName, planArtMarkeHtml, planSichern, planNeuWege," +
  " eigeneUebungenAblegen, einzelUebungAbschliessen, spur, sitzung," +
  " setzeModus: v => { uebungEinzelModus = v; }, holeModus: () => uebungEinzelModus," +
  " setzePlan: p => { editorPlan = p; }, holePlan: () => editorPlan };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const uebung = n => ({ name:n, saetze:3, wdh:10 });

/* ---------- 1) Uebung oder Plan? Die abgeleitete Regel ---------- */
pruefe("eine Uebung ohne Termin ist eine Uebung",
  A.planArt({ uebungen:[uebung("Klimmzuege")], tage:[] }) === "uebung");
pruefe("mit festem Tag wird sie zum Plan (Etappe 2)",
  A.planArt({ uebungen:[uebung("Klimmzuege")], tage:[1] }) === "plan");
pruefe("auch ein einzelner Termin macht sie zum Plan",
  A.planArt({ uebungen:[uebung("Klimmzuege")], tage:[], einzelTermine:["2026-07-30"] }) === "plan");
pruefe("zwei Uebungen sind ein Plan",
  A.planArt({ uebungen:[uebung("A"), uebung("B")], tage:[] }) === "plan");
pruefe("null Uebungen (reine Stoppuhr) sind ein Plan",
  A.planArt({ typ:"aktivitaet", uebungen:[], tage:[] }) === "plan");
pruefe("ein Aktivitaets-Plan mit genau einem Drill ist eine Uebung",
  A.planArt({ typ:"aktivitaet", uebungen:[uebung("Intervalllauf")], tage:[] }) === "uebung");
pruefe("kein Plan uebergeben faellt nicht um", A.planArt(null) === "plan" && A.planArt() === "plan");
pruefe("alte Plaene ohne tage/einzelTermine fallen nicht um",
  A.planArt({ uebungen:[uebung("Klimmzuege")] }) === "uebung" &&
  A.planArt({ tage:[] }) === "plan");

/* ---------- 2) Die sichtbare Marke ---------- */
pruefe("die Uebung heisst Uebung", A.planArtName({ uebungen:[uebung("A")], tage:[] }) === "Übung");
pruefe("der Plan heisst Plan", A.planArtName({ uebungen:[uebung("A")], tage:[2] }) === "Plan");
const markeU = A.planArtMarkeHtml({ uebungen:[uebung("A")], tage:[] });
pruefe("die Marke ist ein eigenes Element",
  markeU.indexOf('class="art-marke"') > 0 && markeU.indexOf("Übung") > 0);
pruefe("es gibt eine Regel dafuer im Stylesheet", src.includes(".art-marke{"));

const liste = grabFn("planListeZeichnen");
pruefe("die volle Karte zeigt die Marke", liste.includes("planArtMarkeHtml(p)"));
pruefe("die schlanke Zeile zeigt sie auch (jede Dichte, v109)",
  (liste.match(/planArtMarkeHtml\(p\)/g) || []).length >= 2);
pruefe("ohne festen Tag steht weiterhin kein Tages-Ersatztext",
  liste.includes('(marke ? text(marke) : "")'));

/* ---------- 3) Der Weg „Einzelne Uebung" ---------- */
const wege = A.planNeuWege(5, ["kraft"]);
pruefe("der Weg steht an ERSTER Stelle", wege[0] === "uebung");
pruefe("auf jeder Stufe, die das Menue ueberhaupt zeigt",
  [3,4,5].every(s => A.planNeuWege(s, ["kraft"])[0] === "uebung") &&
  A.planNeuWege(3, [])[0] === "uebung");

const menue = grabFn("planNeuMenue");
pruefe("das Menue verdrahtet ihn mit uebungAlleinAnlegen",
  /uebung:\s*\{[^}]*uebungAlleinAnlegen/.test(menue));
pruefe("und beschriftet ihn als Einzelne Uebung", menue.includes('"Einzelne Übung"'));

const anlegen = grabFn("uebungAlleinAnlegen");
pruefe("er schaltet in den Einzel-Modus", anlegen.includes("uebungEinzelModus = true"));
pruefe("er legt einen Plan OHNE Tage an", /tage:\s*\[\]/.test(anlegen));
pruefe("er fuehrt direkt in die Uebungs-Suche, nicht in den Editor",
  anlegen.includes("uebungPickerOeffnen()") && !anlegen.includes('zeige("view-editor")'));
pruefe("eine einzige Profil-Sportart wird nicht gefragt (wie v126)",
  anlegen.includes("meine.length === 1"));

/* ---------- 4) Der Abschluss: die erste Uebung ist die ganze Sache ---------- */
A.setzeModus(true);
A.setzePlan({ id:"e1", name:"", uebungen:[uebung("Klimmzuege")], sportart:"kraft",
              typ:"kraft", tage:[], einzelTermine:[] });
const fertig = A.einzelUebungAbschliessen();
pruefe("der Abschluss meldet, dass er zustaendig war", fertig === true);
pruefe("der Name ist der Uebungsname", A.holePlan().name === "Klimmzuege");
pruefe("kein fester Tag", A.holePlan().tage.length === 0 && A.holePlan().einzelTermine.length === 0);
pruefe("die Uebung steht in der Liste", A.sitzung.daten.plaene.length === 1);
pruefe("und ist dort als Uebung erkennbar", A.planArt(A.sitzung.daten.plaene[0]) === "uebung");
pruefe("gespeichert und neu gezeichnet", A.spur.gespeichert === 1 && A.spur.gezeichnet === 1);
pruefe("der Toast sagt Uebung, nicht Plan", A.spur.toast === "Übung gespeichert");
pruefe("und wir landen in der Liste", A.spur.ansicht === "view-plaene");
pruefe("der Einzel-Modus ist danach aus", A.holeModus() === false);

/* Ohne Einzel-Modus haelt sich der Abschluss vollstaendig heraus — sonst
   verschwaende der Editor-Weg beim ersten Klick in die Liste. */
const vorher = A.sitzung.daten.plaene.length;
A.setzePlan({ id:"e2", name:"Ganzkoerper", uebungen:[uebung("Kniebeuge")], tage:[] });
pruefe("im Editor-Weg tut der Abschluss nichts", A.einzelUebungAbschliessen() === false);
pruefe("und legt nichts ab", A.sitzung.daten.plaene.length === vorher);
A.setzeModus(true);
A.setzePlan({ id:"e3", name:"", uebungen:[], tage:[] });
pruefe("ohne gewaehlte Uebung passiert ebenfalls nichts",
  A.einzelUebungAbschliessen() === false && A.sitzung.daten.plaene.length === vorher);
A.setzeModus(false);

/* Selbst geschriebene Uebungen landen im Profil — egal ueber welchen Weg. */
A.sitzung.daten.eigeneUebungen = {};
A.eigeneUebungenAblegen({ sportart:"kraft",
  uebungen:[{ name:"Trapezheben", modus:"wdh", saetze:3, wdh:12, eigen:true }] });
pruefe("eigene Uebung wird im Profil abgelegt",
  (A.sitzung.daten.eigeneUebungen.kraft || []).length === 1);
A.eigeneUebungenAblegen({ sportart:"kraft",
  uebungen:[{ name:"Trapezheben", modus:"wdh", saetze:3, wdh:12, eigen:true }] });
pruefe("aber kein zweites Mal", (A.sitzung.daten.eigeneUebungen.kraft || []).length === 1);
pruefe("der Einzel-Weg legt sie mit ab",
  grabFn("einzelUebungAbschliessen").includes("eigeneUebungenAblegen(editorPlan)"));
pruefe("und der Editor-Weg nutzt dieselbe Funktion",
  grabFn("editorSpeichern").includes("eigeneUebungenAblegen(editorPlan)"));

/* ---------- 5) Die Uebungs-Suche traegt jetzt zwei Wege ---------- */
const zurueck = grabFn("pickerZurueck");
pruefe("Abbrechen im Einzel-Modus fuehrt in die Liste, nicht in den Editor",
  /uebungEinzelModus[\s\S]{0,200}zeige\("view-plaene"\)/.test(zurueck));
pruefe("und schaltet den Modus ab", zurueck.includes("uebungEinzelModus = false"));
const kopf = grabFn("pickerKopfSetzen");
pruefe("der Kopf nennt den Weg", kopf.includes('"Einzelne Übung"') && kopf.includes('"Übung hinzufügen"'));
pruefe("und im Einzel-Modus heisst der Knopf Abbrechen (nichts ist gespeichert)",
  kopf.includes('"Abbrechen"') && kopf.includes('"Fertig"'));
pruefe("beim Oeffnen wird der Kopf gestellt", grabFn("uebungPickerOeffnen").includes("pickerKopfSetzen()"));
pruefe("die Karten-Auswahl schliesst im Einzel-Modus ab",
  grabFn("pickerKarteHinzu").includes("if(einzelUebungAbschliessen()) return;"));
pruefe("die Sportart-Rueckfrage ebenso",
  grabFn("pickerSportBestaetigen").includes("if(einzelUebungAbschliessen()) return;"));
pruefe("und eine selbst geschriebene Uebung auch",
  grabFn("eigeneErstellen").includes("if(einzelUebungAbschliessen()) return;"));
pruefe("der Editor-Weg setzt den Modus zurueck",
  grabFn("planAnlegen").includes("uebungEinzelModus = false") &&
  grabFn("editorOeffnen").includes("uebungEinzelModus = false"));

/* ---------- 6) Die Beschriftung ---------- */
pruefe("die Nav-Leiste sagt Uebungen", /<\/svg><\/span>Übungen<\/button>/.test(src));
pruefe("der Titel der Ansicht ebenso", src.includes('<h1 id="plaene-titel">Übungen</h1>'));
pruefe("auf Stufe 1/2 bleibt es der Notizblock",
  grabFn("notizblockKopfSetzen").includes('einfach ? "Notizblock" : "Übungen"'));
pruefe("der Verweis von Heute traegt dasselbe Wort", src.includes(">Zu den Übungen</button>"));
pruefe("der Leer-Zustand nennt keine Plan-Art mehr", liste.includes("Noch nichts angelegt."));

/* ---------- 7) Der Ersatz zuerst, das Entfernen zuletzt ---------- */
pruefe("der Assistent steht in dieser Etappe NOCH im Menue",
  A.planNeuWege(5, ["kraft"]).includes("assistent"));
pruefe("und seine Ansicht ist unangetastet",
  src.includes('id="view-wizard"') && src.includes("const WIZARD_FRAGEN"));
pruefe("planSichern meldet ohne Angabe weiterhin Plan gespeichert",
  grabFn("planSichern").includes('meldungText || "Plan gespeichert"'));

/* ---------- 8) Version ---------- */
pruefe("APP_VERSION steht genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("und ist mindestens 192",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 192);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
