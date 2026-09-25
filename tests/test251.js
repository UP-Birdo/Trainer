/* UPCrew-Standard (Apps\UPCrew-STANDARD.md, 09/2026) — die Wache.

   Der Trainer gehoert seit 25.09.2026 zu UPCrew. Dieser Test haelt fest, was
   davon schon umgesetzt ist, damit es nicht leise zurueckwaechst:

   1. Formen: genau drei Rundungen (--rund-klein/-mittel/-voll, Werte aus
      Typoluck 0.4.0), JEDE Rundung im Code verweist auf sie.
   2. Schatten: keine weichen Standardschatten mehr. Erlaubt sind nur die
      harte Kante (--kante*), der Auswahl-Ring (--ring), none und
      Innen-Ringe ohne Unschaerfe.
   3. Text: keine Begruessungen, hoechstens die Stimme darf ein Ausrufezeichen.

   4. Leer und Fehler: EIN Baustein (zustandLeerHtml, fehlerZeigen).
   5. Das UPCrew-Intro — ohne Konto, ohne Netz (der Trainer bleibt lokal).

   Noch NICHT bewacht (kommt mit dem Bauschritt): die eigene Schrift.
   Vibration gibt es im Trainer nicht (Nutzer, 25.09.2026).
   Hinweis: in Test-LABELS keine typografischen Anfuehrungszeichen (Haus-Falle). */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const css = src.slice(src.indexOf("<style>"), src.indexOf("</style>"));
const wurzel = /:root\{([\s\S]*?)\n\}/.exec(css)[1];
const hell = /html\.hell\{([\s\S]*?)\n\}/.exec(css)[1];

/* ---------- 1) Die drei Rundungen ---------- */
pruefe("--rund-klein ist 8px", /--rund-klein:8px;/.test(wurzel));
pruefe("--rund-mittel ist 14px", /--rund-mittel:14px;/.test(wurzel));
pruefe("--rund-voll ist 999px", /--rund-voll:999px;/.test(wurzel));
pruefe("die Kartentiefe ist 3px", /--karte-tiefe:3px;/.test(wurzel));

/* Jede Rundung in der GANZEN Datei (Stylesheet UND Inline-Stile im JS).
   Erlaubt: 0 und Kombinationen aus 0 und den drei Variablen. */
const rundungen = [...src.matchAll(/border-radius\s*:\s*([^;}"]+)/g)].map(m => m[1].trim());
const fremdeRundungen = rundungen.filter(w =>
  !w.split(/\s+/).every(teil => teil === "0" || /^var\(--rund-(klein|mittel|voll)\)$/.test(teil)));
pruefe("es gibt ueberhaupt Rundungen (Test greift)", rundungen.length > 40);
pruefe("jede Rundung verweist auf eine Variable (gefunden: " + fremdeRundungen.join(" | ") + ")",
  fremdeRundungen.length === 0);
pruefe("niemand setzt Rundungen per JS-Eigenschaft", !/\.borderRadius\s*=/.test(src));

/* ---------- 2) Harte Kante statt weicher Schatten ---------- */
pruefe("die alten weichen Schatten-Variablen sind weg", !/--shadow-/.test(src));
pruefe("die Kante ist ohne Unschaerfe gebaut",
  /--kante:0 var\(--karte-tiefe\) 0 var\(--kante-still\);/.test(wurzel));
pruefe("die Knopf-Kante ist ohne Unschaerfe gebaut",
  /--kante-knopf:0 var\(--knopf-tiefe\) 0 var\(--kante-still\);/.test(wurzel));
pruefe("der helle Modus hat eigene Kantenfarben",
  /--kante-still:/.test(hell) && /--kante-haupt:/.test(hell));

const schatten = [...src.matchAll(/box-shadow\s*:\s*([^;}]+)/g)].map(m => m[1].trim());
const erlaubt = w =>
  w === "none" ||
  /^var\(--(kante|kante-hervor|kante-knopf|kante-knopf-haupt|ring)\)$/.test(w) ||
  /^inset 0 0 0 \d+px /.test(w);            // Innen-Ring: kein Versatz, keine Unschaerfe
const weiche = schatten.filter(w => !erlaubt(w));
pruefe("es gibt ueberhaupt Schatten (Test greift)", schatten.length > 20);
pruefe("kein weicher Schatten (gefunden: " + weiche.join(" | ") + ")", weiche.length === 0);

/* Das Anfass-Gefuehl: gedrueckt sinkt der Knopf auf die Kante. */
pruefe("gedrueckte Knoepfe sinken auf ihre Kante",
  css.includes("button:active:not(:disabled){transform:translateY(var(--knopf-tiefe));box-shadow:none}"));
pruefe("die Hauptaktion traegt die gelbe Kante",
  css.includes("button.primaer{background:var(--signal);color:#0F1114;box-shadow:var(--kante-knopf-haupt)}"));
/* Flache Knoepfe ohne eigene Flaeche bekommen KEINE Kante — eine dunkle Linie
   unter einem durchsichtigen Knopf saehe aus wie ein Darstellungsfehler. */
[
  ["#nav button", /#nav button\{[^}]*box-shadow:none/],
  ["button.gefahr", /button\.gefahr\{[^}]*box-shadow:none/],
  [".info-knopf", /\.info-knopf\{[^}]*box-shadow:none/],
  [".schliessen-knopf", /\.schließen-knopf\{[^}]*box-shadow:none/],
  [".muskel-tab", /\.muskel-tab\{[^}]*box-shadow:none/],
  [".art-schalter button", /\.art-schalter button\{[^}]*box-shadow:none/],
  [".umschalter button", /\.umschalter button\{[^}]*box-shadow:none/]
].forEach(([name, re]) => pruefe("flacher Knopf ohne Kante: " + name, re.test(css)));

/* ---------- 3) Text: keine Floskeln ---------- */
/* Sichtbare Texte stehen hinter einem Anfuehrungszeichen oder hinter ">" —
   Kommentare ("Willkommens-Seite", "view-willkommen") fallen damit heraus. */
pruefe("keine Begruessung mit Willkommen", !/["'>“]\s*Willkommen\b/.test(src));
pruefe("keine Begruessung mit Hallo", !/["'>“]\s*Hallo\b/.test(src));
/* Ausrufezeichen in Texten: nur die Stimme darf (sprich(...) — die bleibt laut
   Standard allein beim Trainer). Alles auf dem Bildschirm kommt ohne aus. */
const ausrufe = [...src.matchAll(/[A-Za-zäöüß]!["“”'<]/g)]
  .filter(m => !src.slice(Math.max(0, m.index - 200), m.index).includes("sprich("));
pruefe("kein Ausrufezeichen in Bildschirm-Texten (gefunden: " +
  ausrufe.map(m => src.slice(m.index - 30, m.index + 2).replace(/\s+/g, " ")).join(" | ") + ")",
  ausrufe.length === 0);

/* ---------- 3b) Schrift nur ueber die Variable (Standard Abschnitt 1) ----------
   Kommt die UPCrew-Schrift, wird sie an EINER Stelle eingetragen. Erlaubt sind
   im Stylesheet deshalb nur die Variable, die Zahlen-Schrift und „erben". */
const schriften = [...css.matchAll(/font-family\s*:\s*([^;}]+)/g)].map(m => m[1].trim());
const fremdeSchriften = schriften.filter(w => !["var(--schrift-familie)", "var(--mono)", "inherit"].includes(w));
pruefe("die Schrift steht als Variable in :root", /--schrift-familie:[^;]*sans-serif;/.test(wurzel));
pruefe("der Koerper nutzt die Variable", /body\{[^}]*font-family:var\(--schrift-familie\)/.test(css));
pruefe("keine Schrift ausserhalb der Variablen (gefunden: " + fremdeSchriften.join(" | ") + ")",
  fremdeSchriften.length === 0);

/* ---------- 4) Leer und Fehler: EIN Baustein ---------- */
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
function grabObjekt(name){
  const i = src.indexOf("const " + name + " = {");
  let tiefe = 0;
  for(let k = src.indexOf("{", i); k < src.length; k++){
    if(src[k] === "{") tiefe++;
    else if(src[k] === "}"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}
const Z = { exports: {} };
new Function("module", "exports", [
  grabObjekt("ZUSTAND_SYMBOLE"), grabFn("text"), grabFn("zustandLeerHtml"),
  "module.exports = { zustandLeerHtml, ZUSTAND_SYMBOLE };"
].join("\n"))(Z, Z.exports);
const leer = Z.exports.zustandLeerHtml({ symbol:"plan", text:"Noch leer", knopf:"Übung eintragen", tun:"x()", haupt:true });
pruefe("der Leer-Zustand traegt Symbol, Kurzwort und Knopf",
  leer.includes("<svg") && leer.includes("<strong>Noch leer</strong>") && leer.includes('onclick="x()"'));
pruefe("die Hauptaktion ist gelb, sonst nicht",
  leer.includes('class="schmal primaer"') &&
  !Z.exports.zustandLeerHtml({ symbol:"ziel", text:"Kein Ziel", knopf:"Ziel anlegen", tun:"y()" }).includes("primaer"));
pruefe("ohne Knopf entsteht auch keiner",
  !Z.exports.zustandLeerHtml({ symbol:"konto", text:"Kein Konto" }).includes("<button"));
pruefe("Texte werden escaped (v119-Regel)",
  !Z.exports.zustandLeerHtml({ symbol:"plan", text:"<b>x</b>" }).includes("<b>x</b>"));
pruefe("alle Symbole aus einem Satz: runde Enden",
  Object.values(Z.exports.ZUSTAND_SYMBOLE).every(s => s.includes('stroke-linecap="round"')));
/* Die alten Leer-Saetze sind weg — jede Stelle nutzt den Baustein. (Die
   Heute-Karte bei leerem Konto, „Noch nichts angelegt" + EIN Knopf, erfuellt
   den Standard schon: drei Woerter, ein Weg weiter — sie bleibt.) */
["Noch kein Training.", "Noch keine Einträge.", "Der Papierkorb ist leer",
 "Noch kein Konto auf diesem Gerät", "Noch kein Ziel — mit + eines anlegen"]
  .forEach(s => pruefe("alter Leer-Satz weg: " + s, !src.includes(s)));
pruefe("mindestens sieben Stellen nutzen den Baustein",
  (src.match(/zustandLeerHtml\(\{/g) || []).length >= 7);
const fz = grabFn("fehlerZeigen");
pruefe("der Fehler-Baustein bietet Nochmal an", fz.includes('ja.textContent = "Nochmal"'));
pruefe("und stellt die Knopf-Texte danach wieder her", fz.includes("ja.textContent = vorher[0]"));
pruefe("die technische Meldung geht ins Feedback, nicht auf den Schirm",
  fz.includes("letzterFehler =") && grabFn("feedbackSenden").includes("letzterFehler"));
pruefe("keine technische Meldung mehr hinter Speichern fehlgeschlagen",
  !src.includes('"Speichern fehlgeschlagen: " + e.message'));

/* ---------- 5) Das UPCrew-Intro — ohne Konto, ohne Netz ---------- */
const introHtml = src.slice(src.indexOf('<div id="intro"'), src.indexOf("</div>", src.indexOf('<p class="intro-zeile"')));
pruefe("das Intro steht direkt am Anfang des Koerpers",
  src.indexOf('<div id="intro"') > src.indexOf("<body>") &&
  src.indexOf('<div id="intro"') < src.indexOf('<div id="inhalt">'));
pruefe("es zeigt UP, Crew und praesentiert",
  introHtml.includes('class="intro-up">UP<') && introHtml.includes('class="intro-crew">Crew<') &&
  src.includes('<p class="intro-zeile">präsentiert</p>'));
pruefe("einmal je Besuch (derselbe Schluessel wie in Typoluck)",
  (src.match(/upcrew\.intro-gesehen/g) || []).length >= 2);
const intro = grabFn("introStarten");
pruefe("Zeiten wie in Typoluck: 1,8 s stehen, 0,4 s ausblenden",
  /const INTRO_STEHT_MS = 1800;/.test(src) && /const INTRO_AUSBLENDEN_MS = 400;/.test(src) &&
  /\.intro\{[^}]*transition:opacity 400ms/.test(css));
pruefe("ein Tipp und eine Taste ueberspringen",
  intro.includes('el.addEventListener("click", beenden') && intro.includes('addEventListener("keydown", beenden)'));
/* Der Trainer bleibt rein lokal (Nutzer, 25.09.2026): Das Intro laedt nichts,
   meldet nichts an und sendet nichts — und nirgends steht die UPCrew-Datenbank. */
pruefe("das Intro fasst kein Netz an",
  !/fetch\(|XMLHttpRequest|https?:\/\//.test(intro) && !/https?:\/\//.test(introHtml));
pruefe("kein UPCrew-Konto, kein Abgleich im Trainer",
  !src.includes("upcrew-7a29d") && !/UPCrew-Konto/.test(src));
pruefe("das Intro laeuft vor der Willkommens-Seite",
  src.indexOf("introStarten();") > 0 &&
  src.indexOf("introStarten();") < src.indexOf('if(!willkommenGesehen) zeige("view-willkommen");'));
pruefe("die Studio-Farben stehen fest (keine helle Fassung)",
  /--upcrew-grund:#120e1c; --upcrew-farbe:#7a5cf0; --upcrew-schrift:#ffffff;/.test(wurzel) &&
  !/--upcrew-/.test(hell));

/* ---------- 4b) Eingabe-Pruefungen kurz (Text-Inventur 25.09.2026) ----------
   Reine Eingabe-Pruefungen sagen in ein, zwei Woertern, was fehlt — ueber den
   Fehler-Baustein. Erklaerungen und Sicherheitsfragen (Loeschen, Code,
   Sicherungsdatei) behalten ihre Saetze; der Trainer darf das. */
["Bitte ein Gewicht in Kilogramm eingeben.", "Bitte einen Umfang in Zentimetern eingeben.",
 "Das neue Passwort braucht mindestens 8 Zeichen.", "Bitte kurz beschreiben, worum es geht.",
 "Der Plan braucht mindestens eine Übung mit Namen.", "das saß offenbar gut",
 "Lieber geführt? Der Plan-Assistent"]
  .forEach(s => pruefe("langer Satz weg: " + s, !src.includes(s)));
pruefe("die kurzen Fassungen laufen ueber den Fehler-Baustein",
  ['fehlerZeigen("Gewicht fehlt")', 'fehlerZeigen("Mindestens 8 Zeichen")', 'fehlerZeigen("Keine Übung")']
    .every(s => src.includes(s)));

/* ---------- 5b) Keine Vibration im Trainer (Nutzer, 25.09.2026) ----------
   Die Pruefseite pruefen/vibration.html ist wieder entfallen. */
pruefe("keine Vibrations-Pruefseite mehr", !require("fs").existsSync(require("path").join(require("path").dirname(process.argv[2]), "pruefen")));

/* ---------- 6) Version und Neuigkeit ---------- */
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.251.0", punkte:['));
pruefe("die App ist mindestens auf 0.251",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 251000);

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
