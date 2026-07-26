/* v131-Test: Grundeinstellungen des Plans hinter EINER Zeile.

   Der urspruengliche Kern war die reine `planEinstText` (Stand aller
   Einstellungen in einer Zeile). Die Funktion ist in v147 ersatzlos entfallen:
   Auf Nutzer-Wunsch traegt die Zeile nur noch den PLAN-NAMEN — der Stand
   (Sportart, Tage, Zirkel, Bonus) stand dort im Weg. Was bleibt und hier
   gesichert wird, ist die STRUKTUR-Zusage von v131: Es gibt genau EINEN
   Aufklapper, und alles Einstellbare liegt darin.

   Die v146/v147-Feinheiten (was genau wo liegt, Beschriftung der Zeile) prueft
   `test146` bzw. `test147`.
   Hinweis: in Test-LABELS keine typografischen Anfuehrungszeichen (Haus-Falle). */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

const editorHtml = src.split('<section id="view-editor"')[1].split("</section>")[0];

/* 1) Genau EIN Aufklapper — nicht wieder mehrere Bloecke wie vor v131. */
pruefe("eine Aufklapp-Zeile", (editorHtml.match(/editorEinstUmschalten\(\)/g) || []).length === 1);
pruefe("alter v126-Block ist ersetzt", !src.includes('id="plan-tage-block"'));

/* 2) Was im Aufklapper liegt (Stand seit v146). */
const blockAuf = editorHtml.indexOf('id="editor-einst-block"');
const blockZu  = editorHtml.indexOf("</div><!-- /editor-einst-block -->");
pruefe("Block ist geoeffnet und geschlossen", blockAuf > 0 && blockZu > blockAuf);
const drin = teil => editorHtml.indexOf(teil) > blockAuf && editorHtml.indexOf(teil) < blockZu;
pruefe("Wochentage liegen drin", drin('id="plan-tag"'));
pruefe("Kraft-Felder liegen drin", drin('id="editor-kraft"'));
pruefe("Name und Sportart liegen drin (v146)", drin('id="plan-name"') && drin('id="plan-sportart"'));

/* 3) Was BEWUSST ausserhalb liegt — beides waere ein Rueckschritt. */
pruefe("Aktivitaets-Werte liegen ausserhalb (v146)", editorHtml.indexOf('id="editor-aktivitaet"') > blockZu);
pruefe("Uebungsliste steht NACH dem Aufklapper", editorHtml.indexOf('id="uebung-liste"') > blockZu);

/* 4) planEinstText ist weg — und zwar ganz, nicht nur unbenutzt. */
pruefe("planEinstText ist entfallen (v147)", !src.includes("function planEinstText("));
pruefe("niemand ruft sie mehr auf", !src.includes("planEinstText("));
pruefe("die Bausteine leben weiter", src.includes("function planTageText(") && src.includes("function planZielText("));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
