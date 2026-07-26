/* v119-Test: Audit-Bugfixes. Die Fixes sind chirurgisch (Referenzen, Escaping,
   Nachrüstung, Wake-Lock, Shadowing) — hier struktureller Quelltext-Check, dass sie
   drin sind und nicht wieder herausfallen. */
"use strict";
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* #1 kritisch: aktivitaetAblegen nimmt die gepushte Referenz, nicht protokoll[last]. */
pruefe("aktivitaetAblegen: const eintrag = neu", src.includes("const eintrag = neu;"));

/* #2: Aktionsmenü escapt den (Nutzer-)Text. */
pruefe("aktionsMenue escapt a.text", src.includes("')\">' + text(a.text) + '</button>'"));

/* #3: datenNachruesten rüstet profil nach. */
pruefe("datenNachruesten: profil-Nachrüstung", src.includes('daten.profil = {};'));

/* #4: Wake-Lock auch für Stoppuhr/Intervall. */
pruefe("Wake-Lock deckt stoppuhr/ivLauf", src.includes("(stoppuhr && stoppuhr.laeuft) || (ivLauf && ivLauf.laeuft)"));

/* #5: kein `let text =` mehr (verdeckte die Escaping-Funktion). */
pruefe("kein text-Shadowing", !src.includes("let text = ") && src.includes("let meldungsText ="));

/* #7: Heute-Karte kennt den Intervall-Start („Runden starten"). */
pruefe("Heute-Karte: Runden starten", src.includes('"Runden starten"'));

/* #8: tote Variable wochentag entfernt. */
pruefe("keine tote wochentag-Variable", !src.includes('const wochentag = (new Date(datum'));

/* #12: Auto-Update greift auch auf „Heute". */
pruefe("Auto-Update: view-start ist sicher", /const sicher = document\.getElementById\("view-start"\)/.test(src));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
