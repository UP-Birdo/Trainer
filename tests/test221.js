/* v221-Test: Der Unendlichkeitsmodus. (60. Runde, Staffel C.)

   Die Zusagen:
   1. KEINE SAETZE, SONDERN RUNDEN. `unendlichRunde` baut EINE Runde (jede Uebung
      einmal, mit ihrer Pause); ist sie durch, haengt der Ablauf die naechste an.
      `satz` traegt die Rundennummer — damit bleibt alles Nachgelagerte gueltig.
   2. DIE UHR BEENDET, NICHT DIE LISTE. Ablauf und Balken rechnen im Modus ueber
      die Zeit; das Dehn-Programm entfaellt, weil es nie drankaeme.
   3. DAS BAND SAGT DIE WAHRHEIT. `zeitStatus` misst gegen die gemessene
      Rundendauer, solange es eine gibt — sonst gegen den Anteil der Restzeit.
   4. NUR GESCHAFFTES ZAEHLT. Am Ende die Abschluss-Seite, kein Bewertungsschirm,
      und `festeWerte` haelt die Progression aus dem Plan heraus.
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
  "const VORBEREITUNG_S = 10;",
  "function zeitAnsage(s){ return s + ' Sekunden'; }",
  grabFn("unendlichRunde"),
  grabFn("zeitStatus"),
  grabFn("satzLabel"),
  "module.exports = { unendlichRunde, zeitStatus, satzLabel };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Eine Runde ---------- */
const plan = { name:"Ganzkörper", reihenfolge:"unendlich", zeitLimit:1200, uebungen:[
  { id:"u1", name:"Liegestütze", modus:"wdh",  wdh:10, gewicht:0,  saetze:3, pause:60 },
  { id:"u2", name:"Kniebeugen",  modus:"wdh",  wdh:15, gewicht:40, saetze:3, pause:0  },
  { id:"u3", name:"Plank",       modus:"zeit", dauer:45, zeitEinheit:"s", saetze:3, pause:30 }
]};
const runde1 = A.unendlichRunde(plan, 1);
/* Zwei Wdh-Uebungen (je 1 Schritt) + eine Zeit-Uebung (bereit + satz) + 3 Pausen. */
pruefe("die Runde hat einen Schritt je Uebung plus Pausen", runde1.length === 7);
pruefe("die Satz-Zahl des Plans spielt keine Rolle",
  runde1.filter(s => s.typ === "satz-wdh").length === 2);
pruefe("die Reihenfolge ist die der Liste",
  runde1[0].uebungIndex === 0 && runde1[2].uebungIndex === 1 && runde1[4].uebungIndex === 2);
pruefe("die Zeit-Uebung bekommt ihr Bereitmachen",
  runde1[4].typ === "bereit" && runde1[5].typ === "satz-zeit" && runde1[5].sekunden === 45);
pruefe("jede Uebung bringt ihre eigene Pause mit",
  runde1[1].sekunden === 60 && runde1[3].sekunden === 0 && runde1[6].sekunden === 30);
/* `satz` ist die RUNDE — daran haengt alles Nachgelagerte (Protokoll, Volumen). */
pruefe("satz traegt die Rundennummer", runde1.every(s => s.typ === "pause" || s.satz === 1));
const runde4 = A.unendlichRunde(plan, 4);
pruefe("die vierte Runde traegt die 4", runde4[0].satz === 4);
pruefe("und sagt sie auch an", runde4[0].ansage.indexOf("Runde 4") > 0);
pruefe("die Ansage nennt Gewicht, wenn es eines gibt",
  runde4[2].ansage.indexOf("40 Kilo") > 0 && runde4[0].ansage.indexOf("Kilo") < 0);
pruefe("ein Plan ohne Uebungen ergibt keine Runde",
  A.unendlichRunde({ uebungen:[] }, 1).length === 0 && A.unendlichRunde({}, 1).length === 0);

/* ---------- 2) Das Band ---------- */
/* Ohne gemessene Runde: der Anteil der Restzeit entscheidet. */
pruefe("viel Restzeit ist gruen", A.zeitStatus(600, 1200, 0).stufe === "gut");
pruefe("ein Drittel ist die Grenze zu gelb",
  A.zeitStatus(400, 1200, 0).stufe === "gut" && A.zeitStatus(399, 1200, 0).stufe === "knapp");
pruefe("ein Zehntel ist die Grenze zu rot",
  A.zeitStatus(120, 1200, 0).stufe === "knapp" && A.zeitStatus(119, 1200, 0).stufe === "eile");
/* Mit gemessener Runde: passt noch eine ganze Runde? */
pruefe("zwei Runden Luft sind gruen", A.zeitStatus(400, 1200, 180).stufe === "gut");
pruefe("etwa eine Runde ist gelb", A.zeitStatus(200, 1200, 180).stufe === "knapp");
pruefe("weniger als eine Runde ist rot", A.zeitStatus(170, 1200, 180).stufe === "eile");
/* Die Messung schlaegt den Anteil — sonst waere sie wertlos. */
pruefe("die gemessene Runde hat Vorrang vor dem Anteil",
  A.zeitStatus(500, 1200, 400).stufe === "knapp" && A.zeitStatus(500, 1200, 0).stufe === "gut");
pruefe("abgelaufen ist immer rot", A.zeitStatus(0, 1200, 999).stufe === "eile");
pruefe("jede Stufe hat Text UND Ansage",
  ["gut","knapp","eile"].every(st => {
    const r = [A.zeitStatus(1000,1200,0), A.zeitStatus(300,1200,0), A.zeitStatus(10,1200,0)]
      .find(x => x.stufe === st);
    return r && r.text.length > 0 && r.ansage.length > 0;
  }));
pruefe("kaputte Werte werfen nicht",
  A.zeitStatus(null, null, null).stufe === "eile" && A.zeitStatus("x", "y", "z").stufe === "eile");

/* ---------- 3) Die Beschriftung ---------- */
pruefe("im Modus zaehlt die Runde", A.satzLabel({ satz:3 }, { saetze:5 }, true) === "Runde 3");
pruefe("sonst bleibt es der Satz von N", A.satzLabel({ satz:3 }, { saetze:5 }, false) === "Satz 3 von 5");

/* ---------- 4) Verdrahtung: Ablauf ---------- */
const erzeugen = grabFn("ablaufErzeugen");
pruefe("der Ablauf kennt den dritten Modus", erzeugen.includes("unendlichRunde(plan, 1)"));
/* Dehnen haengt hinter dem Kern — der endet hier nie. */
pruefe("das Dehn-Programm bleibt im Modus draussen",
  /if\(plan\.dehnen && !unendlich\)/.test(erzeugen));
const betreten = grabFn("schrittBetreten");
pruefe("am Ende der Liste kommt die naechste Runde",
  betreten.includes("unendlichLaeuft() && naechsteRundeAnhaengen()"));
const anhaengen = grabFn("naechsteRundeAnhaengen");
pruefe("ein Plan ohne Uebungen bricht die Schleife ab",
  anhaengen.includes("if(!naechste.length) return false"));
pruefe("die Rundendauer wird dabei gemessen", anhaengen.includes("lauf.rundeSekunden"));
pruefe("und die neue Runde angesagt", anhaengen.includes('sprich("Runde "'));

/* ---------- 5) Verdrahtung: Zeit und Ende ---------- */
pruefe("das Band haengt am Sekunden-Takt",
  grabFn("gesamtUhrZeichnen").includes("zeitbandZeichnen()"));
const band = grabFn("zeitbandZeichnen");
pruefe("es ist nur im Modus sichtbar", band.includes("if(!unendlichLaeuft())"));
pruefe("die Stimme meldet nur den WECHSEL", band.includes("if(lauf.zeitStufe == null)"));
pruefe("bei 0 ist Schluss", band.includes("if(rest <= 0) zeitAbgelaufen()"));
const ende = grabFn("zeitAbgelaufen");
pruefe("das Ende loest nur einmal aus", ende.includes("if(!lauf || lauf.zeitVorbei) return"));
pruefe("es traegt ueber dieselbe Form ein wie jedes Training",
  ende.includes("trainingsEintrag(plan, saetze"));
pruefe("ohne einen fertigen Satz wird nichts geschrieben", /if\(saetze\.length\)\{/.test(ende));
pruefe("alles Abgeleitete zieht mit", ende.includes("fortschrittNeuZeichnen()"));
pruefe("es fuehrt auf die Abschluss-Seite, nicht in die Bewertung",
  ende.includes("abschlussZeigen(") && !ende.includes("bewertungOeffnen("));
pruefe("die Ansicht gibt es", src.includes('id="view-abschluss"'));
pruefe("sie ist ab Stufe 3 erlaubt (wie das Training selbst)", /"view-abschluss": 3/.test(src));
pruefe("die Abschluss-Seite zaehlt nur ECHTE Saetze",
  grabFn("abschlussZeigen").includes("echteSaetze(eintrag)"));
/* Der Balken misst im Modus die Zeit, nicht die Schritte. */
pruefe("der Balken rechnet im Modus ueber die Uhr",
  grabFn("gesamtBalkenZeichnen").includes("if(unendlichLaeuft())"));
pruefe("und beschriftet sich mit der Runde",
  grabFn("gesamtBalkenZeichnen").includes('"Runde " + (lauf.runde || 1)'));
/* Die Uhr ueberlebt eine Unterbrechung. */
pruefe("der Merker sichert die Zeit mit", grabFn("trainingSichern").includes("zeitEnde: lauf.zeitEnde"));

/* ---------- 6) Verdrahtung: Editor und Datenvertrag ---------- */
pruefe("der dritte Knopf steht neben den anderen", src.includes('id="rf-unendlich"'));
const rfSetzen = grabFn("reihenfolgeSetzen");
pruefe("der Modus bringt eine Zeitvorgabe mit", rfSetzen.includes("ZEIT_LIMIT_STANDARD"));
pruefe("und schaltet feste Werte an", rfSetzen.includes("editorPlan.festeWerte = true"));
pruefe("die Zeit wird in SEKUNDEN abgelegt",
  grabFn("zeitLimitSetzen").includes("inSekunden("));
pruefe("der Schritt rechnet ueber Sekunden, nicht ueber den Anzeigewert",
  grabFn("zeitLimitStufe").includes("e.schritt * e.faktor"));
pruefe("die Einheit aendert nur die Anzeige",
  !grabFn("zeitLimitEinheitSetzen").includes("zeitLimit ="));
pruefe("feste Werte lassen sich im Modus nicht abschalten",
  grabFn("festeWerteUmschalten").includes('reihenfolge === "unendlich") return'));
pruefe("beim Speichern wird die Zeit geklemmt",
  grabFn("editorSpeichern").includes("begrenzen(Math.round(editorPlan.zeitLimit || ZEIT_LIMIT_STANDARD), 60, MAX_DAUER_S)"));
/* Additiver Datenvertrag: alte Plaene bekommen die Felder nachgeruestet. */
const nach = grabFn("datenNachruesten");
pruefe("alte Plaene bekommen zeitLimit", nach.includes("p.zeitLimit = 0"));
pruefe("alte Plaene bekommen die Einheit", nach.includes('p.zeitLimitEinheit = "min"'));
pruefe("alte Plaene bekommen festeWerte", nach.includes("p.festeWerte = false"));

/* ---------- 7) Feste Werte halten den Plan an ---------- */
const anwenden = grabFn("bewertungAnwenden");
pruefe("die Progression fragt nach festeWerte", anwenden.includes("if(plan && !festeWerte)"));
pruefe("auch die Ziele bleiben dann unberuehrt",
  anwenden.includes("(plan && !festeWerte) ? kraftZieleAnwenden(plan) : []"));
/* Die Noten wandern trotzdem ins Protokoll — bewertet wird weiter. */
pruefe("die Noten werden weiterhin gespeichert",
  anwenden.includes("s.note = bewertung[s.uebungId]"));

/* ---------- 8) Anzeige ---------- */
pruefe("die geschaetzte Dauer ist im Modus die Vorgabe",
  grabFn("dauerSchaetzen").includes('plan.reihenfolge === "unendlich" && plan.zeitLimit > 0'));
pruefe("die Vorschau schaltet den Modus nicht um",
  grabFn("vorschauZeichnen").includes('document.getElementById("vs-rf-block").hidden = unendlich'));
pruefe("die Strichliste waechst mit dem Geschafften",
  grabFn("strichlisteZeichnen").includes('reihenfolge === "unendlich"'));
pruefe("die vierte Akzentfarbe ist definiert", /--ok:#[0-9A-Fa-f]{6}/.test(src));
pruefe("und auch im hellen Modus", (src.match(/--ok:#[0-9A-Fa-f]{6}/g) || []).length >= 2);
pruefe("das Band hat drei Stufen im Stylesheet",
  src.includes(".zeitband.gut") && src.includes(".zeitband.knapp") && src.includes(".zeitband.eile"));

/* ---------- 9) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v221",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 221);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.221", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
