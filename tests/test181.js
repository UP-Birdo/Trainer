/* v181-Test: Der Assistent ist additiv — er fuegt hinzu, nimmt aber nie weg.

   Nutzer-Ansage: „Auch bei Geraeten soll Abwaehlen nicht gleich zum
   Deaktivieren fuehren … waehlst du ein neues, das du vorher nicht genutzt
   hast, wird es hinzugefuegt. So soll es auch bei den Sportarten sein: erst
   beim Wizard die Grundsachen aussuchen, beim Assistenten dann alles anzeigen —
   und was zusaetzlich dazukommt, dem Profil hinzufuegen."

   Damit gilt fuer BEIDE Mehrfach-Auswahlen dieselbe Regel:
     Ersteinrichtung  : die Auswahl BESTIMMT die Liste.
     Assistent danach : Auswahl gilt fuer DIESEN Lauf; Neues kommt ins Profil,
                        Abgewaehltes bleibt dort stehen.

   Geprueft werden die Vereinigung selbst, beide Anwendungsstellen, und die
   Eigenheit der Geraete: Sie haengen am ORT — zusammengefuehrt wird nur der,
   den man gerade einstellt.
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

const modul = { exports: {} };
new Function("module", "exports", [
  grabFn("vereinigt"),
  "module.exports = { vereinigt };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die Vereinigung ---------- */
pruefe("Neues kommt dazu",
  A.vereinigt(["kraft"], ["kraft","yoga"]).join(",") === "kraft,yoga");
pruefe("Abgewaehltes bleibt stehen",
  A.vereinigt(["kraft","laufen"], ["kraft"]).join(",") === "kraft,laufen");
pruefe("beides zugleich",
  A.vereinigt(["kraft","laufen"], ["kraft","yoga"]).join(",") === "kraft,laufen,yoga");
pruefe("keine Dubletten",
  A.vereinigt(["a","b"], ["b","a"]).join(",") === "a,b");
pruefe("die Reihenfolge des ersten Vorkommens bleibt",
  A.vereinigt(["b","a"], ["c"]).join(",") === "b,a,c");
pruefe("leere Auswahl aendert nichts",
  A.vereinigt(["kraft"], []).join(",") === "kraft");
pruefe("leerer Bestand uebernimmt die Auswahl",
  A.vereinigt([], ["kraft","yoga"]).join(",") === "kraft,yoga");
pruefe("null faellt nicht um",
  A.vereinigt(null, null).length === 0 && A.vereinigt(null, ["x"]).join(",") === "x" &&
  A.vereinigt(["x"], null).join(",") === "x");
/* Rein: das Original darf nicht verändert werden. */
const bestand = ["kraft"];
A.vereinigt(bestand, ["yoga"]);
pruefe("die Eingabe bleibt unangetastet", bestand.join(",") === "kraft");

/* ---------- 2) Beide Anwendungsstellen ---------- */
const fertig = grabFn("plaeneErstellen");
pruefe("die Rolle entscheidet, ob nur ergaenzt wird",
  /const nurErgaenzen = wzSportartenGesetzt;/.test(fertig));
pruefe("die Sportarten werden vereinigt",
  /vereinigt\(altEinr\.sportarten \|\| \[\], einrichtung\.sportarten\)/.test(fertig));
pruefe("die Geraete auch",
  /vereinigt\(\(altKraft\.geraeteProOrt \|\| \{\}\)\[ort\] \|\| \[\], proOrt\[ort\] \|\| \[\]\)/.test(fertig));
pruefe("bei der Ersteinrichtung bestimmt die Auswahl beide Listen",
  /: einrichtung\.sportarten\.slice\(\)/.test(fertig) &&
  /if\(nurErgaenzen\)\s*\n?\s*proOrt\[ort\] = vereinigt/.test(fertig));
pruefe("beide Stellen nutzen DIESELBE Funktion",
  (fertig.match(/vereinigt\(/g) || []).length === 2);

/* ---------- 3) Der alte Stand wird VOR dem Ueberschreiben gelesen ---------- */
/* Sonst stuende dort schon der neue und die Vereinigung waere wirkungslos. */
pruefe("die alte Einrichtung wird vorher gelesen",
  fertig.indexOf("const altEinr = sitzung.daten.einrichtung") <
  fertig.indexOf("sitzung.daten.einrichtung = {"));
pruefe("die alten Geraete auch",
  fertig.indexOf("const altKraft = geraeteKonfig") <
  fertig.indexOf("sitzung.daten.einrichtung = {"));
pruefe("und die Vereinigung passiert davor",
  fertig.indexOf("proOrt[ort] = vereinigt") < fertig.indexOf("sitzung.daten.einrichtung = {"));

/* ---------- 4) Geraete haengen am ORT ---------- */
pruefe("zusammengefuehrt wird nur der gerade bearbeitete Ort",
  /const ort = einrichtung\.ort \|\| "zuhause";/.test(fertig) &&
  /proOrt\[ort\] = vereinigt/.test(fertig));
pruefe("die uebrigen Orte gehen unveraendert durch",
  /const proOrt = JSON\.parse\(JSON\.stringify\(einrichtung\.geraeteProOrt \|\| \{\}\)\);/.test(fertig));
pruefe("das Profil bekommt die Liste dieses Ortes",
  /const geraeteJetzt = \(proOrt\[ort\] \|\| \[\]\)\.slice\(\);/.test(fertig));
pruefe("und der Pro-Sport-Speicher denselben Stand",
  /kraftK\.geraete = geraeteJetzt\.slice\(\);/.test(fertig) &&
  /kraftK\.geraeteProOrt = JSON\.parse\(JSON\.stringify\(proOrt\)\);/.test(fertig));
pruefe("der Pro-Sport-Speicher geht nicht verloren (v55)",
  /geraeteKonfig: altEinr\.geraeteKonfig \|\| \{\}/.test(fertig));

/* ---------- 5) Die PLAENE folgen weiterhin der Auswahl dieses Laufs ---------- */
/* Wer „zuhause, nur Koerpergewicht" sagt, soll keinen Plan mit dem Gym-Rack
   bekommen — auch wenn das Rack im Profil bleibt. */
pruefe("der Generator liest die Arbeitskopie, nicht das Profil",
  /function verfuegbareGeraete\(\)\{ return \["keine"\]\.concat\(einrichtung\.geraete \|\| \[\]\); \}/.test(src));
pruefe("und baut Plaene nur fuer die gewaehlten Sportarten",
  /einrichtung\.sportarten\.includes\(p\.sportart\)/.test(fertig));

/* ---------- 6) Der Assistent zeigt wieder alles ---------- */
pruefe("die Sonderbehandlung nurEigene ist restlos weg", src.indexOf("nurEigene") < 0);
/* Gesucht ist der KNOPF, nicht das Wort — im Neuigkeiten-Text steht weiterhin,
   dass es ihn gab und warum er weg ist. */
pruefe("der Knopf Andere Sportart einrichten ist weg",
  src.indexOf("andereSportartAusWizard") < 0 &&
  !/onclick="[^"]*"[^>]*>Andere Sportart einrichten</.test(src));
pruefe("der Editor-Weg zu anderen Sportarten bleibt (v90)",
  /function andereSportartWaehlen\(\)\{ sportartenTabOeffnen\("editor"\); \}/.test(src));
pruefe("die Plan-Frage sagt sichtbar, was das Antippen bewirkt",
  /zusatz:"Abwählen entfernt nichts; Neues kommt zu deinem Profil dazu\."/.test(src));
pruefe("die Weiter-Wache unterscheidet die Fassungen ohne nurEigene",
  /meldung\(wzSportartenGesetzt/.test(grabFn("wzWeiter")));

/* ---------- 7) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v181",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 181);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.181", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
