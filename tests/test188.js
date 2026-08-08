/* v188-Test: die WIRKLICHE Pause zwischen den Saetzen wird gemessen und am Satz
   abgelegt (ROADMAP, Belastungs-Modell Gruppe A, Punkt 6 — Teil 1 von 2).

   Die Zusagen:
   1. `gemessenePause` liefert Sekunden oder `null` — nie eine geratene Zahl.
      Ueber der Grenze (Unterbrechung statt Pause) kommt NICHTS.
   2. Der Wert haengt am SCHRITT, nicht am Lauf: Jeder Satz traegt seinen
      eigenen, nichts verrutscht ueber Schritte hinweg.
   3. Der erste Satz einer Uebung hat keine Pause davor und bekommt kein Feld.
   4. Aufwaermsaetze protokollieren weiterhin gar nichts (v135).
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
function grabConst(name){
  const z = new RegExp("^const " + name + "\\s*=\\s*[^;]+;", "m").exec(src);
  if(!z) throw new Error("Konstante nicht gefunden: " + name);
  return z[0];
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabConst("PAUSE_MESS_MAX"),
  grabFn("gemessenePause"),
  // Umgebung fuer satzProtokollieren — nur so viel, wie die Funktion anfasst.
  "let lauf = null;",
  "let getoastet = [];",
  "function zeigenToast(t){ getoastet.push(t); }",
  "function istNeuerRekord(){ return false; }",
  "function bisherigerRekord(){ return null; }",
  "function rekordText(){ return ''; }",
  grabFn("satzProtokollieren"),
  "module.exports = { PAUSE_MESS_MAX, gemessenePause, satzProtokollieren," +
  " setLauf(l){ lauf = l; }, saetze(){ return lauf.saetze; } };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) gemessenePause ---------- */
const T0 = 1000000;
pruefe("60 Sekunden werden zu 60", A.gemessenePause(T0, T0 + 60000) === 60);
pruefe("es wird auf ganze Sekunden gerundet",
  A.gemessenePause(T0, T0 + 44600) === 45 && A.gemessenePause(T0, T0 + 44400) === 44);
pruefe("null Sekunden sind ein gueltiger Wert (sofort weiter)",
  A.gemessenePause(T0, T0) === 0);
pruefe("ohne Start kommt nichts",
  A.gemessenePause(null, T0) === null && A.gemessenePause(undefined, T0) === null);
pruefe("ohne Jetzt kommt nichts", A.gemessenePause(T0, null) === null);
pruefe("Text statt Zahl wirft nicht und liefert nichts",
  A.gemessenePause("1000", T0) === null && A.gemessenePause(T0, "x") === null);
pruefe("NaN und Unendlich liefern nichts",
  A.gemessenePause(NaN, T0) === null && A.gemessenePause(T0, Infinity) === null);
pruefe("eine rueckwaerts laufende Uhr liefert nichts",
  A.gemessenePause(T0, T0 - 5000) === null);

/* Die Grenze: Unterbrechung ist keine Pause. */
pruefe("die Grenze liegt bei 30 Minuten", A.PAUSE_MESS_MAX === 1800);
pruefe("genau an der Grenze wird noch gemessen",
  A.gemessenePause(T0, T0 + 1800 * 1000) === 1800);
pruefe("eine Sekunde darueber liefert nichts",
  A.gemessenePause(T0, T0 + 1801 * 1000) === null);
pruefe("zwei Stunden weggelegt liefert nichts (keine geratene Zahl)",
  A.gemessenePause(T0, T0 + 7200 * 1000) === null);

/* ---------- 2) Der Wert landet am Satz ---------- */
const uebung = { id:"u1", name:"Bankdrücken", modus:"wdh", wdh:10, gewicht:60, saetze:3 };
function neuerLauf(){
  return { plan:{ uebungen:[uebung] }, saetze:[], istWdh:null, istGewicht:null };
}
A.setLauf(neuerLauf());
A.satzProtokollieren({ uebungIndex:0, satz:1 }, null);                       // erster Satz: keine Pause
A.satzProtokollieren({ uebungIndex:0, satz:2, istPause:75 }, null);
A.satzProtokollieren({ uebungIndex:0, satz:3, istPause:0 }, null);
const s = A.saetze();
pruefe("drei Saetze protokolliert", s.length === 3);
pruefe("der erste Satz hat KEIN Pausen-Feld", !("pause" in s[0]));
pruefe("der zweite traegt seine gemessene Pause", s[1].pause === 75);
pruefe("eine Pause von 0 wird abgelegt (nicht als fehlend behandelt)",
  s[2].pause === 0 && "pause" in s[2]);
pruefe("die uebrigen Felder sind unveraendert",
  s[1].uebungId === "u1" && s[1].wdh === 10 && s[1].gewicht === 60 && s[1].satz === 2);

/* Nur echte Zahlen kommen durch — kein "60", kein null, kein undefined. */
A.setLauf(neuerLauf());
A.satzProtokollieren({ uebungIndex:0, satz:1, istPause:"60" }, null);
A.satzProtokollieren({ uebungIndex:0, satz:2, istPause:null }, null);
A.satzProtokollieren({ uebungIndex:0, satz:3, istPause:undefined }, null);
pruefe("Text als Pause wird nicht uebernommen", !("pause" in A.saetze()[0]));
pruefe("null als Pause wird nicht uebernommen", !("pause" in A.saetze()[1]));
pruefe("undefined als Pause wird nicht uebernommen", !("pause" in A.saetze()[2]));

/* v135 bleibt: ein Aufwaermsatz protokolliert gar nichts — auch nicht seine Pause. */
A.setLauf(neuerLauf());
A.satzProtokollieren({ uebungIndex:0, satz:1, rampe:true, istPause:90 }, null);
pruefe("ein Aufwaermsatz erzeugt weiterhin keinen Eintrag (v135)", A.saetze().length === 0);

/* Zeit-Saetze tragen die Pause genauso. */
A.setLauf({ plan:{ uebungen:[{ id:"u2", name:"Plank", modus:"zeit", saetze:2 }] },
            saetze:[], istWdh:null, istGewicht:null });
A.satzProtokollieren({ uebungIndex:0, satz:1, istPause:50 }, 45);
pruefe("ein Zeit-Satz traegt Dauer UND Pause",
  A.saetze()[0].dauer === 45 && A.saetze()[0].pause === 50);

/* ---------- 3) Verdrahtung im Trainingsablauf ---------- */
const betreten = grabFn("schrittBetreten");
pruefe("die Messung startet beim Betreten der Pause",
  /s\.typ === "pause"\)\{\s*\n\s*lauf\.pauseStart = Date\.now\(\);/.test(betreten));
pruefe("sie endet beim Wdh-Satz UND beim Zeit-Satz",
  /if\(s\.typ === "satz-wdh" \|\| s\.typ === "satz-zeit"\)\{/.test(betreten));
pruefe("gerechnet wird mit der reinen Funktion",
  betreten.includes("gemessenePause(lauf.pauseStart, Date.now())"));
pruefe("nur ein echter Wert wird abgelegt",
  /if\(gemessen != null\) s\.istPause = gemessen;/.test(betreten));
pruefe("danach ist keine Pause mehr offen", /lauf\.pauseStart = null;/.test(betreten));
/* Bereitmachen darf die Messung NICHT beenden — es liegt zwischen Pause und
   Satz und ist noch Erholung. */
pruefe("Bereitmachen beendet die Messung nicht",
  !/s\.typ === "bereit"[\s\S]{0,120}pauseStart = null/.test(betreten));
pruefe("die Messung steht vor der Fallunterscheidung (gilt fuer beide Satzarten)",
  betreten.indexOf("gemessenePause(") < betreten.indexOf('s.typ === "aufwaermen"'));

/* Das Feld existiert in beiden Startpunkten eines Laufs.
   v221: Die Fenster mussten wachsen — beide Lauf-Objekte tragen seit dem
   Unendlichkeitsmodus die Felder der zweiten Uhr (zeitEnde, Runde) samt
   Begruendung. Geprueft wird weiterhin dasselbe: `pauseStart` steht in
   BEIDEN Startpunkten und steht dort auf null. */
pruefe("ein neuer Lauf startet ohne offene Pause",
  /schritte:ablaufErzeugen\(plan\)[\s\S]{0,700}pauseStart: null/.test(src));
pruefe("ein fortgesetzter Lauf ebenfalls (Unterbrechung ist keine Pause)",
  /startZeit: stand\.startZeit \|\| Date\.now\(\),[\s\S]{0,1400}pauseStart: null/.test(src));

/* ---------- 4) Sauberkeit ---------- */
pruefe("die geplante Pause am Plan bleibt unangetastet",
  /u\.pause = werte\.pause;/.test(src));
pruefe("das Feld heisst am Satz `pause` und wird additiv gesetzt",
  grabFn("satzProtokollieren").includes("eintrag.pause = schritt.istPause"));
pruefe("die Grenze ist benannt, nicht eingestreut",
  grabFn("gemessenePause").includes("PAUSE_MESS_MAX") &&
  (src.match(/1800;/g) || []).length >= 1);

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v188",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 188);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.188", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
