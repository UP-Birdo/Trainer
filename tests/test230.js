/* 0.230.0-Test: Das wachsende Modell. (64. Runde, Nutzer-Direktive.)

   „Alles soll wachsen. Die fixe Anfaenger-Stufe darf nicht existieren — alles
   soll mit den Trainingseinheiten wachsen. Alle Werte sollen einfliessen. Man
   soll selbst Daten eintragen koennen."

   Die Zusagen:
   1. ERFAHRUNG WAECHST. Die Profil-Angabe ist nur der Startwert; die aktiven
      Trainingswochen holen ihn ein und ueberholen ihn. Zurueckgestuft wird nie.
   2. JEDER MUSKEL WAECHST. Ueber Wochen vertragenes Volumen hebt die Kapazitaet
      (Deckel +30 %); Beschwerden pausieren, zwei leere Wochen setzen zurueck.
   3. ERHOLUNG JE MUSKEL. 1-3 Tage nach Muskelgroesse statt pauschal 2;
      Anfaenger brauchen laenger (Repeated-Bout-Effekt).
   4. NEUE WERTE. Ruhepuls (Normalwert wird gelernt, nur Warnung nach unten)
      und Ernaehrung — beides selbst eingetragen, kein Wert = kein Effekt.
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
function grabZeile(name){
  // tolerant gegen Ausrichtungs-Leerzeichen (`const SCHLAF_TAGE    = 7;`)
  const m = new RegExp("const " + name + "\\s*=").exec(src);
  if(!m) throw new Error("Konstante nicht gefunden: " + name);
  return src.slice(m.index, src.indexOf("\n", m.index));
}
function grabObjekt(name){
  const i = src.indexOf("const " + name + " = {");
  if(i < 0) throw new Error("Objekt nicht gefunden: " + name);
  return src.slice(i, src.indexOf("};", i) + 2);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("tagDifferenz"), grabFn("wocheSeitEpoche"),
  grabZeile("SCHLAF_TAGE"), grabZeile("ERHOLUNG_TAGE"),
  grabZeile("RUHEPULS_MINDEST"), grabZeile("ERNAEHRUNG_MINDEST"),
  grabZeile("ANPASSUNG_WOCHEN"), grabZeile("ANPASSUNG_SCHRITT"), grabZeile("ANPASSUNG_DECKEL"),
  grabObjekt("MUSKEL_ERHOLUNG"),
  grabFn("aktiveTrainingsWochen"), grabFn("erfahrungAusVerlauf"), grabFn("erfahrungsFaktor"),
  grabFn("ruhepulsBasis"), grabFn("ruhepulsFaktor"),
  grabFn("ernaehrungSchnitt"), grabFn("ernaehrungFaktor"),
  grabFn("anpassungsFaktor"), grabFn("erholungsTageFuer"),
  "module.exports = { aktiveTrainingsWochen, erfahrungAusVerlauf, erfahrungsFaktor, " +
  "ruhepulsBasis, ruhepulsFaktor, ernaehrungSchnitt, ernaehrungFaktor, anpassungsFaktor, erholungsTageFuer };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die Erfahrung waechst ---------- */
const woche = (montag, tage) => tage.map(t => ({ datum: montag.slice(0, 8) + String(Number(montag.slice(8)) + t).padStart(2, "0") }));
pruefe("keine Trainings, keine aktiven Wochen", A.aktiveTrainingsWochen([]) === 0);
pruefe("eine Woche mit zwei Tagen zaehlt", A.aktiveTrainingsWochen(woche("2026-06-01", [0, 2])) === 1);
pruefe("eine Woche mit nur einem Tag zaehlt nicht", A.aktiveTrainingsWochen(woche("2026-06-01", [0])) === 0);
pruefe("zwei Trainings am SELBEN Tag sind ein Tag",
  A.aktiveTrainingsWochen([{ datum:"2026-06-01" }, { datum:"2026-06-01" }]) === 0);
pruefe("die Kurve beginnt bei 0,6", A.erfahrungAusVerlauf(0) === 0.6);
pruefe("nach einem Jahr aktiver Wochen bei 1,0", A.erfahrungAusVerlauf(48) === 1.0);
pruefe("nach zwei Jahren gedeckelt bei 1,1",
  A.erfahrungAusVerlauf(96) === 1.1 && A.erfahrungAusVerlauf(500) === 1.1);
pruefe("dazwischen stetig steigend",
  A.erfahrungAusVerlauf(12) > 0.6 && A.erfahrungAusVerlauf(24) > A.erfahrungAusVerlauf(12));
/* Die Profil-Angabe ist nur der Start — sie wird eingeholt, nie unterschritten. */
pruefe("der deklarierte Fortgeschrittene startet bei 1,0",
  A.erfahrungsFaktor({ erfahrung:"fortgeschritten" }, []) === 1.0);
pruefe("der deklarierte Anfaenger startet bei 0,6",
  A.erfahrungsFaktor({ erfahrung:"anfaenger" }, []) === 0.6);
/* 60 aktive Wochen bauen: je Woche Montag+Mittwoch. */
const langeHistorie = [];
for(let w = 0; w < 60; w++){
  const basis = new Date(Date.UTC(2024, 0, 1 + w * 7));
  [0, 2].forEach(t => {
    const d = new Date(basis.getTime() + t * 86400000);
    langeHistorie.push({ datum: d.toISOString().slice(0, 10) });
  });
}
pruefe("der Verlauf ueberholt die Anfaenger-Angabe",
  A.erfahrungsFaktor({ erfahrung:"anfaenger" }, langeHistorie) > 1.0);
pruefe("und faellt nie unter den deklarierten Start",
  A.erfahrungsFaktor({ erfahrung:"fortgeschritten" }, woche("2026-06-01", [0, 2])) === 1.0);

/* ---------- 2) Der Ruhepuls ---------- */
const HEUTE = "2026-08-10";
const puls = (tageZurueck, wert) => {
  const d = new Date(Date.UTC(2026, 7, 10 - tageZurueck));
  return { datum: d.toISOString().slice(0, 10), art:"ruhepuls", wert };
};
const basisWerte = [3, 5, 8, 12, 20].map(t => puls(t, 60));
pruefe("der Normalwert ist der Median", A.ruhepulsBasis(basisWerte, HEUTE) === 60);
pruefe("unter fuenf Eintraegen keine Basis", A.ruhepulsBasis(basisWerte.slice(0, 4), HEUTE) === null);
pruefe("die letzten zwei Tage lernen den Normalwert NICHT mit",
  A.ruhepulsBasis(basisWerte.concat([puls(0, 90), puls(1, 90)]), HEUTE) === 60);
pruefe("ohne Basis kein Effekt", A.ruhepulsFaktor([puls(0, 80)], HEUTE) === 1);
pruefe("normaler Puls ist neutral", A.ruhepulsFaktor(basisWerte.concat([puls(0, 61)]), HEUTE) === 1);
pruefe("leicht erhoehter Puls senkt etwas", A.ruhepulsFaktor(basisWerte.concat([puls(0, 63)]), HEUTE) === 0.96);
pruefe("deutlich erhoehter Puls senkt staerker", A.ruhepulsFaktor(basisWerte.concat([puls(0, 66)]), HEUTE) === 0.92);
/* Nur Warnung nach unten — ein niedriger Puls gibt keinen Bonus. */
pruefe("ein niedriger Puls gibt KEINEN Bonus", A.ruhepulsFaktor(basisWerte.concat([puls(0, 48)]), HEUTE) === 1);
pruefe("ein alter Messwert zaehlt nicht als aktuell",
  A.ruhepulsFaktor(basisWerte.concat([puls(5, 90)]), HEUTE) === 1);

/* ---------- 3) Die Ernaehrung ---------- */
const essen = (t, wert) => {
  const d = new Date(Date.UTC(2026, 7, 10 - t));
  return { datum: d.toISOString().slice(0, 10), art:"ernaehrung", wert };
};
pruefe("unter drei Eintraegen kein Schnitt", A.ernaehrungSchnitt([essen(0, 5), essen(1, 5)], HEUTE) === null);
pruefe("schlechte Versorgung senkt", A.ernaehrungFaktor(2) === 0.95);
pruefe("gute Versorgung hebt leicht", A.ernaehrungFaktor(4.5) === 1.03);
pruefe("normal ist neutral, ohne Wert auch", A.ernaehrungFaktor(3) === 1 && A.ernaehrungFaktor(null) === 1);

/* ---------- 4) Die Anpassung je Muskel ---------- */
const wochen = n => Array.from({ length: 8 }, (x, i) => i < n ? { abs:{ saetze:12 } } : { abs:{ saetze:0 } });
pruefe("ohne vertragene Wochen kein Wachstum", A.anpassungsFaktor(wochen(0), "abs", 16, 1) === 1);
pruefe("jede vertragene Woche hebt um den Schritt", A.anpassungsFaktor(wochen(4), "abs", 16, 1) === 1.16);
pruefe("der Deckel liegt bei +30 Prozent", A.anpassungsFaktor(wochen(8), "abs", 16, 1) <= 1.3);
pruefe("unter 60 Prozent der Basis zaehlt die Woche nicht",
  A.anpassungsFaktor(wochen(4), "abs", 25, 1) === 1);
pruefe("Beschwerden pausieren das Wachstum", A.anpassungsFaktor(wochen(8), "abs", 16, 0.9) === 1);
/* Detraining: die letzten beiden abgeschlossenen Wochen leer -> zurueck auf 1. */
const pause = [{ abs:{ saetze:0 } }, { abs:{ saetze:0 } }].concat(wochen(6).slice(0, 6));
pruefe("zwei leere Wochen setzen zurueck", A.anpassungsFaktor(pause, "abs", 16, 1) === 1);
pruefe("ein unbekannter Muskel waechst nicht", A.anpassungsFaktor(wochen(8), "calves", 16, 1) === 1);

/* ---------- 5) Erholung je Muskel ---------- */
pruefe("grosse Muskeln brauchen laenger als kleine",
  A.erholungsTageFuer("quadriceps", 1) === 3 && A.erholungsTageFuer("calves", 1) === 1);
pruefe("der Standard bleibt bei 2", A.erholungsTageFuer("deltoid", 1) === 2);
pruefe("Anfaenger brauchen laenger", A.erholungsTageFuer("quadriceps", 0.6) === 4);
pruefe("Trainierte nicht", A.erholungsTageFuer("quadriceps", 1.1) === 3);
pruefe("ein unbekannter Muskel faellt auf den alten Wert",
  A.erholungsTageFuer("unbekannt", 1) === 2);

/* ---------- 6) Verdrahtung ---------- */
const kapF = grabFn("kapazitaetsFaktor");
pruefe("die fixe Erfahrungs-Tabelle ist aus kapazitaetsFaktor verschwunden",
  !kapF.includes("anfaenger:0.6") && kapF.includes("erfahrungsFaktor(einrichtung, protokoll)"));
pruefe("Ruhepuls und Ernaehrung fliessen ein",
  kapF.includes("ruhepulsFaktor(tageswerte, heute)") && kapF.includes("ernaehrungFaktor(ernaehrungSchnitt("));
const ausl = grabFn("muskelAuslastung");
pruefe("die Wochen-Lasten werden EINMAL fuer alle Muskeln gebaut",
  ausl.includes("for(let w = 1; w <= ANPASSUNG_WOCHEN; w++)"));
pruefe("die Anpassung wirkt auf die Kapazitaet", ausl.includes("anpassungsFaktor(wochen, m, basis"));
pruefe("die Erholung ist je Muskel", ausl.includes("erholungsTageFuer(m, erfF)"));
pruefe("die neuen Tageswerte sind eintragbar",
  src.includes('id:"ruhepuls"') && src.includes('id:"ernaehrung"'));
pruefe("die Grundlagen-Zeile nennt beide",
  grabFn("rechnungsGrundlage").includes('push("Ruhepuls")') &&
  grabFn("rechnungsGrundlage").includes('push("Ernährung")'));
/* Die Frage am Ende jedes Trainings. */
const angebot = grabFn("checkAngebotHtml");
pruefe("nach dem Training wird der Tages-Check angeboten", angebot.includes("tagesCheckOeffnen()"));
pruefe("aber nur, wenn er heute fehlt", angebot.includes('e.art === "befinden"'));
pruefe("und nur auf erlaubten Stufen (Leitplanke 8)", angebot.includes('viewErlaubt("view-tagescheck")'));
pruefe("beide Trainings-Enden zeigen ihn",
  grabFn("bewertungAnwenden").includes("checkAngebotHtml()") &&
  grabFn("abschlussZeigen").includes("checkAngebotHtml()"));

/* ---------- 7) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("APP_VERSION passt zu VERSION", (() => {
  const [, mi, pa] = /const VERSION = "([\d.]+)";/.exec(src)[1].split(".");
  return Number(/const APP_VERSION = (\d+);/.exec(src)[1]) === Number(mi) * 1000 + Number(pa);
})());
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.230.0", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
