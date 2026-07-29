/* v170-Test: der Erstnutzer-Weg — Anmeldung, Registrierung, Code.

   Aus dem Persona-Durchgang „Martina": Der allererste Bildschirm nach der
   Willkommens-Seite bot ihr als gelbe Hauptaktion „Sicherung wiederherstellen"
   an — sie hat keine Sicherung. Und das Geschlecht stand auf „männlich"
   vorgewählt, was still in die Startgewichte einfliesst.

   Geprueft wird:
   1. Es gibt genau EINEN Weg zurueck ins alte Konto (vorher zwei Namen,
      derselbe Aufruf) — und die gelbe Hauptaktion haengt an der Kontenlage.
   2. Das Geschlecht ist Pflicht: keine Vorauswahl im Formular, und
      `kontoAnlegen` bricht ab, bevor es rechnet. In die DATEN kommt weiterhin
      nur m/w/d (additiver Datenvertrag).
   3. Der Code laesst sich kopieren — mit ehrlicher Meldung, wenn nicht.
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
/** Den Abschnitt einer Ansicht ausschneiden — fuer Struktur-Zusagen im HTML. */
function view(id){
  const a = src.indexOf('<section id="' + id + '"');
  if(a < 0) throw new Error("Ansicht nicht gefunden: " + id);
  return src.slice(a, src.indexOf("</section>", a));
}

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const login = view("view-login");
const codeView = view("view-code");
const zeichnen = grabFn("loginZeichnen");
const anlegen = grabFn("kontoAnlegen");

/* ---------- 1) Genau ein Weg zurueck ins alte Konto ---------- */
const importAufrufe = (login.match(/import-datei'\)\.click\(\)/g) || []).length;
pruefe("die Sicherung wird aus der Ansicht genau einmal angestossen", importAufrufe === 1);
pruefe("und aus dem Renderer gar nicht mehr",
  zeichnen.indexOf("import-datei") < 0);
pruefe("der Knopf sagt, wozu er fuehrt (Konto)",
  /id="import-knopf"[^>]*>[^<]*Konto[^<]*Sicherung/.test(login));
pruefe("der alte Doppelname ist weg",
  login.indexOf(">Sicherung importieren<") < 0);
/* Der Zweig „noch kein Konto" — genau bis zum else. Dort darf kein Knopf mehr
   stehen; die Aktionen liegen fest im HTML darunter. */
const leerZweig = zeichnen.slice(zeichnen.indexOf("konten.length === 0"),
                                 zeichnen.indexOf("} else {"));
pruefe("der Leer-Zustand traegt keinen eigenen Knopf mehr",
  leerZweig.indexOf("<button") < 0);
pruefe("der Leer-Zustand sagt trotzdem, woran man ist",
  zeichnen.indexOf("Noch kein Konto auf diesem Ger") >= 0);

/* ---------- 2) Die gelbe Hauptaktion folgt der Kontenlage ---------- */
pruefe("der Neu-Knopf wird beim Zeichnen eingefaerbt",
  /neu-knopf"\)\.className\s*=/.test(zeichnen));
pruefe("leeres Geraet -> primaer",
  /konten\.length === 0 \? "primaer breit" : "breit"/.test(zeichnen));
pruefe("der Neu-Knopf traegt im HTML keine feste Farbe",
  /id="neu-knopf"/.test(login) && !/class="primaer[^"]*"[^>]*id="neu-knopf"/.test(login));
/* Genau eine gelbe Hauptaktion je Zustand: In der Ansicht selbst duerfen nur
   die Formular-Knoepfe primaer sein (Anmelden / Zuruecksetzen / Konto anlegen)
   — die liegen in eigenen, jeweils allein sichtbaren Karten. */
const primaerImLogin = (login.match(/class="primaer"/g) || []).length;
pruefe("die drei Formular-Hauptaktionen bleiben unveraendert", primaerImLogin === 3);

/* ---------- 3) Geschlecht ist Pflicht ---------- */
pruefe("das Feld startet ohne Vorauswahl",
  /<select id="neu-geschlecht">\s*<option value="">/.test(login));
pruefe("die leere Wahl heisst verstaendlich",
  /<option value="">bitte w/.test(login));
pruefe("die drei echten Werte bleiben",
  ["m","w","d"].every(v => login.indexOf('<option value="' + v + '">') >= 0));
pruefe("kontoAnlegen liest das Feld vor der Pruefung",
  /const geschlecht = document\.getElementById\("neu-geschlecht"\)\.value/.test(anlegen));
pruefe("und bricht bei leerer Wahl ab",
  /if\(geschlecht === ""\)\{[\s\S]{0,200}return;/.test(anlegen));
pruefe("der Abbruch steht VOR dem Erzeugen der Schluessel",
  anlegen.indexOf('geschlecht === ""') < anlegen.indexOf("dkErzeugen()"));
pruefe("die Meldung sagt, warum es gebraucht wird",
  /Startgewichte/.test(anlegen.slice(anlegen.indexOf('geschlecht === ""'),
                                     anlegen.indexOf('geschlecht === ""') + 300)));
pruefe("gespeichert wird der gewaehlte Wert, nichts Erfundenes",
  /geschlecht\s*\n?\s*\};/.test(anlegen) || /geschlecht,/.test(anlegen));
pruefe("das Profil-Formular behaelt seinen Alt-Fallback (Bestandskonten)",
  /profil-geschlecht"\)\.value = d\.profil\.geschlecht \|\| "m"/.test(src));

/* ---------- 4) Code kopieren ---------- */
pruefe("es gibt einen Kopier-Knopf im Code-Bildschirm",
  /codeKopieren\(\)/.test(codeView));
pruefe("er ist NICHT die gelbe Hauptaktion",
  !/class="primaer"[^>]*onclick="codeKopieren/.test(codeView));
pruefe("die gelbe Hauptaktion bleibt das Bestaetigen",
  /class="primaer" onclick="codeBestaetigen\(\)"/.test(codeView));
const kopieren = grabFn("codeKopieren");
pruefe("die moderne Zwischenablage wird zuerst versucht",
  /navigator\.clipboard/.test(kopieren));
pruefe("es gibt einen Rueckfallweg fuer HTTP/aeltere Browser",
  /codeKopierenAlt/.test(kopieren) && /function codeKopierenAlt\(/.test(src));
pruefe("scheitert beides, sagt die App es ehrlich",
  /meldung\(/.test(kopieren) && /von Hand/.test(kopieren));
pruefe("ohne Code passiert nichts",
  /wert === "–"/.test(kopieren) || /wert === '–'/.test(kopieren));
const alt = grabFn("codeKopierenAlt");
pruefe("der Rueckfallweg raeumt sein Hilfsfeld wieder weg",
  /removeChild\(feld\)/.test(alt));
pruefe("und wirft nie", /try \{/.test(alt) && /catch\(e\)\{ return false; \}/.test(alt));
pruefe("iOS braucht setSelectionRange, nicht nur select",
  /setSelectionRange\(0, wert\.length\)/.test(alt));

/* ---------- 5) Typografie ---------- */
pruefe("kein ASCII-Apostroph mehr in Los gehts",
  src.indexOf("Los geht's") < 0 && (src.match(/Los geht’s/g) || []).length >= 2);

/* ---------- 6) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v170",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 170);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.170", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
