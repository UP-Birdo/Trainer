/* v163-Test: Mehrfach-Auswahl in den Listen mit Daten.

   Vier Listen (Koerpergewicht, Koerpermasse, Verlauf, Papierkorb) teilen sich
   EINEN Auswahl-Modus. Das Register LISTEN_TYPEN ist die einzige Stelle, an der
   eine Liste beschrieben wird — der Test laeuft ueber das ECHTE Register, damit
   eine spaeter dazukommende Liste hier sofort mitgeprueft wird.
   Kernzusagen: Rueckfrage vor jedem Loeschen, Rueckgaengig stellt Inhalt UND
   Reihenfolge wieder her, und „Alle" meint nur, was auch sichtbar ist.
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
  const i = src.indexOf("const " + name + " = ");
  if(i < 0) throw new Error("Literal nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf("{", i); k < src.length; k++){
    if(src[k] === "{") tiefe++;
    else if(src[k] === "}"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

/* Umgebung: nur Attrappen fuer alles, was mit dem DOM oder dem Speicher zu tun
   hat. Die Auswahl-Logik selbst kommt unveraendert aus der index.html. */
const umgebung = [
  "let sitzung = { daten:{} };",
  "let koerpermassArt = 'brust';",
  "const gezeichnet = {};",
  "function merkeZeichnen(w){ gezeichnet[w] = (gezeichnet[w] || 0) + 1; }",
  "function gewichtStatistikZeichnen(){ merkeZeichnen('gewicht'); }",
  "function koerpermassZeichnen(){ merkeZeichnen('koerpermass'); }",
  "function verlaufListeZeichnen(){ merkeZeichnen('verlauf'); }",
  "function papierkorbZeichnen(){ merkeZeichnen('papierkorb'); }",
  "function fortschrittNeuZeichnen(){ merkeZeichnen('fortschritt'); }",
  "let gespeichert = 0;",
  "function speichern(){ gespeichert++; }",
  "let antwort = true, letzteFrage = null;",
  "function frage(t, j, rueck){ letzteFrage = t; rueck(antwort); }",
  "const toasts = []; let letzterUndo = null;",
  "function zeigenToast(t, art, undo){ toasts.push(t); letzterUndo = undo || null; }",
  "let korbNr = 0; const korbEintraege = [];",
  "function inPapierkorb(typ, name, daten){ const id = 'k' + (++korbNr); korbEintraege.push({ id, typ, name, daten }); return id; }",
  "function papierkorbEntfernen(id){ const i = korbEintraege.findIndex(x => x.id === id); if(i >= 0) korbEintraege.splice(i, 1); }",
  "function datumKurz(d){ return d; }",
  "let listenAuswahlTyp = null;",
  "const listenAuswahl = new Set();",
  grabFn("text"),
  grabLiteral("LISTEN_TYPEN"),
  grabFn("listenAuswahlText"),
  grabFn("listenKennungen"),
  grabFn("listenAuswahlStarten"),
  grabFn("listenAuswahlBeenden"),
  grabFn("listenAuswahlUmschalten"),
  grabFn("listenAuswahlAlle"),
  grabFn("listenAuswahlLoeschen"),
  grabFn("listenKopfHtml"),
  grabFn("listenZeileHtml"),
  grabFn("listenGrenze"),
  grabFn("listenAuswahlPruefen"),
  "module.exports = { LISTEN_TYPEN, listenAuswahlText, listenKennungen, listenAuswahlStarten," +
  " listenAuswahlBeenden, listenAuswahlUmschalten, listenAuswahlAlle, listenAuswahlLoeschen," +
  " listenKopfHtml, listenZeileHtml, listenGrenze, listenAuswahlPruefen," +
  " zustand: () => ({ typ: listenAuswahlTyp, wahl: [...listenAuswahl], gespeichert, toasts, letzteFrage," +
  "   korbEintraege, gezeichnet, undo: letzterUndo })," +
  " setzeAntwort: w => { antwort = w; }," +
  " setzeArt: a => { koerpermassArt = a; }," +
  " daten: () => sitzung.daten," +
  " setzeDaten: d => { sitzung.daten = d; } };"
].join("\n");

const modul = { exports: {} };
new Function("module", "exports", umgebung)(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/** Frischer Datenbestand vor jedem Abschnitt — die Tests loeschen darin herum. */
function frischeDaten(){
  A.listenAuswahlBeenden();
  A.setzeAntwort(true);
  A.setzeArt("brust");
  A.setzeDaten({
    gewichte: [
      { datum:"2026-01-01", kg:80 }, { datum:"2026-01-08", kg:81 },
      { datum:"2026-01-15", kg:82 }, { datum:"2026-01-22", kg:83 }
    ],
    koerpermasse: [
      { datum:"2026-01-01", art:"brust", wert:100 },
      { datum:"2026-01-08", art:"brust", wert:101 },
      { datum:"2026-01-08", art:"taille", wert:85 }
    ],
    protokoll: [
      { id:"e1", datum:"2026-01-01", plan:"Druck", saetze:[] },
      { id:"e2", datum:"2026-01-03", plan:"Zug",   saetze:[] },
      { datum:"2026-01-04", plan:"Uralt ohne id",  saetze:[] },
      { id:"e3", datum:"2026-01-05", plan:"Beine", saetze:[] }
    ],
    papierkorb: [
      { id:"k1", typ:"plan", name:"Alter Plan" },
      { id:"k2", typ:"eintrag", name:"Altes Training" }
    ]
  });
}

/* ---------- 1) Das Register ist vollstaendig ---------- */
const TYPEN = Object.keys(A.LISTEN_TYPEN);
pruefe("es gibt mindestens die vier Listen mit Daten",
  ["gewicht", "koerpermass", "verlauf", "papierkorb"].every(t => TYPEN.includes(t)));
TYPEN.forEach(typ => {
  const d = A.LISTEN_TYPEN[typ];
  pruefe(typ + ": alle Pflichtfelder vorhanden",
    typeof d.ansicht === "string" && typeof d.ziel === "string" &&
    typeof d.einzahl === "string" && typeof d.mehrzahl === "string" &&
    typeof d.liste === "function" && typeof d.setzen === "function" &&
    typeof d.sichtbar === "function" && typeof d.kennung === "function" &&
    typeof d.zeichnen === "function" &&
    (d.korb === null || typeof d.korb === "function"));
  pruefe(typ + ": Ansicht und Behaelter stehen in der index.html",
    src.includes('id="' + d.ansicht + '"') && src.includes('id="' + d.ziel + '"'));
});
pruefe("keine zwei Listen teilen sich einen Behaelter",
  new Set(TYPEN.map(t => A.LISTEN_TYPEN[t].ziel)).size === TYPEN.length);

/* ---------- 2) Einzahl/Mehrzahl ---------- */
pruefe("1 Eintrag", A.listenAuswahlText("gewicht", 1) === "1 Eintrag");
pruefe("3 Eintraege", A.listenAuswahlText("gewicht", 3) === "3 Einträge");
pruefe("unbekannter Typ wirft nicht", A.listenAuswahlText("gibtsnicht", 2) === "2 Einträge");

/* ---------- 3) Sichtbar ist nur, was auf dem Schirm steht ---------- */
frischeDaten();
pruefe("Gewicht: alle Kennungen", A.listenKennungen("gewicht").length === 4);
pruefe("Koerpermass: nur das gewaehlte Mass",
  A.listenKennungen("koerpermass").join(",") === "brust|2026-01-01,brust|2026-01-08");
A.setzeArt("taille");
pruefe("Koerpermass: nach dem Wechsel das andere Mass",
  A.listenKennungen("koerpermass").join(",") === "taille|2026-01-08");
A.setzeArt("brust");
pruefe("Verlauf: Eintraege ohne id bleiben aussen vor",
  A.listenKennungen("verlauf").join(",") === "e1,e2,e3");
pruefe("Papierkorb: beide Eintraege", A.listenKennungen("papierkorb").join(",") === "k1,k2");

/* ---------- 4) Modus starten, anhaken, beenden ---------- */
frischeDaten();
pruefe("am Anfang ist kein Modus aktiv", A.zustand().typ === null);
A.listenAuswahlStarten("gewicht");
pruefe("Starten setzt den Typ", A.zustand().typ === "gewicht");
pruefe("und haekt nichts vor", A.zustand().wahl.length === 0);
pruefe("und zeichnet die Liste neu", A.zustand().gezeichnet.gewicht > 0);
A.listenAuswahlUmschalten("gewicht", "2026-01-01");
pruefe("Antippen hakt an", A.zustand().wahl.join(",") === "2026-01-01");
A.listenAuswahlUmschalten("gewicht", "2026-01-01");
pruefe("nochmal antippen hakt ab", A.zustand().wahl.length === 0);
A.listenAuswahlUmschalten("verlauf", "e1");
pruefe("eine FREMDE Liste kann nicht mit anhaken", A.zustand().wahl.length === 0);
A.listenAuswahlStarten("gibtsnicht");
pruefe("ein unbekannter Typ startet nichts", A.zustand().typ === "gewicht");
A.listenAuswahlBeenden();
pruefe("Beenden raeumt auf", A.zustand().typ === null && A.zustand().wahl.length === 0);

/* ---------- 5) Alle / Keinen ---------- */
frischeDaten();
A.listenAuswahlStarten("koerpermass");
A.listenAuswahlAlle("koerpermass");
pruefe("Alle haekt genau die sichtbaren an", A.zustand().wahl.length === 2);
pruefe("und nicht das andere Mass", !A.zustand().wahl.some(k => k.indexOf("taille") === 0));
A.listenAuswahlAlle("koerpermass");
pruefe("nochmal gedrueckt hebt die Auswahl auf", A.zustand().wahl.length === 0);
A.listenAuswahlAlle("gewicht");
pruefe("Alle wirkt nur auf die aktive Liste", A.zustand().wahl.length === 0);

/* ---------- 6) Loeschen: erst die Rueckfrage ---------- */
frischeDaten();
A.listenAuswahlStarten("gewicht");
A.listenAuswahlUmschalten("gewicht", "2026-01-01");
A.listenAuswahlUmschalten("gewicht", "2026-01-15");
A.setzeAntwort(false);
A.listenAuswahlLoeschen("gewicht");
pruefe("es wird immer gefragt", (A.zustand().letzteFrage || "").indexOf("2 Einträge") === 0);
pruefe("Nein loescht nichts", A.daten().gewichte.length === 4);
pruefe("und laesst den Modus stehen", A.zustand().typ === "gewicht");

/* ---------- 7) Loeschen: Ja ---------- */
A.setzeAntwort(true);
const vorherGespeichert = A.zustand().gespeichert;
A.listenAuswahlLoeschen("gewicht");
pruefe("Ja loescht genau die gewaehlten",
  A.daten().gewichte.map(e => e.datum).join(",") === "2026-01-08,2026-01-22");
pruefe("und speichert", A.zustand().gespeichert > vorherGespeichert);
pruefe("und beendet den Auswahl-Modus", A.zustand().typ === null);
pruefe("und meldet es als eine Aktion",
  A.zustand().toasts[A.zustand().toasts.length - 1] === "2 Einträge gelöscht");

/* ---------- 8) Rueckgaengig stellt Inhalt UND Reihenfolge her ---------- */
A.zustand().undo();
pruefe("Rueckgaengig holt alles zurueck",
  A.daten().gewichte.map(e => e.datum).join(",") ===
  "2026-01-01,2026-01-08,2026-01-15,2026-01-22");
pruefe("und die Werte stimmen noch",
  A.daten().gewichte.map(e => e.kg).join(",") === "80,81,82,83");

/* ---------- 9) Nichts gewaehlt = nichts tun ---------- */
frischeDaten();
A.listenAuswahlStarten("gewicht");
const frageVorher = A.zustand().letzteFrage;
A.listenAuswahlLoeschen("gewicht");
pruefe("ohne Auswahl kommt keine Rueckfrage", A.zustand().letzteFrage === frageVorher);
pruefe("und nichts verschwindet", A.daten().gewichte.length === 4);

/* ---------- 10) Koerpermass loescht nur das gewaehlte Mass ---------- */
frischeDaten();
A.listenAuswahlStarten("koerpermass");
A.listenAuswahlAlle("koerpermass");
A.listenAuswahlLoeschen("koerpermass");
pruefe("Brust ist weg, Taille bleibt",
  A.daten().koerpermasse.length === 1 && A.daten().koerpermasse[0].art === "taille");

/* ---------- 11) Verlauf wandert in den Papierkorb ---------- */
frischeDaten();
const korbVorher = A.zustand().korbEintraege.length;
A.listenAuswahlStarten("verlauf");
A.listenAuswahlUmschalten("verlauf", "e1");
A.listenAuswahlUmschalten("verlauf", "e3");
A.listenAuswahlLoeschen("verlauf");
pruefe("geloeschte Trainings landen im Papierkorb",
  A.zustand().korbEintraege.length === korbVorher + 2);
pruefe("der Eintrag ohne id bleibt unangetastet",
  A.daten().protokoll.map(e => e.plan).join(",") === "Zug,Uralt ohne id");
pruefe("Flamme und Statistik werden nachgezogen", A.zustand().gezeichnet.fortschritt > 0);
A.zustand().undo();
pruefe("Rueckgaengig holt die Trainings zurueck", A.daten().protokoll.length === 4);
pruefe("und nimmt sie wieder aus dem Papierkorb",
  A.zustand().korbEintraege.length === korbVorher);

/* ---------- 12) Gewicht und Koerpermass NICHT in den Papierkorb ---------- */
frischeDaten();
const korbStand = A.zustand().korbEintraege.length;
A.listenAuswahlStarten("gewicht");
A.listenAuswahlAlle("gewicht");
A.listenAuswahlLoeschen("gewicht");
pruefe("Gewichts-Eintraege gehen nicht in den Papierkorb",
  A.zustand().korbEintraege.length === korbStand);
pruefe("Alle loescht wirklich alle", A.daten().gewichte.length === 0);

/* ---------- 13) Der Papierkorb selbst ---------- */
frischeDaten();
A.listenAuswahlStarten("papierkorb");
A.listenAuswahlAlle("papierkorb");
A.listenAuswahlLoeschen("papierkorb");
pruefe("der Papierkorb laesst sich auf einen Schlag leeren", A.daten().papierkorb.length === 0);
A.zustand().undo();
pruefe("und das laesst sich zuruecknehmen", A.daten().papierkorb.length === 2);

/* ---------- 14) Der Modus endet mit seiner Ansicht ---------- */
frischeDaten();
A.listenAuswahlStarten("verlauf");
A.listenAuswahlPruefen("view-verlauf");
pruefe("in der eigenen Ansicht bleibt er stehen", A.zustand().typ === "verlauf");
A.listenAuswahlPruefen("view-statistik");
pruefe("beim Verlassen endet er", A.zustand().typ === null);
A.listenAuswahlPruefen("view-start");
pruefe("ohne Modus passiert nichts", A.zustand().typ === null);

/* ---------- 15) Die Liste zeigt im Modus alles ---------- */
frischeDaten();
pruefe("normal gilt die Grenze", A.listenGrenze("gewicht", 10) === 10);
A.listenAuswahlStarten("gewicht");
pruefe("im Modus faellt sie weg", A.listenGrenze("gewicht", 10) === Infinity);
pruefe("aber nur fuer die aktive Liste", A.listenGrenze("verlauf", 10) === 10);

/* ---------- 16) Die Zeile bleibt ausserhalb des Modus unveraendert ---------- */
frischeDaten();
pruefe("ohne Modus kommt die Zeile so zurueck, wie sie kam",
  A.listenZeileHtml("gewicht", "2026-01-01", "<div>X</div>") === "<div>X</div>");
A.listenAuswahlStarten("gewicht");
const roh = A.listenZeileHtml("gewicht", "2026-01-01", "<div>X</div>");
pruefe("im Modus steht ein leeres Kaestchen davor", roh.indexOf("☐") > 0);
pruefe("und der Inhalt bleibt drin", roh.indexOf("<div>X</div>") > 0);
pruefe("und ein Tipp hakt an", roh.indexOf("listenAuswahlUmschalten('gewicht','2026-01-01')") > 0);
A.listenAuswahlUmschalten("gewicht", "2026-01-01");
const gehakt = A.listenZeileHtml("gewicht", "2026-01-01", "<div>X</div>");
pruefe("angehakt wird das Kaestchen voll", gehakt.indexOf("☑") > 0);
pruefe("und die Zeile ist markiert", gehakt.indexOf("gewaehlt") > 0);
pruefe("ohne Kennung bleibt die Zeile roh",
  A.listenZeileHtml("gewicht", undefined, "<div>X</div>") === "<div>X</div>" &&
  A.listenZeileHtml("gewicht", null, "<div>X</div>") === "<div>X</div>");
pruefe("eine fremde Liste wird nicht umgebaut",
  A.listenZeileHtml("verlauf", "e1", "<div>X</div>") === "<div>X</div>");

/* ---------- 17) Der Kopf ueber der Liste ---------- */
frischeDaten();
pruefe("ab zwei Eintraegen gibt es den Einstieg",
  A.listenKopfHtml("gewicht").indexOf("listenAuswahlStarten('gewicht')") > 0);
A.setzeDaten(Object.assign(A.daten(), { gewichte:[{ datum:"2026-01-01", kg:80 }] }));
pruefe("bei einem einzigen Eintrag lohnt er nicht", A.listenKopfHtml("gewicht") === "");
frischeDaten();
A.listenAuswahlStarten("gewicht");
const kopfLeer = A.listenKopfHtml("gewicht");
pruefe("im Modus fordert die Leiste zum Antippen auf", kopfLeer.indexOf("Einträge antippen") > 0);
pruefe("ohne Auswahl gibt es keinen Loeschen-Knopf", kopfLeer.indexOf("Löschen (") < 0);
pruefe("Abbrechen geht immer", kopfLeer.indexOf("listenAuswahlBeenden()") > 0);
pruefe("und Alle steht bereit", kopfLeer.indexOf(">Alle<") > 0);
A.listenAuswahlUmschalten("gewicht", "2026-01-01");
pruefe("mit Auswahl zeigt die Leiste die Zahl",
  A.listenKopfHtml("gewicht").indexOf("Löschen (1)") > 0);
A.listenAuswahlAlle("gewicht");
pruefe("ist alles gewaehlt, bietet der Knopf das Gegenteil an",
  A.listenKopfHtml("gewicht").indexOf(">Keinen<") > 0);
pruefe("ein unbekannter Typ liefert nichts", A.listenKopfHtml("gibtsnicht") === "");

/* ---------- 18) Die vier Zeichner nutzen wirklich das gemeinsame Muster ---------- */
const zeichner = [
  ["Gewicht",     "gewichtStatistikZeichnen", "gewicht"],
  ["Koerpermass", "koerpermassZeichnen",      "koerpermass"],
  ["Verlauf",     "verlaufListeZeichnen",     "verlauf"],
  ["Papierkorb",  "papierkorbZeichnen",       "papierkorb"]
];
zeichner.forEach(([was, fn, typ]) => {
  const quelle = grabFn(fn);
  pruefe(was + ": Kopf ueber der Liste", quelle.includes('listenKopfHtml("' + typ + '")'));
  pruefe(was + ": Zeilen im Umschlag", quelle.includes('listenZeileHtml("' + typ + '"'));
});
pruefe("die Gewichts-Liste hebt ihre Zehner-Grenze im Modus auf",
  grabFn("gewichtStatistikZeichnen").includes('listenGrenze("gewicht", 10)'));

/* ---------- 19) Anbindung an den Rest der App ---------- */
pruefe("jeder Ansichtswechsel prueft den Modus",
  grabFn("zeige").includes("listenAuswahlPruefen(id)"));
pruefe("langes Druecken startet die Auswahl",
  grabFn("langdruckEinrichten").includes("listenAuswahlStarten(typ)"));
pruefe("der Mass-Wechsel beendet den Modus",
  grabFn("koerpermassArtSetzen").includes("listenAuswahl.clear()"));
pruefe("Verlauf-Liste und Verlauf-Ansicht sind getrennt",
  grabFn("verlaufOeffnen").includes("verlaufListeZeichnen()"));
pruefe("im Modus sind die Einzel-Knoepfe stumm",
  src.includes(".listen-wahl button{pointer-events:none"));

/* ---------- 20) Version und Neuigkeit ---------- */
pruefe("APP_VERSION steht auf 163", src.includes("const APP_VERSION = 163;"));
pruefe("und die Auto-Update-Erkennung findet sie genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.163", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
