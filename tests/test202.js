/* v202-Test: drei Nutzer-Entscheidungen aus dem Persona-Durchgang.

   1. HAUPTAKTION BEI AUSDAUER: „Eintragen" ist gelb, die Stoppuhr steht daneben.
      Der Stoppuhr-Bildschirm riet fuer lange Einheiten selbst von sich ab —
      damit war der prominenteste Knopf fuer den Normalfall der falsche.
      GRENZE: Beim INTERVALL-Plan bleibt „Runden" vorn (dort ist der Timer nicht
      der bequemere Weg, sondern der Inhalt), und Kraft bleibt bei „Start".
      Dazu die Sackgasse: „Fertig" ohne gestartete Uhr fuehrt jetzt ins
      Eintragen-Formular, statt auf einen Weg zu verweisen, den der Bildschirm
      selbst nicht anbietet.
   2. STUFEN-AUSWAHL: eine kurze Zeile je Stufe steht wieder sichtbar da (v190
      hatte alles hinter das „i" geraeumt). Die ausfuehrliche Fassung bleibt dort.
   3. SCHLAF: beide Erfassungen bleiben, aber die Frage sagt, worin sie sich
      unterscheiden — statt eine der beiden Seiten zu opfern.
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
function grabListe(name){
  const i = src.indexOf("const " + name + " = [");
  if(i < 0) throw new Error("Liste nicht gefunden: " + name);
  const start = src.indexOf("[", i);
  let tiefe = 0;
  for(let k = start; k < src.length; k++){
    if(src[k] === "[") tiefe++;
    else if(src[k] === "]"){ tiefe--; if(tiefe === 0) return src.slice(i, k + 1) + ";"; }
  }
  throw new Error("Klammern unausgeglichen: " + name);
}

const modul = { exports: {} };
new Function("module", "exports", [
  grabListe("SIMPELHEIT_STUFEN"),
  grabListe("SIMPELHEIT_REIHENFOLGE"),
  grabFn("simpelheitListe"),
  grabListe("TAGES_FRAGEN"),
  grabFn("planKnoepfeHtml"),
  "module.exports = { SIMPELHEIT_STUFEN, simpelheitListe, TAGES_FRAGEN, planKnoepfeHtml };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die Hauptaktion je Plan-Art ---------- */
/* Der erste Knopf im HTML ist der linke — und `primaer` macht ihn gelb. */
function ersterKnopf(html){ return (html.match(/<button class="([^"]*)"[^>]*>([^<]*)<\/button>/) || []).slice(1); }
function knoepfe(html){
  const treffer = [...html.matchAll(/<button class="([^"]*)"[^>]*onclick="[^"]*?;(\w+)\(/g)];
  return treffer.map(t => ({ klasse: t[1], aufruf: t[2] }));
}
const ausdauer = A.planKnoepfeHtml({ id:"p1", typ:"aktivitaet" });
const aK = knoepfe(ausdauer);
pruefe("eine Ausdauer-Karte hat zwei Knoepfe", aK.length === 2);
pruefe("vorn steht das Eintragen", aK[0].aufruf === "planErledigt");
pruefe("und es ist die gelbe Hauptaktion", /primaer/.test(aK[0].klasse));
pruefe("die Stoppuhr steht daneben", aK[1].aufruf === "trainingStarten");
pruefe("und ist NICHT gelb", !/primaer/.test(aK[1].klasse));
pruefe("die Beschriftungen sagen, was passiert",
  ausdauer.includes(">Eintragen<") && ausdauer.includes(">Stoppuhr<"));

const intervall = A.planKnoepfeHtml({ id:"p2", typ:"aktivitaet", intervall:{ runden:3 } });
const iK = knoepfe(intervall);
pruefe("beim Intervall bleibt der Timer vorn", iK[0].aufruf === "trainingStarten");
pruefe("und gelb", /primaer/.test(iK[0].klasse));
pruefe("er heisst weiterhin Runden", intervall.includes(">Runden<"));
pruefe("daneben steht das Eintragen", iK[1].aufruf === "planErledigt");

const kraft = A.planKnoepfeHtml({ id:"p3", typ:"kraft" });
const kK = knoepfe(kraft);
pruefe("Kraft bleibt unveraendert: Start vorn und gelb",
  kK[0].aufruf === "trainingStarten" && /primaer/.test(kK[0].klasse) && kraft.includes(">Start<"));
pruefe("daneben Erledigt (die Sollwerte, v80)",
  kK[1].aufruf === "kraftErledigt" && kraft.includes(">Erledigt<"));
/* Die v125-Zusage gilt weiter: kein Knopf loest das Oeffnen der Karte mit aus. */
pruefe("jeder Knopf stoppt die Weiterreichung",
  [ausdauer, intervall, kraft].every(h =>
    (h.match(/<button/g) || []).length === (h.match(/event\.stopPropagation\(\);/g) || []).length));
/* Die schlanke Zeile traegt nur die EINE Hauptaktion — dieselbe wie oben. */
pruefe("die schlanke Zeile fuehrt bei Ausdauer ebenfalls ins Eintragen",
  /p\.intervall \|\| !istAkt \? "trainingStarten" : "planErledigt"/.test(src));
pruefe("und beschriftet sie gleich",
  /p\.intervall \? "Runden" : istAkt \? "Eintragen" : "Start"/.test(src));
/* Weil die Zeile die Stoppuhr nicht mehr zeigt, muss sie im Menue stehen. */
const menue = grabFn("planMenue");
pruefe("der lange Druck bietet die Stoppuhr an", menue.includes('text:"Stoppuhr"'));
pruefe("aber nicht beim Intervall-Plan (dort steht der Timer an der Zeile)",
  menue.includes('plan.typ === "aktivitaet" && !plan.intervall'));
pruefe("und die Eintragen-Aktion heisst dort auch so",
  menue.includes('plan.typ === "aktivitaet" ? "Eintragen" : "Erledigt"'));

/* ---------- 2) Die Sackgasse auf der Stoppuhr ---------- */
const fertig = grabFn("stoppuhrFertig");
pruefe("es gibt keine Meldung mehr, die ins Leere verweist",
  !fertig.includes("erst starten oder die Zeit von Hand eintragen"));
pruefe("stattdessen fuehrt der Knopf ins Formular",
  fertig.includes("eintragenOeffnen(plan, sekunden < 10 ? 0 : sekunden)"));
pruefe("die Uhr wird trotzdem aufgeraeumt (keine tote Ansicht)",
  fertig.indexOf("stoppuhrAufraeumen()") < fertig.indexOf("eintragenOeffnen"));
pruefe("der Plan wird VOR dem Aufraeumen gemerkt",
  fertig.indexOf("const plan = stoppuhr.plan") < fertig.indexOf("stoppuhrAufraeumen()"));

/* ---------- 3) Die Stufen-Auswahl vergleicht wieder ---------- */
const stufen = A.simpelheitListe();
pruefe("es sind weiterhin fuenf Stufen", stufen.length === 5);
pruefe("jede hat eine kurze Zeile", stufen.every(s => typeof s.kurz === "string" && s.kurz.length > 0));
pruefe("und die bleibt kurz (eine Zeile)", stufen.every(s => s.kurz.length <= 45));
pruefe("sie unterscheiden sich alle",
  new Set(stufen.map(s => s.kurz)).size === 5);
pruefe("die ausfuehrliche Fassung bleibt erhalten",
  stufen.every(s => s.fuer && s.text));
pruefe("die kurze Zeile ist nicht die lange",
  stufen.every(s => s.kurz !== s.text && s.kurz !== s.fuer));
const auswahl = grabFn("simpelheitFrageZeichnen");
pruefe("sie steht sichtbar in der Karte", auswahl.includes("<small>' + text(s.kurz)"));
pruefe("das i bleibt daneben",
  auswahl.includes("infoUmschalten") && auswahl.includes("stufe-info-"));
pruefe("und dahinter die volle Fassung",
  auswahl.includes("text(s.fuer)") && auswahl.includes("text(s.text)"));
pruefe("auf der gelben Karte bleibt sie lesbar (v173-Falle)",
  /\.stufe-wahl\.gewaehlt small\{color:#16181C/.test(src));
pruefe("es gibt ein Stylesheet dafuer", /\.stufe-wahl small\{/.test(src));

/* ---------- 4) Schlaf: getrennt, aber erklaert ---------- */
const schlaf = A.TAGES_FRAGEN.find(f => f.id === "schlecht");
pruefe("die Frage gibt es weiterhin", !!schlaf);
pruefe("sie traegt jetzt eine Notiz", !!schlaf.notiz);
pruefe("die Notiz nennt beide Seiten",
  /Stundenzahl/.test(schlaf.notiz) && /Tageswerte/.test(schlaf.notiz));
pruefe("nur DIESE Frage hat eine Notiz (kein Text auf Vorrat)",
  A.TAGES_FRAGEN.filter(f => f.notiz).length === 1);
pruefe("der Check zeigt sie an", grabFn("tagesCheckZeichnen").includes("f.notiz ?"));
pruefe("und maskiert sie", grabFn("tagesCheckZeichnen").includes("text(f.notiz)"));
/* Die Stundenzahl bleibt, wo sie war — sonst verloere die Belastungs-Rechnung
   ihre einzige gemessene Schlaf-Groesse (v167). */
pruefe("der Tageswert Schlaf bleibt bestehen", /id:"schlaf",\s*name:"Schlaf",\s*einheit:"h"/.test(src));
pruefe("und rechnet weiter mit", /function schlafFaktor\(/.test(src) || /schlaf/i.test(grabFn("rechnungsGrundlage")));

/* ---------- 5) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v202",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 202);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.202", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
