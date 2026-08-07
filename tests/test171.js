/* v171-Test: Wortwahl im Training/auf Heute + ein ruhigerer Assistent.

   Aus den Persona-Durchgaengen: „Ruhetag" stand als Ueberschrift ueber dem
   Knopf „Als Ruhetag markieren"; der Knopf, der die Uhr anhaelt, hiess in der
   Pause „Pause"; und die eine gelbe Hauptaktion beim Aufwaermen hiess
   „Ueberspringen". Dazu im Assistenten drei Zaehler nebeneinander und eine
   Zusicherung, die nur hinter dem „i" stand.

   Geprueft wird, dass die Worte jetzt zum Zustand passen — und dass sich am
   VERHALTEN nichts geaendert hat (der Aufwaerm-Knopf protokolliert weiterhin
   nichts, er heisst nur anders).
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
function view(id){
  const a = src.indexOf('<section id="' + id + '"');
  if(a < 0) throw new Error("Ansicht nicht gefunden: " + id);
  return src.slice(a, src.indexOf("</section>", a));
}

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const training = view("view-training");
const betreten = grabFn("schrittBetreten");
const pause = grabFn("pauseKnopf");
const haupt = grabFn("hauptKnopf");
const heute = grabFn("heuteKarteZeichnen");
const wz = grabFn("wzZeichnen");

/* ---------- 1) „Anhalten" statt „Pause in der Pause" ---------- */
pruefe("der Knopf heisst im HTML Anhalten", />Anhalten</.test(training));
pruefe("der Ruecksetzer je Schritt setzt Anhalten",
  /pauseK\.textContent = "Anhalten"/.test(betreten));
pruefe("und das Fortsetzen auch", /knopf\.textContent = "Anhalten"/.test(pause));
pruefe("beim Anhalten heisst er Weiter", /knopf\.textContent = "Weiter"/.test(pause));
/* Nur der KNOPF darf nicht mehr „Pause" heissen — die PHASE heisst weiterhin
   so, und das ist dort richtig: Sie ist eine Pause. */
pruefe("der Knopf traegt nirgends mehr den Text Pause",
  !/pauseK\.textContent = "Pause"/.test(src) &&
  !/knopf\.textContent = "Pause"/.test(src) &&
  !/id="pause-knopf"[^>]*>Pause</.test(training));
pruefe("die Phasen-Beschriftung heisst weiterhin Pause",
  /phase\.textContent = "Pause"/.test(betreten));
pruefe("das Verhalten ist unveraendert (Restzeit einfrieren)",
  /restBeiPause = Math\.max\(1/.test(pause) && /lauf\.pausiert = true/.test(pause));

/* ---------- 2) „Fertig" statt „Ueberspringen" beim Bonus ---------- */
pruefe("der Bonus-Schritt beschriftet den Hauptknopf mit Fertig",
  /haupt-knopf"\)\.textContent = "Fertig"/.test(betreten));
pruefe("Ueberspringen ist dort weg",
  !/haupt-knopf"\)\.textContent = "Überspringen"/.test(betreten));
pruefe("der echte Zeit-SATZ heisst weiter ehrlich Satz ueberspringen",
  /knopf\.textContent = "Satz überspringen"/.test(betreten));
pruefe("und protokolliert seine Ist-Zeit weiterhin",
  /satzProtokollieren\(s, begrenzen\(gehalten/.test(haupt));
pruefe("beim Aufwaermen wird weiterhin NICHTS protokolliert",
  /aufwaermen" \|\| s\.typ === "dehnen"\)\{\s*\/\/[^\n]*\n?\s*lauf\.index\+\+; schrittBetreten\(\); return;/
    .test(haupt) ||
  /aufwaermen"[\s\S]{0,160}lauf\.index\+\+; schrittBetreten\(\); return;/.test(haupt));

/* ---------- 3) Ruhetag: Ueberschrift sagt den Zustand ---------- */
pruefe("ohne Markierung heisst die Ueberschrift Kein Plan fuer heute",
  /istRuhe \? "Ruhetag" : "Kein Plan für heute"/.test(heute));
pruefe("der Knopf sagt, was er tut",
  /istRuhe \? "Ruhetag entfernen" : "Bewusst frei nehmen"/.test(heute));
pruefe("der doppelte Untertitel ist weg",
  heute.indexOf("Als Ruhetag markiert.") < 0);
pruefe("die Karte behaelt ihre eine gelbe Hauptaktion",
  (heute.match(/class="primaer breit" onclick="heuteTrainingEintragen/g) || []).length === 1);
/* v216: Das Kalender-Menue hat weiter seine EIGENE Wortwahl (die Heute-Karte
   sagt „Bewusst frei nehmen") — nur heisst der Gegenweg jetzt „streichen" statt
   „entfernen" und gilt auch fuer den automatischen Ruhetag, den man vorher gar
   nicht loswerden konnte. */
pruefe("das Kalender-Menue bleibt bei seiner eigenen, dort eindeutigen Wortwahl",
  /\(istRuhe \|\| istAutoRuhe\) \? "Ruhetag streichen" : "Als Ruhetag markieren"/.test(src));

/* ---------- 4) Assistent: ein Zaehler weniger ---------- */
pruefe("die Fusszeile zaehlt nicht mehr mit",
  /wz-schritt-anzeige"\)\.textContent = ""/.test(wz));
pruefe("und nennt nicht mehr Schritt N von M",
  !/"Schritt " \+ \(wzSchritt \+ 1\)/.test(src));
pruefe("die Punkteleiste bleibt (bildlicher Zaehler)",
  /wz-fortschritt"\)\.innerHTML/.test(wz));
pruefe("die Sportart-Zeile bleibt (sagt etwas Eigenes)",
  /Frage ' \+ stand\.nummer \+ " von " \+ stand\.gesamt/.test(wz));
pruefe("die Zusammenfassung behaelt ihre Beschriftung",
  /wz-schritt-anzeige"\)\.textContent = "Zusammenfassung"/.test(src));

/* ---------- 5) Assistent: sichtbare Zusicherung + Rueckwaerts-Scroll ---------- */
pruefe("die Buehne rendert ein optionales Zusatz-Feld",
  /f\.zusatz \? '<div class="meta wz-zusatz">' \+ text\(f\.zusatz\)/.test(wz));
pruefe("die Geraete-Frage nutzt es",
  /id:"geraete"[\s\S]{0,600}zusatz:"Nichts auszuwählen ist in Ordnung/.test(src));
pruefe("der lange Erklaertext bleibt trotzdem hinter dem i",
  /id:"geraete"[\s\S]{0,600}hilfe:"Mehrfachauswahl/.test(src) &&
  /wz-hilfe" hidden/.test(wz));
pruefe("das Zusatz-Feld ist ein Register-Feld, kein Sonderfall (nur eine Stelle rendert es)",
  (src.match(/wz-zusatz">/g) || []).length === 1);
pruefe("es gibt ein Stylesheet dafuer", /\.wz-zusatz\{/.test(src));
pruefe("jeder Schritt beginnt wieder oben",
  /inhalt\.scrollTop = 0/.test(wz));

/* ---------- 6) Kein Tischtennis ohne Tischtennis ---------- */
/* Gesucht ist der SATZ-Anhang, nicht das Wort — im Kommentar daneben steht
   weiterhin, warum er weg ist. */
pruefe("der Fertig-Dialog nennt kein Beispiel mehr",
  src.indexOf("— auch bei einer Sportart wie Tischtennis") < 0);
pruefe("der Satz selbst bleibt",
  /kannst du jederzeit Übungen ergänzen\./.test(src));

/* ---------- 7) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v171",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 171);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.171", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
