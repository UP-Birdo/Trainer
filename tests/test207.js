/* v207-Test: der Rueckweg fuer Ausdauer-Plaene + der Wiedereinstieg nach einer
   langen Pause (54. Runde, vierter Persona-Durchgang).

   Die drei Zusagen, die dieser Test haelt:
   1. RUECKWEG: Ein einzelner schwacher Tag schreibt nichts um; beim ZWEITEN Mal
      in Folge zieht die Vorgabe auf das wirklich Gelaufene nach. Das ZIEL bleibt
      dabei unangetastet, und der Plan rutscht nicht unter einen Schritt.
      Gehalten -> Zaehler zurueck auf 0.
   2. EINE SENKUNG, EINE STELLE: Der Deload und der Wiedereinstieg nutzen
      dieselbe Funktion (stufeSenken) — zwei Stellen mit denselben Zahlen waeren
      zwei Wahrheiten.
   3. WIEDEREINSTIEG IST EIN ANGEBOT: Er wird erst ab 21 Tagen faellig, gilt je
      Pause genau einmal (Merker = letzter Trainingstag) und aendert von sich aus
      nichts.
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
/* Konstanten haben oft einen Kommentar hinter dem Semikolon — bis zum ersten
   Semikolon lesen, nicht bis zum Zeilenende. */
function grabConst(name){
  const t = new RegExp("^const " + name + " = [^;\\n]*;", "m").exec(src);
  if(!t) throw new Error("Konstante nicht gefunden: " + name);
  return t[0];
}

/* Ersatzteile fuer die Umgebung. Der gepruefte Code bleibt der aus index.html —
   nur was er von aussen anfasst (Sitzung, Sportart, heutiges Datum), stellen
   wir hier schlank bereit. */
let HEUTE = "2026-07-31";
let ZIELE = [];
let MASS = { einheit:"km", schritt:0.5, start:3 };   // umschaltbar: km-Sport oder m-Sport
const sitzung = { daten: { get ziele(){ return ZIELE; } } };
const sportart = () => ({ strecke: MASS });

const modul = { exports: {} };
new Function("module", "exports", "sitzung", "sportart", "hatStrecke", "isoWoche", "heuteAlsText", [
  grabFn("begrenzen"),
  grabFn("stufeSenken"),
  grabFn("zahlKurz"),
  grabConst("STEIGERUNG_MAX"),
  grabConst("ENTLASTUNG_NACH"),
  grabConst("ENTLASTUNG_ANTEIL"),
  grabConst("RUECKWEG_NACH"),
  grabConst("RUECKWEG_GRENZE"),
  grabConst("WIEDEREINSTIEG_TAGE"),
  grabFn("tagDifferenz"),
  grabFn("pauseTage"),
  grabFn("wiedereinstiegFaellig"),
  grabFn("pauseText"),
  grabFn("planSenken"),
  grabFn("zieleAnwenden"),
  "module.exports = { begrenzen, stufeSenken, zieleAnwenden, pauseTage, wiedereinstiegFaellig," +
  " pauseText, planSenken, RUECKWEG_NACH, RUECKWEG_GRENZE, WIEDEREINSTIEG_TAGE, ENTLASTUNG_ANTEIL };"
].join("\n"))(modul, modul.exports, sitzung, sportart, () => true,
              d => "W-" + d.slice(0, 7), () => HEUTE);

const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* Ein Laufplan mit Ziel — nur so gibt es ueberhaupt Hin- und Rueckweg. */
function laufplan(strecke){
  return { typ:"aktivitaet", name:"Laufen", sportart:"laufen", strecke,
           steigerung:{ woche:null, stufen:0, vorEntlastung:0, verfehlt:0 } };
}
function mitZiel(wert){ ZIELE = [{ uebung:"laufen", art:"strecke", wert }]; }

/* ---------- 1) Der Rueckweg ---------- */
mitZiel(20);
{
  const p = laufplan(10);
  const m1 = A.zieleAnwenden(p, 6, 1800);          // deutlich unter Plan
  pruefe("ein schwacher Tag aendert die Vorgabe NICHT", p.strecke === 10);
  pruefe("er wird aber gezaehlt", p.steigerung.verfehlt === 1);
  pruefe("und gemeldet (vorerst)", m1.length === 1 && /vorerst/.test(m1[0]));

  const m2 = A.zieleAnwenden(p, 6, 1800);          // zweites Mal in Folge
  pruefe("beim zweiten Mal zieht der Plan nach", p.strecke === 6);
  pruefe("der Zaehler faengt danach von vorn an", p.steigerung.verfehlt === 0);
  pruefe("der Aufbau beginnt neu", p.steigerung.stufen === 0 && p.steigerung.vorEntlastung === 0);
  pruefe("und es steht dran, was passiert ist", /zurück/.test(m2[0]) && /6/.test(m2[0]));
}
{
  // Gehalten heisst gehalten: der Zaehler faellt zurueck, es wird nicht gesenkt.
  const p = laufplan(10);
  A.zieleAnwenden(p, 6, 1800);
  pruefe("erst gezaehlt", p.steigerung.verfehlt === 1);
  A.zieleAnwenden(p, 10, 1800);                    // Vorgabe gehalten
  pruefe("eine gute Einheit setzt den Zaehler zurueck", p.steigerung.verfehlt === 0);
  pruefe("und senkt nichts", p.strecke >= 10);
}
{
  // 90-%-Grenze: knapp darunter ist nicht "deutlich unter".
  const p = laufplan(10);
  A.zieleAnwenden(p, 9.5, 1800);
  pruefe("9,5 von 10 gilt nicht als verfehlt", p.steigerung.verfehlt === 0);
  const q = laufplan(10);
  A.zieleAnwenden(q, 8.9, 1800);
  pruefe("8,9 von 10 dagegen schon", q.steigerung.verfehlt === 1);
}
{
  // Das Ziel ist die Ansage des Nutzers — es wird nie angefasst.
  mitZiel(20);
  const p = laufplan(10);
  A.zieleAnwenden(p, 4, 1800); A.zieleAnwenden(p, 4, 1800);
  pruefe("gesenkt wird auf das wirklich Gelaufene", p.strecke === 4);
  pruefe("das Ziel bleibt unangetastet", ZIELE[0].wert === 20);
}
{
  // Untergrenze: der Plan rutscht nicht unter einen Schritt der Sportart.
  const p = laufplan(1);
  A.zieleAnwenden(p, 0.1, 600); A.zieleAnwenden(p, 0.1, 600);
  pruefe("nie unter einen Schritt", p.strecke === 0.5);
}
{
  // Abgerundet, nicht kaufmaennisch: der Plan verlangt nie MEHR als gelaufen.
  const p = laufplan(10);
  A.zieleAnwenden(p, 6.4, 1800); A.zieleAnwenden(p, 6.4, 1800);
  pruefe("6,4 km werden zu 6,0 km, nicht zu 6,5", p.strecke === 6);
}
{
  /* Fliesskomma-Falle: 3000 / 100 ist 29,999999999999996 — ohne Epsilon
     machte Math.floor daraus 2900 m. Geprueft an der ECHTEN Funktion, mit
     einer Sportart, die in Metern misst (Schwimmen). */
  MASS = { einheit:"m", schritt:100, start:1000 };
  const p = laufplan(5000);
  A.zieleAnwenden(p, 3000, 1800); A.zieleAnwenden(p, 3000, 1800);
  pruefe("3000 m bei Schritt 100 bleiben 3000 m", p.strecke === 3000);
  MASS = { einheit:"km", schritt:0.5, start:3 };
}
{
  // Der Rueckweg haengt NICHT an der Wochenbremse (sie bremst nur das Steigern).
  const p = laufplan(10);
  p.steigerung.woche = "W-2026-07";                // in dieser Woche schon gesteigert
  A.zieleAnwenden(p, 5, 1800); A.zieleAnwenden(p, 5, 1800);
  pruefe("gesenkt wird auch in einer Woche, in der schon gesteigert wurde", p.strecke === 5);
}
{
  // Ohne Ziel gibt es weder Hin- noch Rueckweg — der Plan gehoert dem Nutzer.
  ZIELE = [];
  const p = laufplan(10);
  const m = A.zieleAnwenden(p, 2, 1800);
  pruefe("ohne Ziel passiert gar nichts", p.strecke === 10 && m.length === 0);
  pruefe("und auch nicht am Zaehler", p.steigerung.verfehlt === 0);
}
{
  // Eine Einheit ohne Strecke (nur Zeit) darf nicht als verfehlt zaehlen.
  mitZiel(20);
  const p = laufplan(10);
  A.zieleAnwenden(p, 0, 1800);
  pruefe("ohne Streckenangabe wird nichts verfehlt", p.steigerung.verfehlt === 0);
}
pruefe("die Schwellen stehen als benannte Konstanten da",
  A.RUECKWEG_NACH === 2 && A.RUECKWEG_GRENZE === 0.9);

/* ---------- 2) Eine Senkung, eine Stelle ---------- */
{
  const u = { modus:"wdh", wdh:12, wdhMin:8, wdhMax:12, gewicht:40, gewichtSchritt:2.5, pause:90 };
  A.stufeSenken(u);
  pruefe("Wiederholungen gehen auf das Minimum", u.wdh === 8);
  pruefe("ein Gewichtsschritt runter", u.gewicht === 37.5);
  pruefe("die Pause waechst um 30 s", u.pause === 120);
}
{
  const u = { modus:"wdh", wdh:20, wdhMin:10, wdhMax:25, gewicht:0, gewichtSchritt:0, pause:60 };
  A.stufeSenken(u);
  pruefe("Koerpergewicht bleibt bei 0 kg", u.gewicht === 0 && u.wdh === 10);
}
{
  const u = { modus:"zeit", dauer:60, pause:290 };
  A.stufeSenken(u);
  pruefe("Zeit-Uebungen gehen auf 80 %", u.dauer === 48);
  pruefe("die Pause bleibt bei 300 s gedeckelt", u.pause === 300);
}
/* Der Deload benutzt genau diese Funktion — sonst haetten wir zwei Wahrheiten. */
pruefe("der Deload senkt ueber stufeSenken",
  /u\.deload = true;[\s\S]{0,160}return stufeSenken\(u\);/.test(grabFn("progressionAnwenden")));
pruefe("die Senkungs-Zahlen stehen nicht mehr in progressionAnwenden",
  !/u\.dauer \* 0\.8/.test(grabFn("progressionAnwenden")) &&
  /u\.dauer \* 0\.8/.test(grabFn("stufeSenken")));

/* ---------- 3) Der Wiedereinstieg ---------- */
const P = d => ({ datum:d });
pruefe("ohne Training gibt es keine Pause", A.pauseTage([], "2026-07-31") === null);
pruefe("die Pause zaehlt ab dem letzten Training",
  A.pauseTage([P("2026-05-01"), P("2026-06-05")], "2026-07-31") === 56);
pruefe("die Reihenfolge im Protokoll ist egal",
  A.pauseTage([P("2026-06-05"), P("2026-05-01")], "2026-07-31") === 56);
pruefe("die Schwelle sind drei Wochen", A.WIEDEREINSTIEG_TAGE === 21);
pruefe("20 Tage sind noch keine lange Pause",
  A.wiedereinstiegFaellig([P("2026-07-11")], "2026-07-31", "") === false);
pruefe("21 Tage sind es",
  A.wiedereinstiegFaellig([P("2026-07-10")], "2026-07-31", "") === true);
pruefe("wer nie trainiert hat, macht keine Pause",
  A.wiedereinstiegFaellig([], "2026-07-31", "") === false);
/* Der Merker ist der letzte Trainingstag: einmal abgehakt, bleibt es weg —
   bis eine NEUE Pause hinter einem anderen letzten Trainingstag liegt. */
pruefe("abgehakt heisst weg",
  A.wiedereinstiegFaellig([P("2026-05-01")], "2026-07-31", "2026-05-01") === false);
pruefe("die naechste Pause zeigt ihn wieder",
  A.wiedereinstiegFaellig([P("2026-05-01"), P("2026-06-01")], "2026-07-31", "2026-05-01") === true);
pruefe("acht Wochen heissen acht Wochen", A.pauseText(56) === "8 Wochen");
pruefe("eine Woche steht im Singular", A.pauseText(7) === "1 Woche");
pruefe("Resttage kommen dazu", A.pauseText(23) === "3 Wochen und 2 Tagen");
pruefe("ein einzelner Resttag auch", A.pauseText(22) === "3 Wochen und 1 Tag");

/* planSenken: Kraft ueber stufeSenken, Ausdauer ueber den Entlastungs-Anteil. */
{
  const p = { typ:"kraft", uebungen:[
    { modus:"wdh", wdh:12, wdhMin:8, wdhMax:12, gewicht:40, gewichtSchritt:2.5, pause:90 },
    { modus:"zeit", dauer:60, pause:60 }
  ]};
  A.planSenken(p);
  pruefe("der Kraftplan senkt jede Uebung", p.uebungen[0].wdh === 8 && p.uebungen[1].dauer === 48);
}
{
  const p = { typ:"aktivitaet", strecke:10, dauer:3600,
              steigerung:{ woche:"x", stufen:2, vorEntlastung:8, verfehlt:1 } };
  A.planSenken(p);
  pruefe("Ausdauer geht auf 70 % Strecke", p.strecke === 7);
  pruefe("und 70 % Dauer", p.dauer === 2520);
  pruefe("der Aufbau beginnt von vorn",
    p.steigerung.stufen === 0 && p.steigerung.vorEntlastung === 0 && p.steigerung.verfehlt === 0);
  pruefe("70 % kommt aus der vorhandenen Entlastungs-Regel", A.ENTLASTUNG_ANTEIL === 0.7);
}
{
  // Ein Plan ohne Strecke (Tischtennis) verliert nur Dauer, nichts wird negativ.
  const p = { typ:"aktivitaet", strecke:0, dauer:1800, steigerung:null };
  A.planSenken(p);
  pruefe("ohne Streckenmass bleibt die Strecke 0", p.strecke === 0 && p.dauer === 1260);
}

/* ---------- 4) Verdrahtung ---------- */
pruefe("der Hinweis hat seinen Platz auf Heute",
  src.includes('<div id="wiedereinstieg-hinweis" class="karte"'));
/* v177-Linie: Empfehlung in der Signalfarbe, nicht im Warnrot der hinweis-Klasse. */
pruefe("er ist eine Empfehlung, kein Alarm",
  /id="wiedereinstieg-hinweis"[^>]*var\(--signal\)/.test(src) &&
  !/id="wiedereinstieg-hinweis" class="hinweis"/.test(src));
pruefe("startOeffnen zeichnet ihn", grabFn("startOeffnen").includes("wiedereinstiegZeichnen()"));
/* Leitplanke 8: was deutet und raet, gehoert ab Stufe 4. */
pruefe("er erscheint erst ab Stufe 4", grabFn("wiedereinstiegZeichnen").includes("stufe() >= 4"));
pruefe("er aendert von sich aus nichts (nur die Knoepfe tun das)",
  !/planSenken|stufeSenken/.test(grabFn("wiedereinstiegZeichnen")));
pruefe("es gibt beide Wege: senken und ausblenden",
  grabFn("wiedereinstiegZeichnen").includes("wiedereinstiegSenken()") &&
  grabFn("wiedereinstiegZeichnen").includes("wiedereinstiegAusblenden()"));
pruefe("die Senkung ist rueckgaengig zu machen",
  grabFn("wiedereinstiegSenken").includes("zeigenToast") &&
  grabFn("wiedereinstiegSenken").includes("JSON.parse(JSON.stringify(plaene))"));
/* Hin- und Rueckweg zeichnen ueber DIESELBE Funktion neu — sonst zeigt eine
   der beiden Richtungen alte Zahlen (die Heute-Karte nennt Saetze und Dauer). */
pruefe("gesenkt und rueckgaengig zeichnen dasselbe neu",
  (grabFn("wiedereinstiegSenken").match(/wiedereinstiegNeuZeichnen\(\)/g) || []).length === 2);
pruefe("und dazu gehoert die Heute-Karte",
  grabFn("wiedereinstiegNeuZeichnen").includes("heuteKarteZeichnen()") &&
  grabFn("wiedereinstiegNeuZeichnen").includes("planListeZeichnen()"));
pruefe("und sie fasst die gelbe Hauptaktion nicht an (Start bleibt die eine)",
  !/class="primaer/.test(grabFn("wiedereinstiegZeichnen")));
/* Additiver Datenvertrag: beide neuen Felder werden nachgeruestet. */
pruefe("der Merker wird nachgeruestet",
  /daten\.einrichtung\.wiedereinstiegStand !== "string"/.test(grabFn("datenNachruesten")));
pruefe("der Verfehlt-Zaehler auch",
  /p\.steigerung\.verfehlt !== "number"/.test(grabFn("datenNachruesten")));
pruefe("neue Konten laufen durch dieselbe Nachruestung",
  grabFn("leereKontodaten").includes("datenNachruesten"));
pruefe("die Plan-Karte nennt beim zuletzt jetzt auch das Jahr",
  grabFn("planListeZeichnen").includes("' · zuletzt ' + datumKurz(zuletzt)"));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v207",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 207);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.207", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
