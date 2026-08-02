/* v212-Test: Stufe 1 ist eine flache Liste; die Sportart kommt aus der Uebung.
   (55. Runde, dritter Punkt aus der Ideen-Box.)

   Die vier Zusagen:
   1. FLACH, ABER NICHT LEER. Stufe 1 zeigt die Zeilen ALLER Abschnitte
      untereinander, ohne Ueberschrift — mit dem Haken je Zeile.
   2. DIE DATEN BLEIBEN. Die Abschnitte sind weiter Plaene; die Stufe ist nur
      eine Ansicht (goldene Regel). Stufe 2 behaelt ihre Karten samt Ueberschrift.
   3. DIE UEBUNG NENNT DIE SPORTART. `notizZielSportart` fragt erst die Einheit
      (v199), dann den Uebungs-Katalog — und faellt auf Kraft zurueck.
   4. EINE ANTWORT FUER ZWEI FRAGEN. `sportartFuerUebung` ist die eine Stelle;
      `sportartZuDrill` (v195) leitet sich daraus ab.
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
function grabBlock(name, open, close){
  const i = src.indexOf("const " + name + " = " + open);
  if(i < 0) throw new Error("Block nicht gefunden: " + name);
  let tiefe = 0;
  for(let k = src.indexOf(open, i); k < src.length; k++){
    if(src[k] === open) tiefe++;
    else if(src[k] === close){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}
function grabZahl(name){
  const t = new RegExp("^const " + name + " = [^;\\n]*;", "m").exec(src);
  if(!t) throw new Error("Konstante nicht gefunden: " + name);
  return t[0];
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("normName"),
  grabBlock("UEBUNGEN_DB", "[", "]"),
  grabBlock("SPORTARTEN", "[", "]"),
  grabBlock("SPORT_UEBUNGEN", "{", "}"),
  grabFn("sportart"), grabFn("sportUebungen"),
  grabFn("sportartFuerUebung"), grabFn("sportartZuDrill"),
  grabZahl("NOTIZ_MUSTER"), grabZahl("NOTIZ_PAAR"), grabZahl("NOTIZ_GEWICHT"),
  grabFn("kommaZahl"), grabFn("notizZeileDeuten"),
  grabFn("notizSportart"), grabFn("notizZielSportart"),
  "module.exports = { sportartFuerUebung, sportartZuDrill, notizZielSportart," +
  " SPORTARTEN, SPORT_UEBUNGEN, UEBUNGEN_DB };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die Sportart aus der Uebung ---------- */
pruefe("eine Kraftuebung ist Krafttraining", A.sportartFuerUebung("Kniebeugen") === "kraft");
pruefe("Gross- und Kleinschreibung ist egal", A.sportartFuerUebung("kniebeugen") === "kraft");
pruefe("ein unbekannter Name ergibt nichts", A.sportartFuerUebung("Blubb") === null);
pruefe("ohne Namen auch nicht",
  A.sportartFuerUebung("") === null && A.sportartFuerUebung(null) === null);
/* Jeder Drill muss SEINE Sportart nennen — geprueft am echten Katalog, damit
   der Test nicht an einem erfundenen Namen haengt. Ausgenommen sind Namen, die
   auch in UEBUNGEN_DB stehen: Dort gewinnt bewusst Kraft. */
{
  const dbNamen = new Set(A.UEBUNGEN_DB.map(u => u.name.toLowerCase()));
  let geprueft = 0, falsch = [], mehrdeutig = [];
  A.SPORTARTEN.filter(s => s.id !== "kraft").forEach(s => {
    (A.SPORT_UEBUNGEN[s.id] || []).forEach(v => {
      if(dbNamen.has(v.name.toLowerCase())) return;
      geprueft++;
      /* Ohne Vorgabe gewinnt die Reihenfolge in SPORTARTEN. Verlangt wird
         deshalb nicht „genau diese Sportart", sondern „eine, die den Namen
         wirklich fuehrt" — mehr kann ein Name nicht hergeben. */
      const id = A.sportartFuerUebung(v.name);
      const fuehrtIhn = (A.SPORT_UEBUNGEN[id] || []).some(x => x.name === v.name);
      if(!fuehrtIhn) falsch.push(s.id + "/" + v.name);
      if(id !== s.id) mehrdeutig.push(v.name);
      /* MIT Vorgabe muss die eigene Sportart gewinnen — genau dafuer gibt es sie. */
      if(A.sportartFuerUebung(v.name, [s.id]) !== s.id) falsch.push("bevorzugt " + s.id + "/" + v.name);
    });
  });
  pruefe("es wurden ueberhaupt Drills geprueft", geprueft > 20);
  if(falsch.length) console.error("   davon abweichend: " + falsch.join(", "));
  pruefe("jeder Drill nennt eine Sportart, die ihn fuehrt (" + geprueft + " geprueft)",
    falsch.length === 0);
  /* Die Mehrdeutigen sind bekannt und wenige — waechst die Zahl, ist das ein
     Zeichen, dass Drill-Namen zu allgemein werden. */
  pruefe("nur wenige Namen sind mehrdeutig (" + mehrdeutig.length + ")", mehrdeutig.length <= 4);
}
/* Zusage 4: sportartZuDrill leitet sich ab — Kraft ist dort KEIN Treffer. */
pruefe("sportartZuDrill meldet Kraft nicht", A.sportartZuDrill("Kniebeugen") === null);
pruefe("und Unbekanntes ebenfalls nicht", A.sportartZuDrill("Blubb") === null);
pruefe("es ist wirklich abgeleitet, keine zweite Suche",
  grabFn("sportartZuDrill").includes("sportartFuerUebung(name)") &&
  !grabFn("sportartZuDrill").includes("sportUebungen("));

/* ---------- 2) notizZielSportart ---------- */
pruefe("eine Einheit-Zeile nennt ihre Sportart", A.notizZielSportart("Laufen 5 km") === "laufen");
pruefe("auch ohne Zahlen", A.notizZielSportart("Laufen") === "laufen");
pruefe("eine Kraftuebung landet bei Kraft", A.notizZielSportart("Kniebeugen") === "kraft");
pruefe("mit Mengen davor genauso", A.notizZielSportart("Sätze 3 Wdh 10 Kniebeugen") === "kraft");
pruefe("die Kurzform auch", A.notizZielSportart("Kniebeugen 3x10") === "kraft");
/* Unbekanntes wird NICHT geraten — es geht zu Kraft, der Sportart, die jeder
   hat. Das ist eine Entscheidung, keine Erkennung. */
pruefe("Unbekanntes geht zu Kraft", A.notizZielSportart("Irgendwas Neues") === "kraft");
pruefe("eine leere Zeile faellt nicht um",
  A.notizZielSportart("") === "kraft" && A.notizZielSportart(null) === "kraft");
/* Die eigenen Sportarten geben bei mehrdeutigen Namen den Ausschlag.
   „Sprint-Intervalle" fuehren Radfahren UND Fussball, „Aufschlag-Training"
   Tischtennis UND Tennis — ohne Vorgabe gewinnt der erste in SPORTARTEN. */
pruefe("ohne Vorgabe gewinnt der erste Treffer",
  A.notizZielSportart("Sprint-Intervalle") === "radfahren");
pruefe("wer Fussball trainiert, meint seinen Fussball",
  A.notizZielSportart("Sprint-Intervalle", ["fussball"]) === "fussball");
pruefe("wer Tennis spielt, meint sein Tennis",
  A.notizZielSportart("Aufschlag-Training", ["tennis"]) === "tennis");
pruefe("eine Vorgabe, die den Namen nicht fuehrt, aendert nichts",
  A.notizZielSportart("Sprint-Intervalle", ["yoga"]) === "radfahren");
pruefe("und die Vorgabe erfindet nichts",
  A.notizZielSportart("Kniebeugen", ["fussball"]) === "kraft");

/* ---------- 3) Die flache Ansicht ---------- */
{
  const flach = grabFn("notizFlachHtml");
  pruefe("sie geht ueber ALLE Plaene", flach.includes("sitzung.daten.plaene"));
  pruefe("und zeichnet deren Zeilen", flach.includes("notizZeilenModell(p)"));
  pruefe("ohne Ueberschrift", !flach.includes("notiz-name") && !flach.includes("abschnittNameSetzen"));
  pruefe("am Ende steht die eine freie Zeile (ohne Plan)",
    flach.includes('notizZeileHtml(null, { text:"", uebung:null })'));
  const zeichnen = grabFn("notizblockZeichnen");
  pruefe("Stufe 1 nutzt sie", /s <= 1\s*\?\s*notizFlachHtml\(\)/.test(zeichnen));
  pruefe("Stufe 2 behaelt ihre Abschnitts-Karten", zeichnen.includes("notizAbschnittHtml(p, s)"));
  pruefe("und die tragen weiter eine Ueberschrift",
    grabFn("notizAbschnittHtml").includes("abschnittNameSetzen"));
}
/* Jede Reihe weiss, wohin sie gehoert — daran haengt das Speichern. */
{
  const zeile = grabFn("notizZeileHtml");
  pruefe("jede Reihe traegt ihren Plan", zeile.includes('data-plan="\' + pid + \'"'));
  pruefe("die freie Zeile traegt keinen", zeile.includes('const pid = p ? p.id : "";'));
  pruefe("der Haken bleibt in der Zeile", zeile.includes("notizHakenHtml(p, z.uebung)"));
}
{
  const sp = grabFn("notizZeilenSpeichern");
  pruefe("ohne Plan-Id sucht die Zeile ihren Abschnitt selbst",
    sp.includes("notizNeueZeileAblegen(feld.value)"));
  pruefe("sonst wird ueber data-plan gesammelt", sp.includes("notizReihenVon(planId)"));
  pruefe("und mit demselben Parser gespeichert wie bisher",
    sp.includes("abschnittTextSetzen(planId,"));
}
{
  const neu = grabFn("notizNeueZeileAblegen");
  pruefe("die neue Zeile geht durch denselben Parser",
    neu.includes("abschnittTextSetzen(p.id,"));
  pruefe("und wird an den vorhandenen Text angehaengt",
    neu.includes("notizZeilenModell(p).map(z => z.text).concat(t)"));
  const ziel = grabFn("notizZielPlan");
  pruefe("ein vorhandener Abschnitt der Sportart wird genutzt",
    ziel.includes('(p.sportart || "kraft") === id'));
  pruefe("sonst entsteht einer", ziel.includes("neuerAbschnitt(sportartName(id))"));
  pruefe("ein Aktivitaets-Abschnitt bekommt seine Felder gleich mit",
    ziel.includes("p.steigerung = { woche:null, stufen:0, vorEntlastung:0, verfehlt:0 }"));
}

/* ---------- 4) Die goldene Regel bleibt heil ---------- */
/* Die Stufe ist eine ANSICHT: Nichts an dieser Aenderung schreibt Daten um,
   wenn man die Stufe wechselt. Gepruefte Gegenprobe: `stufe`-Wechsel fasst die
   Plaene nicht an. */
pruefe("das Umstellen der Stufe konvertiert nichts",
  !/function stufeSetzen\([\s\S]{0,400}plaene/.test(src));
pruefe("die Abschnitte bleiben Plaene (kein eigenes Feld dazugekommen)",
  !/notizFlach\s*:/.test(src));
/* Das „+" legt auf Stufe 1 keinen unsichtbaren Abschnitt mehr an. */
pruefe("das Plus springt auf Stufe 1 in die freie Zeile",
  grabFn("planNeuMenue").includes("notizFreieZeileFokus()"));
pruefe("auf Stufe 2 legt es weiter einen Abschnitt an",
  grabFn("planNeuMenue").includes("abschnittAnlegen()"));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v212",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 212);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.212", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
