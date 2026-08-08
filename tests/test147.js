/* v147-Test: vier Wuensche aus der Ideen-Box.
   1) Editor: die obere Zeile traegt NUR den Plan-Namen (planEinstText ist weg).
   2) Editor: die Muskel-Karte hat keine Beschriftung mehr und zeigt grosse Figuren.
   3) Plaene-Uebersicht: ein Plan ohne festen Tag bekommt gar keine Tag-Zeile.
   4) Ziele: derselbe Knopf ist + (zu) bzw. × (offen).
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

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die obere Zeile traegt nur den Namen ---------- */
const zeichnen = grabFn("editorZeichnen");
pruefe("Zeile wird aus dem Plan-Namen gesetzt",
  zeichnen.includes('document.getElementById("plan-einst-stand").textContent = editorPlan.name.trim() || "Einstellungen"'));
pruefe("kein Stand-Text mehr auf der Zeile", !zeichnen.includes('"Einstellungen: "'));
/* v193: Die Ueberschrift hat wieder eine id — sie wechselt jetzt zwischen „Plan
   bearbeiten" und „Uebung bearbeiten" (Umschalter im Kopf, Etappe 2 der
   Uebungs-Entscheidung). Die v147-Zusage bleibt: Sie traegt NICHT den
   Plan-Namen, der stuende sonst doppelt da. Genau das wird hier geprueft. */
pruefe("Ueberschrift traegt nicht den Plan-Namen",
  !grabFn("editorArtZeichnen").includes("editorPlan.name"));
const tippen = grabFn("planNameTippen");
pruefe("Tippen schreibt auf dieselbe Zeile", tippen.includes('getElementById("plan-einst-stand")'));
pruefe("Tippen zeichnet den Editor NICHT neu", !tippen.includes("editorZeichnen"));
pruefe("ohne Namen bleibt ein Wegweiser stehen", tippen.includes('|| "Einstellungen"'));

/* ---------- 2) Muskel-Karte im Editor: ohne Text, grosse Figuren ---------- */
const editor = src.split('<section id="view-editor"')[1].split("</section>")[0];
pruefe("Beschriftung ist raus", !src.includes('id="editor-muskeln-text"') && !editor.includes("Trifft diese"));
pruefe("Figuren-Ziel steht weiterhin in der Karte", editor.includes('<div id="editor-muskeln-figuren"></div>'));
/* v223: Die Breite steht nicht mehr als `width`, sondern als `--fb` — die Figur
   rechnet daraus `--fb × --fs` (Ausgleich der beiden Zeichnungs-Groessen). Die
   Aussage hier bleibt dieselbe: Im Editor gross, auf der Karte klein. */
const breite = regel => {
  const m = src.match(new RegExp(regel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\{[^}]*--fb:(\\d+)px"));
  return m ? Number(m[1]) : null;
};
const imEditor = breite("#editor-muskeln .plan-figuren .mini-figur");
const aufKarte = breite(".plan-figuren .mini-figur");
pruefe("Editor-Figuren sind gross (ist: " + imEditor + " px)", imEditor >= 100);
pruefe("auf der Plan-Karte bleiben sie klein (ist: " + aufKarte + " px)", aufKarte !== null && aufKarte <= 40);
pruefe("Editor-Figuren sind groesser als die auf der Karte", imEditor > aufKarte);

/* ---------- 3) Plaene-Uebersicht ohne Leer-Aussage ---------- */
/* Nur die PLAENE-UEBERSICHT ist gemeint. Der Wizard fasst seine eigene Auswahl
   weiterhin so zusammen — dort ist die Aussage eine Antwort auf eine Frage, die
   der Nutzer gerade beantwortet hat, und damit sinnvoll. */
const liste = grabFn("planListeZeichnen");
pruefe("die Plan-Karte sagt es nicht mehr", !liste.includes("ohne festen Tag"));
/* v192: Die Zeile ueber dem Plan-Namen traegt jetzt zusaetzlich die Marke
   „Uebung"/„Plan" (Etappe 1 der Uebungs-Entscheidung) und steht deshalb immer.
   Die v147-Zusage bleibt inhaltlich erhalten und wird hier genau so geprueft:
   Ein Plan OHNE festen Tag bekommt dort weiterhin KEINEN Ersatztext, der nur
   mitteilt, dass es nichts mitzuteilen gibt. */
pruefe("Tag-Text wird nur bei festen Tagen gebaut",
  liste.includes('(marke ? text(marke) : "")'));
pruefe("ohne Tag ist die Marke leer",
  liste.includes('const marke = p.tage.length ? p.tage.map(t => WOCHENTAGE[t].slice(0,2)).join(", ") : "";'));

/* ---------- 4) Ziele: + wird zu × und zurueck ---------- */
const knopf = { textContent:"+", attrs:{}, setAttribute(k,v){ this.attrs[k] = v; } };
const formular = { hidden:true };
const modul = { exports: {} };
new Function("document", "module", "exports",
  grabFn("zielPlusZeichnen") + "\nmodule.exports = { zielPlusZeichnen };"
)({ getElementById: id => id === "ziel-plus" ? knopf : formular }, modul, modul.exports);
const zielPlusZeichnen = modul.exports.zielPlusZeichnen;

zielPlusZeichnen();
pruefe("zugeklappt zeigt der Knopf ein Plus", knopf.textContent === "+");
pruefe("Vorlese-Text passt zum Plus", knopf.attrs["aria-label"] === "Ziel hinzufügen");
formular.hidden = false;
zielPlusZeichnen();
pruefe("aufgeklappt zeigt der Knopf ein x", knopf.textContent === "×");
pruefe("Vorlese-Text passt zum x", knopf.attrs["aria-label"] === "Eingabe schließen");
formular.hidden = true;
zielPlusZeichnen();
pruefe("wieder zugeklappt ist es wieder ein Plus", knopf.textContent === "+");

/* Jede Stelle, die das Formular umschaltet, muss den Knopf nachziehen —
   sonst zeigt er irgendwann das Gegenteil dessen, was er tut. */
pruefe("Umschalten zieht den Knopf nach", grabFn("zielFormularZeigen").includes("zielPlusZeichnen()"));
pruefe("Oeffnen der Ansicht zieht den Knopf nach", grabFn("zieleOeffnen").includes("zielPlusZeichnen()"));
pruefe("Speichern zieht den Knopf nach", grabFn("zielEintragen").includes("zielPlusZeichnen()"));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
