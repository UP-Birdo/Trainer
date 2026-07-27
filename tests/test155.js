/* v155-Test: Notizblock aufgeraeumt + Autokorrektur der Zeilen.
   Kern ist `notizZeileDeuten` — sie versteht neben dem ausdruecklichen Muster
   jetzt die Kurzform „Name 3 10" in jeder Reihenfolge und dreht die Zahlen
   richtig herum. Dazu: „Getan" und das „i" sind weg, das Feld bekommt die
   aufgeraeumte Fassung zurueck.
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
  const zeile = src.split("\n").find(z => z.trim().startsWith("const " + name + " ="));
  if(!zeile) throw new Error("Konstante nicht gefunden: " + name);
  return zeile.trim();
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabConst("NOTIZ_MUSTER"),
  grabConst("NOTIZ_PAAR"),
  grabFn("notizZeileDeuten"),
  "module.exports = { notizZeileDeuten };"
].join("\n"))(modul, modul.exports);
const deuten = modul.exports.notizZeileDeuten;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------- 1) Das ausdrueckliche Muster bleibt unveraendert ---------- */
pruefe("Muster mit Wdh",
  gleich(deuten("Sätze 2 Wdh 20 Liegestütze"), { name:"Liegestütze", saetze:2, modus:"wdh", wert:20 }));
pruefe("Muster mit Zeit",
  gleich(deuten("Sätze 3 Zeit 45 Plank"), { name:"Plank", saetze:3, modus:"zeit", wert:45 }));
pruefe("Muster ohne Umlaut und klein geschrieben",
  gleich(deuten("saetze 2 wdh 20 Liegestütze"), { name:"Liegestütze", saetze:2, modus:"wdh", wert:20 }));

/* ---------- 2) Kurzform: zwei Zahlen, egal wie herum ---------- */
pruefe("Name dann Zahlen",
  gleich(deuten("Bankdrücken 3 10"), { name:"Bankdrücken", saetze:3, modus:"wdh", wert:10 }));
pruefe("Zahlen VERKEHRT herum werden gedreht",
  gleich(deuten("Bankdrücken 10 3"), { name:"Bankdrücken", saetze:3, modus:"wdh", wert:10 }));
pruefe("Zahlen zuerst, Name hinten",
  gleich(deuten("3 10 Bankdrücken"), { name:"Bankdrücken", saetze:3, modus:"wdh", wert:10 }));
pruefe("mit x dazwischen", gleich(deuten("Bankdrücken 3x10"), { name:"Bankdrücken", saetze:3, modus:"wdh", wert:10 }));
pruefe("mit Malzeichen", gleich(deuten("Bankdrücken 3 × 10"), { name:"Bankdrücken", saetze:3, modus:"wdh", wert:10 }));
pruefe("gleiche Zahlen", gleich(deuten("Dips 5 5"), { name:"Dips", saetze:5, modus:"wdh", wert:5 }));
pruefe("die Kurzform legt immer Wdh an", deuten("Plank 3 45").modus === "wdh");

/* ---------- 3) Namen mit eigenen Zahlen ueberleben ---------- */
pruefe("Zahl IM Namen bleibt am Namen",
  gleich(deuten("500-m-Intervalle 3 10"), { name:"500-m-Intervalle", saetze:3, modus:"wdh", wert:10 }));
pruefe("Gewicht im Namen bleibt stehen",
  gleich(deuten("Kurzhantel 20 kg 3 10"), { name:"Kurzhantel 20 kg", saetze:3, modus:"wdh", wert:10 }));

/* ---------- 4) Was KEINE Mengen nennt, bleibt reiner Name ---------- */
pruefe("nur ein Name -> null", deuten("Liegestütze") === null);
pruefe("nur eine Zahl -> null", deuten("Liegestütze 12") === null);
pruefe("nackte Zahlen ohne Namen -> null", deuten("3 10") === null);
pruefe("leere Zeile -> null", deuten("") === null && deuten("   ") === null && deuten(null) === null);
pruefe("Null als Menge zaehlt nicht", deuten("Dips 0 10") === null);

/* ---------- 5) Verdrahtung ---------- */
const setzen = grabFn("abschnittTextSetzen");
pruefe("der Parser benutzt die Deutung", setzen.includes("notizZeileDeuten(t)"));
pruefe("Saetze kommen aus der Deutung", setzen.includes("begrenzen(m.saetze || 1, 1, 20)"));
pruefe("der Modus kommt aus der Deutung", setzen.includes('m.modus === "zeit"'));
pruefe("das Feld bekommt die aufgeraeumte Fassung zurueck",
  setzen.includes("if(feld) feld.value = abschnittTextErzeugen(p)"));
pruefe("die Textarea reicht sich selbst durch",
  grabFn("notizAbschnittHtml").includes("abschnittTextSetzen(\\'' + p.id + '\\', this.value, this)"));
/* v157: `oninput` heisst jetzt `notizTippen` (waechst UND schlaegt vor). Der
   Kern der v155-Zusage bleibt: Beim Tippen wird der Text NICHT umgeschrieben —
   sonst spraenge der Cursor. Geprueft wird deshalb die Wirkung, nicht der Name. */
pruefe("beim Tippen wird NICHT umgeschrieben (Cursor)",
  !grabFn("notizTippen").includes("abschnittTextSetzen") &&
  grabFn("notizTippen").includes("notizTextWachsen(el)"));

/* ---------- 6) Getan und das i sind weg ---------- */
pruefe("die Getan-Karte ist entfallen", !src.includes("function notizGetanHtml("));
pruefe("ihre Handler auch",
  !src.includes("function notizGetanEintragen(") && !src.includes("function notizGetanLoeschen("));
pruefe("das Eingabefeld ist weg", !src.includes('id="notiz-getan"'));
pruefe("der Notizblock zeichnet sie nicht mehr", !grabFn("notizblockZeichnen").includes("notizGetanHtml"));
pruefe("das Info-i bleibt versteckt", grabFn("notizblockKopfSetzen").includes("info.hidden = true"));
pruefe("das Datenfeld freitext bleibt erhalten (additiver Vertrag)", src.includes("e.freitext"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
