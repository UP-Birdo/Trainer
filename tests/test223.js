/* v223-Test: Die Rueckenfigur steht ueberall in der richtigen Groesse.

   Nutzer-Befund: „Beim Plan bearbeiten ist der Ruecken nicht sync mit den
   angezeigten Muskelflaechen und das Bild ist viel kleiner."

   Am Bild nachgemessen (Verfahren in erkenntnisse.md): Die Index-Karten sind
   korrekt zu IHRER Figur ausgerichtet — die Daten stimmen, wie schon bei v216.
   Falsch war die GROESSE: Die Vorderansicht fuellt 93,5 % ihrer Rahmenhoehe, die
   Rueckansicht nur 88,4 %, und die Rahmen haben verschiedene Seitenverhaeltnisse.
   Bei gleicher Boxbreite steht der Ruecken deshalb 13,6 % kleiner daneben.
   Ausgeglichen war das an GENAU EINER Stelle von Hand (Statistik: 113 statt
   103 px) — und selbst dort zu knapp.

   Die Zusage: Die Breite einer Figur ist ein Produkt aus der Breite ihrer Stelle
   (`--fb`) und der Skala ihrer Ansicht (`--fs`) — eine Stelle, alle Figuren.
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
  src.slice(src.indexOf("const MUSKELKARTEN = {"), src.indexOf("const MUSKELKARTE_AKTIV")),
  "const MUSKEL_VIEWS = MUSKELKARTEN.standard.views;",
  grabFn("figurVerhaeltnis"),
  grabFn("miniFigurHtml"),
  "module.exports = { MUSKEL_VIEWS, figurVerhaeltnis, miniFigurHtml };"
].join("\n"))(modul, modul.exports);
const A = modul.exports;

let ok = 0, fehler = 0;
function pruefe(name, bed){ if(bed){ ok++; } else { fehler++; console.error("FEHLT: " + name); } }

/* ---------- 1) Die Karte kennt ihre Skala ---------- */
pruefe("beide Ansichten tragen eine Skala",
  A.MUSKEL_VIEWS.front.skala > 0 && A.MUSKEL_VIEWS.back.skala > 0);
pruefe("die Vorderansicht ist die Referenz", A.MUSKEL_VIEWS.front.skala === 1);
/* Der gemessene Wert: 1,157. Geprueft wird das Fenster, nicht die Nachkommastelle —
   eine neue Vorlage bringt eine neue Zahl, aber der Ruecken bleibt der groessere. */
pruefe("die Rueckansicht wird breiter gestellt",
  A.MUSKEL_VIEWS.back.skala > 1.10 && A.MUSKEL_VIEWS.back.skala < 1.25);
/* Gegenprobe an den Rahmen selbst: Die beiden Seitenverhaeltnisse sind WIRKLICH
   verschieden — daher ueberhaupt der Bedarf. */
const vf = A.MUSKEL_VIEWS.front.w / A.MUSKEL_VIEWS.front.h;
const vb = A.MUSKEL_VIEWS.back.w  / A.MUSKEL_VIEWS.back.h;
pruefe("die Rahmen haben verschiedene Seitenverhaeltnisse", Math.abs(vf - vb) > 0.02);

/* ---------- 2) Sie steht im Markup ---------- */
const stilFront = A.figurVerhaeltnis("front");
const stilBack  = A.figurVerhaeltnis("back");
pruefe("das Seitenverhaeltnis bleibt drin (v216-Regel)",
  stilFront.includes("aspect-ratio:591/1086") && stilBack.includes("aspect-ratio:468/786"));
pruefe("die Skala kommt als CSS-Variable mit",
  stilFront.includes("--fs:1") && stilBack.includes("--fs:1.157"));
pruefe("eine unbekannte Ansicht liefert nichts", A.figurVerhaeltnis("seite") === "");
const html = A.miniFigurHtml({ ansicht:"back", muskeln:["latissimus"] });
pruefe("jede Figur bekommt beides mit", html.includes("aspect-ratio") && html.includes("--fs"));

/* ---------- 3) Und das CSS rechnet damit ---------- */
pruefe("die Breite ist ein Produkt aus Stelle und Skala",
  /\.mini-figur\{position:relative;width:calc\(var\(--fb, 50px\) \* var\(--fs, 1\)\)/.test(src));
/* Jede Stelle setzt --fb statt width — sonst faellt sie aus dem Ausgleich. */
[".uebung-figur .mini-figur", ".uebung-figur.zwei .mini-figur", ".uebung-kopf .uebung-mini",
 ".koerper-vorschau .mini-figur", ".plan-figuren .mini-figur",
 "#editor-muskeln .plan-figuren .mini-figur", ".vs-zeile .mini-figur",
 ".picker-karte .mini-figur"].forEach(sel => {
  /* Eine Stelle darf mehrere Regeln haben (`.vs-zeile .mini-figur` steht
     zweimal: einmal fuer die Ausrichtung, einmal fuer die Breite) — es genuegt,
     dass EINE davon `--fb` setzt. */
  const teile = src.split(sel + "{").slice(1);
  pruefe("die Stelle " + sel + " setzt --fb",
    teile.length > 0 && teile.some(t => t.slice(0, t.indexOf("}")).includes("--fb:")));
});
/* Keine Stelle darf die Breite noch in Pixeln setzen — das umginge den Ausgleich.
   `width:100%` an Bild und Canvas ist etwas anderes und bleibt. */
pruefe("keine Figur-Stelle setzt width in Pixeln",
  (src.match(/mini-figur[^{]*\{[^}]*width:\s*\d+px/g) || []).length === 0);
/* Der handgetunte Sonderfall ist wirklich weg. */
pruefe("der Sonderfall koerper-back ist entfallen",
  !src.includes("#koerper-back{width:113px"));
/* Das Bild fuellt weiterhin die Box, der Canvas liegt exakt darueber (v216/v217). */
pruefe("das Bild fuellt die Breite, die Hoehe folgt",
  src.includes(".mini-figur img{display:block;width:100%;height:auto"));
pruefe("der Canvas deckt die Box",
  src.includes(".mini-figur canvas{position:absolute;inset:0;width:100%;height:100%}"));

/* ---------- 4) Version und Neuigkeit ---------- */
pruefe("die Auto-Update-Erkennung findet die Version genau einmal",
  (src.match(/const APP_VERSION = (\d+);/g) || []).length === 1);
pruefe("die App ist mindestens auf v223",
  Number(/const APP_VERSION = (\d+);/.exec(src)[1]) >= 223);
pruefe("die Neuigkeit ist eingetragen", src.includes('{ stand:"0.223", punkte:['));

console.log(ok + " ok, " + fehler + " Fehler");
process.exit(fehler ? 1 : 0);
