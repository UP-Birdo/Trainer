/* v198-Test: der Notizblock der Stufe 1 besteht aus ECHTEN ZEILEN
   (47. Runde, Punkt B — „die Checkbox gehoert IN die Zeile des Freitextes").

   Der Wunsch wurde zweimal umgangen, weil eine Textarea keine Knoepfe zwischen
   ihren Zeilen tragen kann (v174 legte sie darunter, v185 darueber). Jetzt hat
   jede Zeile ihr eigenes Feld — und der Umbau darf die beiden Zusagen nicht
   kosten, die den Block ausmachen:

   1. AUTOKORREKTUR (v155): Beim Verlassen wird die Zeile aufgeraeumt, geparst
      wird weiterhin mit `abschnittTextSetzen` — EINE Deutung, egal ob der Text
      aus einem Feld kommt oder aus vielen.
   2. VORSCHLAEGE (v157): Sie haengen jetzt an der Zeile; der Feldinhalt IST die
      Zeile, die Cursor-Rechnung ist entfallen.

   Dazu das, was ein Block koennen muss: Enter legt die naechste Zeile an, die
   Ruecktaste in einer leeren Zeile nimmt sie weg, unten wartet immer eine freie
   Zeile — und das Feld, in dem gerade getippt wird, wird nie angefasst.
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
  grabFn("zahlKurz"),
  grabFn("uebungAlsZeile"),
  grabFn("notizZeilenModell"),
  grabFn("abschnittTextErzeugen"),
  "module.exports = { notizZeilenModell, abschnittTextErzeugen, uebungAlsZeile };"
].join("\n"))(modul, modul.exports);
const { notizZeilenModell, abschnittTextErzeugen } = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

function u(name, extra){
  return Object.assign({ id:"u-" + name, name, modus:"wdh", saetze:3, wdh:10,
                         gewicht:0, dauer:30 }, extra || {});
}

/* ---------- 1) Das Zeilen-Modell ---------- */
const plan = { id:"p1", uebungen:[u("Kniebeugen"), u("Plank", { modus:"zeit", dauer:45 })],
               freitext:"" };
const zeilen = notizZeilenModell(plan);
pruefe("je Uebung eine Zeile", zeilen.length === 2);
pruefe("die Zeile traegt die Muster-Fassung", zeilen[0].text === "Sätze 3 Wdh 10 Kniebeugen");
pruefe("Zeit-Uebungen bleiben Zeit-Uebungen", zeilen[1].text === "Sätze 3 Zeit 45 Plank");
pruefe("jede Zeile kennt ihre Uebung", zeilen[0].uebung.name === "Kniebeugen");
pruefe("das Gewicht steht mit in der Zeile (v172)",
  notizZeilenModell({ uebungen:[u("Bankdrücken", { gewicht:82.5 })] })[0].text
    === "Sätze 3 Wdh 10 Bankdrücken 82,5 kg");

/* Namenlose Zeilen sind keine Uebung — sie bekommen deshalb auch keinen Haken. */
pruefe("namenlose Uebungen stehen nicht im Block",
  notizZeilenModell({ uebungen:[u(""), u("  ")] }).length === 0);

/* Freitext (nur noch doppelte Namen und Altbestand) steht dahinter, OHNE Haken —
   raten waere unehrlich, und abhaken kann man nur, was eine Uebung ist. */
const mitText = notizZeilenModell({ uebungen:[u("Dips")], freitext:"war anstrengend\n\nmorgen mehr" });
pruefe("der Freitext steht hinter den Uebungen", mitText.length === 3);
pruefe("er behaelt seinen Wortlaut", mitText[1].text === "war anstrengend");
pruefe("Leerzeilen fallen weg (sie waren nur Optik)", mitText[2].text === "morgen mehr");
pruefe("eine Freitext-Zeile ist keine Uebung", mitText[1].uebung === null);
pruefe("ohne Uebungen und ohne Text bleibt der Block leer",
  notizZeilenModell({ uebungen:[], freitext:"" }).length === 0);
pruefe("ein Plan ohne Felder stuerzt nicht ab", notizZeilenModell({}).length === 0);

/* ---------- 2) Zeilen-Sicht und Text-Sicht sind DIESELBE Aufstellung ---------- */
pruefe("der Text ist das zusammengefuegte Modell",
  abschnittTextErzeugen(plan) === zeilen.map(z => z.text).join("\n"));
pruefe("und er baut nachweislich darauf auf",
  grabFn("abschnittTextErzeugen").includes("notizZeilenModell(p)"));
pruefe("mit Freitext gilt dasselbe",
  abschnittTextErzeugen({ uebungen:[u("Dips")], freitext:"notiz" })
    === "Sätze 3 Wdh 10 Dips\nnotiz");

/* ---------- 3) Die Zeile im Bild ---------- */
const zeileHtml = grabFn("notizZeileHtml");
const iHaken = zeileHtml.indexOf("notizHakenHtml(p, z.uebung)");
const iFeld = zeileHtml.indexOf('class="notiz-feld"');
/* Beide Teile MUESSEN da sein — sonst wuerde ein fehlender Haken (Index -1)
   die Reihenfolge-Pruefung von selbst bestehen. */
pruefe("Haken und Feld sind beide da", iHaken > 0 && iFeld > 0);
pruefe("der Haken steht vor dem Feld", iHaken > 0 && iHaken < iFeld);
pruefe("ohne Uebung steht dort nur der Platzhalter",
  zeileHtml.includes('<span class="notiz-kopf-haken"></span>'));
pruefe("der Feldinhalt ist maskiert (kein HTML aus Nutzertext)",
  zeileHtml.includes('value="\' + text(z.text) + \'"'));
pruefe("der Hinweistext steht nur in der leeren Zeile",
  zeileHtml.includes('(z.text ? "" : \' placeholder='));
pruefe("Tippen, Tasten, Verlassen und Speichern haengen an der Zeile",
  zeileHtml.includes('oninput="notizZeileTippen(this)"') &&
  zeileHtml.includes("onkeydown=\"notizZeileTaste(event, this,") &&
  zeileHtml.includes('onblur="notizVorschlaegeSchliessen(this)"') &&
  zeileHtml.includes("onchange=\"notizZeilenSpeichern(this,"));
/* v212: Der Block gehoert nicht mehr zu EINEM Abschnitt — Stufe 1 zeichnet alle
   Zeilen flach in einen Block (`notizFlachHtml`). Die Zusagen selbst gelten
   unveraendert: ein eigener Behaelter, am Ende immer eine freie Zeile. */
const blockHtml = grabFn("notizFlachHtml");
pruefe("der Block ist ein eigener Behaelter", blockHtml.includes('class="notiz-block"'));
pruefe("am Ende wartet immer eine freie Zeile",
  blockHtml.includes('notizZeileHtml(null, { text:"", uebung:null })'));
pruefe("es gibt ein Stylesheet dafuer",
  /\.notiz-block\{/.test(src) && /\.notiz-reihe-feld\{/.test(src));
pruefe("die Textarea ist verschwunden", !/class="notiz-text"/.test(src));

/* ---------- 4) Speichern: EIN Parser, nicht zwei ---------- */
const speichern = grabFn("notizZeilenSpeichern");
/* v212: Gesammelt wird ueber `data-plan` statt ueber die Karte — in der flachen
   Liste liegen die Zeilen aller Abschnitte in derselben Karte. */
pruefe("gespeichert werden die Zeilen GENAU dieses Abschnitts",
  speichern.includes("notizReihenVon(planId)") &&
  speichern.includes('r.querySelector(".notiz-feld")'));
pruefe("zusammengefuegt mit Zeilenumbruch", speichern.includes('felder.map(f => f.value).join("\\n")'));
pruefe("geparst wird mit dem bekannten Parser", speichern.includes("abschnittTextSetzen(planId,"));
pruefe("danach wird abgeglichen", speichern.includes("notizZeilenAbgleichen(planId)"));
pruefe("der Parser selbst ist unveraendert geblieben",
  grabFn("abschnittTextSetzen").includes("notizZeileDeuten(t)"));

/* ---------- 5) Der Abgleich fasst das aktive Feld nicht an ---------- */
const abgleich = grabFn("notizZeilenAbgleichen");
pruefe("nur gefuellte Zeilen werden zugeordnet",
  abgleich.includes('r.querySelector(".notiz-feld").value.trim()'));
pruefe("das Feld unter dem Finger bleibt unberuehrt",
  abgleich.includes("f !== document.activeElement"));
pruefe("die uebrigen bekommen die aufgeraeumte Fassung",
  abgleich.includes("f.value = zeilen[i].text"));
pruefe("die Haken werden nachgezogen",
  abgleich.includes("notizHakenHtml(p, zeilen[i].uebung)"));
/* Ein Haken, der sich nicht aendert, darf nicht ersetzt werden — sonst ginge
   ein Tipp auf den Haken der Nachbarzeile verloren (der Knopf unter dem Finger
   waere schon ausgetauscht, bevor der Klick ankommt). */
pruefe("unveraenderte Haken bleiben stehen",
  abgleich.includes("if(slot && slot.innerHTML !== neu)"));
pruefe("geht die Zuordnung nicht auf, wird sicher neu gezeichnet",
  /if\(gefuellt\.length !== zeilen\.length\)\{ notizblockZeichnen\(\); return; \}/.test(abgleich));
pruefe("am Ende steht wieder eine freie Zeile",
  abgleich.includes('insertAdjacentHTML("beforeend"'));

/* ---------- 6) Enter und Ruecktaste ---------- */
const taste = grabFn("notizZeileTaste");
pruefe("Enter legt keine Zeile aus dem Nichts an",
  /if\(!feld\.value\.trim\(\)\) return;/.test(taste));
pruefe("Enter schliesst die Zeile ab (Speichern ueber onchange)",
  taste.includes("feld.blur()"));
pruefe("und springt in die naechste, notfalls neue Zeile",
  taste.includes("notizZeileFokus(planId, i + 1, true)"));
pruefe("die Ruecktaste raeumt nur LEERE Zeilen weg",
  taste.includes('ev.key === "Backspace" && !feld.value'));
pruefe("die erste Zeile bleibt dabei stehen", /if\(i <= 0\) return;/.test(taste));
pruefe("danach steht der Cursor in der Zeile davor",
  taste.includes("notizZeileFokus(planId, i - 1, false)"));
/* v212: Das Setzen des Cursors ist nach `notizZeileFokusReihe` herausgeloest —
   die flache Liste springt an zwei Stellen in eine Reihe (Enter und das „+"). */
pruefe("der Cursor landet am Zeilenende",
  grabFn("notizZeileFokusReihe").includes("setSelectionRange(f.value.length, f.value.length)"));
pruefe("und beide Sprung-Wege nutzen dieselbe Stelle",
  grabFn("notizZeileFokus").includes("notizZeileFokusReihe(") &&
  grabFn("notizFreieZeileFokus").includes("notizZeileFokusReihe("));
pruefe("die Position kommt aus dem Bild, nicht aus einer festen Nummer",
  grabFn("notizReihenIndex").includes("[...reihe.parentNode.children].indexOf(reihe)"));

/* ---------- 7) Was NICHT passieren durfte ---------- */
/* Der Verlauf der Stufe 1 (v174) bleibt derselbe: Ein Haken schreibt einen
   ganz normalen Protokoll-Eintrag mit Soll-Saetzen, einen je Abschnitt und Tag. */
const umschalten = grabFn("notizHakenUmschalten");
pruefe("der Haken schreibt weiter ins Protokoll",
  grabFn("notizEintragHolen").includes('quelle: "notizblock"') &&
  umschalten.includes("notizEintragHolen(p, heute)"));
pruefe("und weiter mit Soll-Saetzen", grabFn("notizSaetzeFuer").includes("soll:true"));
/* Leitplanke 8: Stufe 1 fragt nichts und bewertet nichts. */
pruefe("der Block stellt keine Frage",
  !zeileHtml.includes("frage(") && !blockHtml.includes("frage("));
pruefe("und faellt kein Urteil", !zeileHtml.includes("note"));

/* ---------- 8) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v198",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 198);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.198", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
