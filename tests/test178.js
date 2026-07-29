/* v178-Test: Der Assistent fragt die Sportarten nur noch beim ersten Mal.

   Nutzer-Wunsch: „Beim Wizard soll nur am Anfang die Frage kommen, welche
   Sportarten machst du. Sobald du deine eingestellt hast, soll die Frage beim
   Plan-Assistenten nicht nochmal aufkommen — dort soll dann einfach gefragt
   werden, für welche deiner Sportarten du einen Plan möchtest."

   Beim Bauen kam ein stiller Fehler mit heraus: Der Assistent ueberschrieb am
   Ende `einrichtung.sportarten` mit seiner Auswahl — wer dort etwas abwaehlte,
   verlor es aus dem PROFIL. Deshalb prueft diese Datei vor allem die Trennung:

   1. Ersteinrichtung BESTIMMT die Sportarten, der Plan-Assistent WAEHLT aus.
   2. Der Assistent nimmt dem Profil nie eine Sportart weg.
   3. Bestandskonten werden nicht noch einmal gefragt (Nachruestung).
   4. Der Weg zu einer neuen Sportart bleibt offen (kein Sackgassen-Bildschirm).
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

const modul = { exports: {} };
new Function("module", "exports", [
  "let wzSportartenGesetzt = false;",
  grabLiteral("SPORTARTEN"),
  grabLiteral("WOCHENTAGE"),
  grabLiteral("SPORT_UEBUNGEN", "{"),
  grabFn("sportUebungen"),
  grabFn("zahlKurz"),
  grabFn("kraftGewaehlt"),
  grabFn("sportartenSchonGesetzt"),
  grabLiteral("WIZARD_FRAGEN"),
  "module.exports = { sportartenSchonGesetzt, WIZARD_FRAGEN, SPORTARTEN," +
  " setzeGesetzt: v => { wzSportartenGesetzt = v; } };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Bestandskonten werden nicht noch einmal gefragt ---------- */
pruefe("ein frisches Konto hat noch nichts bestimmt",
  A.sportartenSchonGesetzt({ sportarten:["kraft"] }) === false);
pruefe("ganz ohne Einrichtung auch nicht",
  A.sportartenSchonGesetzt({}) === false && A.sportartenSchonGesetzt(null) === false);
pruefe("wer den Assistenten durchlaufen hat, hat bestimmt (Ort)",
  A.sportartenSchonGesetzt({ sportarten:["kraft"], ort:"gym" }) === true);
pruefe("desgleichen ueber die Erfahrung",
  A.sportartenSchonGesetzt({ sportarten:["kraft"], erfahrung:"anfaenger" }) === true);
pruefe("mehr als eine Sportart heisst: selbst gewaehlt",
  A.sportartenSchonGesetzt({ sportarten:["kraft","laufen"] }) === true);
pruefe("eine ANDERE als die Vorgabe auch",
  A.sportartenSchonGesetzt({ sportarten:["laufen"] }) === true);
pruefe("gar keine Sportart ist keine Bestimmung",
  A.sportartenSchonGesetzt({ sportarten:[] }) === false);
/* Bewusst KEIN Beleg: vorhandene Plaene. Ein Notizblock-Nutzer hat Abschnitte
   (= Plaene), aber nie eine Sportart gewaehlt. */
pruefe("vorhandene Plaene sind kein Beleg",
  !/plaene/i.test(grabFn("sportartenSchonGesetzt")));

/* ---------- 2) Zwei Fassungen derselben Frage ---------- */
const fragen = A.WIZARD_FRAGEN.filter(f => f.id === "sportarten");
pruefe("es gibt genau zwei Fassungen", fragen.length === 2);
pruefe("beide schreiben dieselbe Antwort", fragen.every(f => f.id === "sportarten"));
pruefe("beide haben eine Bedingung", fragen.every(f => typeof f.nurWenn === "function"));
A.setzeGesetzt(false);
const ersteinrichtung = fragen.filter(f => f.nurWenn({}));
pruefe("beim ersten Mal ist genau EINE sichtbar", ersteinrichtung.length === 1);
pruefe("und zwar die, die nach den Sportarten fragt",
  /Welche Sportarten machst du/.test(ersteinrichtung[0].frage));
pruefe("sie bietet ALLE Sportarten an",
  ersteinrichtung[0].optionen.length === A.SPORTARTEN.length);
pruefe("sie ist NICHT auf die eigenen beschraenkt", !ersteinrichtung[0].nurEigene);
A.setzeGesetzt(true);
const spaeter = fragen.filter(f => f.nurWenn({}));
pruefe("danach ist genau die ANDERE sichtbar", spaeter.length === 1);
pruefe("und sie fragt nach dem Plan, nicht nach den Sportarten",
  /Plan/.test(spaeter[0].frage) && !/Welche Sportarten machst du/.test(spaeter[0].frage));
/* v181 hat diese v178-Entscheidung KORRIGIERT (Nutzer-Ansage): Der Assistent
   zeigt wieder ALLE Sportarten — die Auswahl kann dem Profil seither nur noch
   etwas hinzufuegen, also braucht es keine Beschraenkung mehr. */
pruefe("sie zeigt wieder alle Sportarten", spaeter[0].optionen.length === A.SPORTARTEN.length);
pruefe("die Beschraenkung aus v178 ist weg", !spaeter[0].nurEigene);
pruefe("sie sagt sichtbar, dass Abwaehlen nichts entfernt",
  /Profil/.test(spaeter[0].hilfe) && /entfernt nichts/.test(spaeter[0].hilfe));
pruefe("und traegt den Einzeiler aus v171", typeof spaeter[0].zusatz === "string");
pruefe("nie sind beide gleichzeitig sichtbar",
  [true, false].every(v => { A.setzeGesetzt(v); return fragen.filter(f => f.nurWenn({})).length === 1; }));

/* ---------- 3) Der Assistent nimmt dem Profil nichts weg ---------- */
const fertig = grabFn("plaeneErstellen");
/* v181: Die Rolle steht jetzt in `nurErgaenzen` — sie entscheidet fuer
   Sportarten UND Geraete gemeinsam, nicht mehr nur fuer die Sportarten. */
pruefe("die Profil-Sportarten haengen an der Rolle des Assistenten",
  /const nurErgaenzen = wzSportartenGesetzt;/.test(fertig) &&
  /const profilSportarten = nurErgaenzen/.test(fertig));
/* v181: aus „uebernimmt die bestehenden" wurde „vereinigt beide" — der
   Assistent darf seither auch etwas HINZUFUEGEN, nur nichts wegnehmen. */
pruefe("als Plan-Assistent nimmt er dem Profil nichts weg",
  /vereinigt\(altEinr\.sportarten \|\| \[\], einrichtung\.sportarten\)/.test(fertig));
pruefe("nur die Ersteinrichtung bestimmt sie aus seiner Auswahl",
  /: einrichtung\.sportarten\.slice\(\)/.test(fertig));
pruefe("danach ist die Frage fuer immer beantwortet",
  /sportartenGesetzt: true/.test(fertig));

/* ---------- 4) Alte Assistenten-Plaene: nur die betroffenen ---------- */
pruefe("betroffen sind nur Plaene der GEWAEHLTEN Sportarten",
  /p\.quelle === "assistent" && einrichtung\.sportarten\.includes\(p\.sportart\)/.test(fertig));
pruefe("die Rueckfrage und das Loeschen nutzen dieselbe Regel",
  (fertig.match(/betrifft/g) || []).length >= 3);
pruefe("selbst gebaute Plaene bleiben in jedem Fall",
  /Selbst gebaute Pläne bleiben in jedem Fall erhalten/.test(fertig));

/* ---------- 5) Der Weg zu einer neuen Sportart ----------
   v181: Der Knopf „Andere Sportart einrichten" ist ENTFALLEN — er loeste ein
   Problem, das es nicht mehr gibt: Der Assistent zeigt wieder alle Sportarten,
   man tippt die neue einfach an. Was bleibt, ist die Zusage dahinter: Der Weg
   zu einer neuen Sportart ist keine Sackgasse. */
pruefe("der Knopf ist restlos entfernt", src.indexOf("andereSportartAusWizard") < 0);
pruefe("stattdessen steht jede Sportart in der Auswahl",
  spaeter[0].optionen.length === A.SPORTARTEN.length);
const zurueck = grabFn("sportartenTabZurueck");
pruefe("und der Assistenten-Rueckweg ist mit ihm verschwunden",
  zurueck.indexOf('"wizard"') < 0);
pruefe("der Editor-Rueckweg aus v90 bleibt", /if\(ziel === "editor"\)/.test(zurueck));
pruefe("ohne Ziel landet man im Profil", /profilOeffnen\(\);/.test(zurueck));
pruefe("das Ziel wird beim Zuruecklaufen geraeumt", /sportartenRueckweg = null;/.test(zurueck));
/* Aus dem Ja/Nein-Merker ist ein benanntes Ziel geworden — zwei Booleans
   nebeneinander koennten beide gleichzeitig gesetzt sein. */
pruefe("der alte Boolean ist restlos ersetzt", src.indexOf("sportartenZurueckEditor") < 0);
/* ---------- 6) Die Auswahl zeichnet wieder schlicht aus dem Register ---------- */
const zeichnen = grabFn("wzZeichnen");
pruefe("die Optionen kommen unveraendert aus der Frage",
  /optionenHtml = f\.optionen\.map/.test(zeichnen));
pruefe("die Sonderbehandlung aus v178 ist weg", zeichnen.indexOf("nurEigene") < 0);
pruefe("die Geraete-Frage baut ihre Optionen weiter zur Laufzeit",
  /f\.dynamisch/.test(zeichnen));

/* ---------- 7) Das Feld ist additiv und wird nachgeruestet ---------- */
const nach = src.slice(src.indexOf("function datenNachruesten"));
pruefe("die Nachruestung setzt es nur, wenn es fehlt",
  /if\(typeof daten\.einrichtung\.sportartenGesetzt !== "boolean"\)/.test(nach));
pruefe("und leitet es fuer Bestandskonten ab",
  /daten\.einrichtung\.sportartenGesetzt = sportartenSchonGesetzt\(daten\.einrichtung\)/.test(nach));
pruefe("die Sportart-Seite setzt es beim An- und Abwaehlen",
  /sitzung\.daten\.einrichtung\.sportartenGesetzt = true;/.test(grabFn("sportartNutzenUmschalten")));
pruefe("der Assistent merkt sich seine Rolle beim OEFFNEN, nicht je Frage",
  /wzSportartenGesetzt = alt\.sportartenGesetzt === true;/.test(grabFn("einrichtungOeffnen")));

/* ---------- 8) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v178",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 178);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.178", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
