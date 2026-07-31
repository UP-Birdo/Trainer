/* v193-Test: drei Nutzer-Ansagen aus der 51. Runde, alle rund um die
   Uebungs-Entscheidung.

   1. „Beispielplan laden und Plan mit Assistent erst mal raus aus den Menues —
      dort soll nur Plan erstellen oder Uebung eintragen stehen."
      -> Das „+" hat genau zwei Eintraege. Entfernt heisst NICHT geloescht:
      Assistent und Beispielplan stehen unter „Mehr -> Werkzeuge", der Assistent
      zusaetzlich in der Ersteinrichtung.
   2. „Einzelne Uebung hinzufuegen soll Filter bekommen pro Sportart und darunter
      Geraet … und Laufen gibt es nicht als Uebung."
      -> Sportart-Filter, darunter Geraet/Art; die Sportart selbst ist als ganze
      Einheit waehlbar (nur im Einzel-Modus).
   3. „Bei Plaenen mit nur einer Uebung ein Schalter im Kopf, der zwischen Plan
      und Uebung umschaltet."
      -> `planArtUmschaltbar` + `editorArtSetzen`; umgeschaltet wird NUR der
      Termin, die Uebung bleibt unangetastet.
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
  // Laufen traegt intervall:true wie in SPORTARTEN — daran haengt der Intervall-Weg.
  "const SPORTARTEN = [{ id:'kraft', name:'Krafttraining' }," +
  " { id:'laufen', name:'Laufen', intervall:true, strecke:{ einheit:'km', start:5 } }," +
  " { id:'yoga', name:'Yoga' }];",
  "function sportart(id){ return SPORTARTEN.find(s => s.id === id) || {}; }",
  "function sportartName(id){ return (sportart(id).name) || id; }",
  "function planTypFuer(id){ return id === 'kraft' ? 'kraft' : 'aktivitaet'; }",
  "let uebungEinzelModus = false;",
  "let editorPlan = null;",
  "let pickerFilter = { sport:'alle', kat:'alle', geraet:'alle', art:'alle' };",
  "let suchText = '';",
  "const spur = { toast:null, gezeichnet:0 };",
  "function zeigenToast(t){ spur.toast = t; }",
  "function editorZeichnen(){ spur.gezeichnet++; }",
  "let editorEinstOffen = false;",
  "function normName(s){ return String(s || '').toLowerCase(); }",
  "function getElementById(){ return null; }",
  "const document = { getElementById };",
  "const sitzung = { daten: { einrichtung: { sportarten:['kraft','laufen'], dauer_laufen:2700, strecke_laufen:8 } } };",
  grabFn("planArt"),
  grabFn("planArtUmschaltbar"),
  grabFn("planNeuWege"),
  grabFn("pickerSportKontext"),
  grabFn("sportEinheitVorgabe"),
  grabFn("pickerEinheitKandidaten"),
  grabFn("editorArtSetzen"),
  "module.exports = { planArt, planArtUmschaltbar, planNeuWege, pickerSportKontext," +
  " sportEinheitVorgabe, pickerEinheitKandidaten, editorArtSetzen, spur, sitzung," +
  " setPlan: p => { editorPlan = p; }, holePlan: () => editorPlan," +
  " setModus: v => { uebungEinzelModus = v; }," +
  " setFilter: f => { pickerFilter = f; }," +
  " einstOffen: () => editorEinstOffen };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Aus dem Plus-Menue sind GENAU ZWEI Wege heraus ----------
   v194 (Korrektur des Nutzers): Entfernt wurden Assistent und Beispielplan —
   sonst nichts. Der Intervall-Weg bleibt und haengt weiter an seiner Bedingung
   (nur mit Intervall-Sportart im Profil, v118). */
pruefe("Kraft allein: Uebung + eigener Plan",
  A.planNeuWege(5, ["kraft"]).join(",") === "uebung,eigen");
pruefe("die Uebung steht an erster Stelle", A.planNeuWege(5, ["kraft"])[0] === "uebung");
pruefe("weder Assistent noch Beispielplan, auf keiner Stufe",
  [1,3,4,5].every(s => {
    const w = A.planNeuWege(s, ["kraft","laufen"]);
    return !w.includes("assistent") && !w.includes("beispiel");
  }));
pruefe("der Intervall-Weg ist geblieben",
  A.planNeuWege(5, ["laufen"]).includes("intervall"));
pruefe("und bleibt an seine Sportarten gebunden",
  !A.planNeuWege(5, ["kraft"]).includes("intervall") &&
  !A.planNeuWege(5, []).includes("intervall"));
pruefe("ohne Sportarten faellt nichts um",
  A.planNeuWege(5, []).join(",") === "uebung,eigen" &&
  A.planNeuWege(5).join(",") === "uebung,eigen");

/* Entfernt heisst nicht geloescht — beide Wege leben weiter. */
pruefe("der Assistent steht unter Mehr -> Werkzeuge",
  src.includes('id="mehr-assistent-karte"') && src.includes('onclick="einrichtungOeffnen()">Assistent starten'));
pruefe("der Beispielplan steht dort ebenfalls",
  src.includes('id="mehr-beispiel-knopf"') && src.includes('onclick="beispielLaden()"'));
const werkzeuge = grabFn("einstWerkzeugeOeffnen");
pruefe("der Assistent bleibt an Stufe 5 gebunden", werkzeuge.includes("stufe() >= 5"));
pruefe("der Beispielplan bleibt an Krafttraining gebunden", werkzeuge.includes('includes("kraft")'));
pruefe("und eine leere Karte zeigt niemand",
  werkzeuge.includes('setzen("mehr-assistent-karte", mitAssistent || mitBeispiel)'));
pruefe("der Beispielplan fuehrt jetzt auch in die Liste",
  grabFn("beispielLaden").includes('zeige("view-plaene")'));
/* v203 (Nutzer-Entscheidung): Die Ersteinrichtung ruft den Assistenten NICHT
   mehr — sie fuehrt ab Stufe 3 direkt in die Uebungs-Auswahl. Damit ist Etappe 3
   abgeschlossen. Geloescht ist er deshalb nicht (siehe Pruefung darunter): Er
   bleibt unter „Mehr -> Werkzeuge" und funktioniert unveraendert. */
pruefe("die Ersteinrichtung ruft den Assistenten nicht mehr",
  !src.includes("if(n >= 5) einrichtungOeffnen();") &&
  !grabFn("erstenWegOeffnen").includes("einrichtungOeffnen"));
pruefe("der Assistent bleibt trotzdem aufrufbar",
  (src.match(/einrichtungOeffnen\(\)/g) || []).length >= 1);
pruefe("und die Wizard-Ansicht ist unangetastet",
  src.includes('id="view-wizard"') && src.includes("const WIZARD_FRAGEN"));
/* Kein Weg darf nur noch ins Leere zeigen. */
pruefe("Heute bewirbt den Assistenten nicht mehr",
  !grabFn("heuteKarteZeichnen").includes("einrichtungOeffnen()"));

/* ---------- 2) Filter nach Sportart, darunter Geraet ---------- */
A.setPlan({ sportart:"", typ:"", uebungen:[] });
A.setFilter({ sport:"alle", kat:"alle", geraet:"alle", art:"alle" });
pruefe("ohne Wahl gibt es keinen Sport-Kontext", A.pickerSportKontext() === null);
A.setFilter({ sport:"laufen", kat:"alle", geraet:"alle", art:"alle" });
pruefe("der Filter setzt den Kontext", A.pickerSportKontext() === "laufen");
A.setPlan({ sportart:"kraft", typ:"kraft", uebungen:[] });
pruefe("die Sportart des Plans schlaegt den Filter", A.pickerSportKontext() === "kraft");
const filterHtml = grabFn("pickerFilterHtml");
pruefe("die Sportart-Reihe steht ueber den anderen", /kopf = reihe\("Sportart"/.test(filterHtml));
pruefe("bei nur einer Profil-Sportart bleibt sie weg", filterHtml.includes("meine.length < 2"));
pruefe("die Kandidaten kennen den Filter-Kontext",
  grabFn("pickerKandidaten").includes("pickerSportKontext()"));

/* ---------- 3) Die Sportart als ganze Einheit („Laufen") ---------- */
A.setPlan({ sportart:"", typ:"", uebungen:[] });
A.setFilter({ sport:"alle", kat:"alle", geraet:"alle", art:"alle" });
A.setModus(false);
pruefe("im Editor-Weg gibt es keine ganzen Einheiten", A.pickerEinheitKandidaten().length === 0);
A.setModus(true);
const einheiten = A.pickerEinheitKandidaten();
pruefe("im Einzel-Modus schon", einheiten.length === 1);
pruefe("Krafttraining ist keine ganze Einheit (es misst Saetze)",
  !einheiten.some(s => s.id === "kraft"));
pruefe("Laufen dagegen schon", einheiten.some(s => s.id === "laufen"));
A.setFilter({ sport:"kraft", kat:"alle", geraet:"alle", art:"alle" });
pruefe("der Sportart-Filter greift auch hier", A.pickerEinheitKandidaten().length === 0);
A.setFilter({ sport:"alle", kat:"alle", geraet:"alle", art:"alle" });

/* Die Vorgabe kommt aus dem Profil, nicht aus einer erfundenen Zahl. */
const v = A.sportEinheitVorgabe("laufen", A.sitzung.daten.einrichtung);
pruefe("Dauer aus dem Profil", v.dauer === 2700);
pruefe("Strecke aus dem Profil", v.strecke === 8);
const leer = A.sportEinheitVorgabe("laufen", {});
pruefe("ohne Profil-Wert der Startwert der Sportart", leer.strecke === 5 && leer.dauer === 1800);
pruefe("ohne Streckenmass bleibt die Strecke 0", A.sportEinheitVorgabe("yoga", {}).strecke === 0);
pruefe("kaputte Werte fallen auf den Rueckfall zurueck",
  A.sportEinheitVorgabe("laufen", { dauer_laufen:0, strecke_laufen:-3 }).dauer === 1800);
pruefe("das Anlegen laeuft ueber den gemeinsamen Abschluss",
  grabFn("pickerEinheitWaehlen").includes("einzelUebungAbschliessen()"));
pruefe("und nur im Einzel-Modus", grabFn("pickerEinheitWaehlen").includes("if(!uebungEinzelModus) return;"));
pruefe("der Abschluss kennt die Einheit ohne Uebung",
  grabFn("einzelUebungAbschliessen").includes('editorPlan.typ === "aktivitaet"'));

/* ---------- 4) Der Umschalter Uebung <-> Plan ---------- */
pruefe("eine einzelne Uebung ist umschaltbar",
  A.planArtUmschaltbar({ uebungen:[{ name:"Klimmzuege" }], tage:[] }) === true);
pruefe("eine Ausdauer-Einheit auch",
  A.planArtUmschaltbar({ typ:"aktivitaet", uebungen:[], tage:[] }) === true);
pruefe("ein Buendel aus zwei Uebungen nicht",
  A.planArtUmschaltbar({ uebungen:[{ name:"A" }, { name:"B" }], tage:[] }) === false);
pruefe("ein leerer Kraft-Plan auch nicht",
  A.planArtUmschaltbar({ typ:"kraft", uebungen:[], tage:[] }) === false);
pruefe("kein Plan uebergeben faellt nicht um", A.planArtUmschaltbar(null) === false);

/* Zu Uebung machen: der Termin faellt weg, die Uebung bleibt. */
A.setPlan({ id:"p1", name:"Klimmzuege", typ:"kraft", uebungen:[{ name:"Klimmzuege", saetze:3 }],
            tage:[1,4], einzelTermine:["2026-08-01"], wochenTakt:2 });
A.editorArtSetzen("uebung");
pruefe("die Wochentage sind weg", A.holePlan().tage.length === 0);
pruefe("die Einzeltermine auch", A.holePlan().einzelTermine.length === 0);
pruefe("die Uebung ist unangetastet", A.holePlan().uebungen.length === 1 && A.holePlan().uebungen[0].saetze === 3);
pruefe("der Takt bleibt fuer den Rueckweg stehen", A.holePlan().wochenTakt === 2);
pruefe("und es ist jetzt eine Uebung", A.planArt(A.holePlan()) === "uebung");

/* Zu Plan machen: nichts wird gesetzt, aber der Weg zum Tag wird gezeigt. */
A.spur.toast = null;
A.editorArtSetzen("plan");
pruefe("die Einstellungen klappen auf", A.einstOffen() === true);
pruefe("ohne Tag sagt die App, was noch fehlt", /Wochentag/.test(A.spur.toast || ""));
pruefe("und rat nichts zusammen", A.holePlan().tage.length === 0);
A.setPlan({ id:"p2", name:"Ganzkoerper", typ:"kraft",
            uebungen:[{ name:"A" }, { name:"B" }], tage:[2] });
const vorher = JSON.stringify(A.holePlan());
A.editorArtSetzen("uebung");
pruefe("ein Buendel laesst sich nicht heimlich umschalten", JSON.stringify(A.holePlan()) === vorher);

/* Verdrahtung im Kopf. */
pruefe("der Schalter steht im Editor-Kopf", src.includes('id="editor-art"'));
pruefe("er hat beide Segmente",
  src.includes("editorArtSetzen('uebung')") && src.includes("editorArtSetzen('plan')"));
pruefe("er wird bei jedem Zeichnen gestellt", grabFn("editorZeichnen").includes("editorArtZeichnen()"));
const artZeichnen = grabFn("editorArtZeichnen");
pruefe("und ist nur sichtbar, wo die Umwandlung geht", artZeichnen.includes("planArtUmschaltbar(editorPlan)"));
pruefe("der Titel wechselt mit", artZeichnen.includes('"Übung bearbeiten"') && artZeichnen.includes('"Plan bearbeiten"'));
pruefe("es gibt eine Stil-Regel dafuer", src.includes(".art-schalter{"));

/* ---------- 5) Version ---------- */
pruefe("APP_VERSION steht genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("und ist mindestens 193",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 193);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
