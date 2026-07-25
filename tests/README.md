# tests/ — Regressionskette (nur Tooling, wird NICHT deployt)

Die Tests extrahieren die ECHTEN Funktionen aus `../index.html` (keine Kopien,
die driften könnten) und prüfen sie mit Stubs. Jede Datei ist eigenständig
lauffähig und bekommt den Pfad zur `index.html` als Argument.

| Datei | prüft |
|---|---|
| `extract.js` | zieht den `<script>`-Block aus der index.html (für `node --check`) |
| `test79.js` | Notizblock: Muster-Zeilen ↔ Übungen, jede Zeile = Übung, Sportart aus Überschrift, Verschieben flach/gruppiert |
| `test80.js` | v80: Beispielplan-Felder, „Letztes Mal", kraftErledigt, Verlauf-Robustheit + v79-Regressionen |
| `test81.js` | GitHub-Issue: Repo-Ableitung aus der Pages-Adresse, URL-Bau, Fehlerfälle |
| `test82.js` | Fehlerfänger: Dialog, Dedupe pro Sitzung, Stacktrace im Issue, wirft selbst nie |
| `test83.js` | Muskelkarte: Datenintegrität (19 Muskeln), Treffer-Logik, An/Aus-Toggle |
| `test84.js` | Grobe Fallback-Zuordnung `KAT_MUSKELN` (Kategorie→Muskeln, jede DB-Kategorie abgedeckt) — feines `uebungMuskeln()` prüft test86 |
| `test85.js` | Meilenstein-Flammen (`serienMeilenstein`, Marken 7/30/100) + Scheibenrechner (`scheibenRechnen`, Zerlegung/Rest/Grenzen) |
| `test86.js` | Feine Übung→Muskel-Zuordnung (`UEBUNG_MUSKELN` vollständig/gültig, `uebungMuskeln`-Ansicht) + Heatmap (`muskelHeatLevel`, `trainierteMuskeln`-Fenster) |
| `test89.js` | Übungs-Bibliothek: `UEBUNG_INFO`-Vollständigkeit (Tipp je Übung, keine Leiche) + `bibFilter` (Kategorie/Suche) |
| `test93.js` | Statistik-Neuordnung: geteilte Tag-Logik `tagStatus` (Rolle eines Tages, Reihenfolge Training→Ruhe→Vergangenheit→Plan) + `tagZellenStil` (Färbung/Kern/Sonderpunkt) — eine Quelle für Kalender und 7-Tage-Vorschau |
| `test103.js` | Ruhetage/Flamme: `flammeGrenzdatum` (letzter Trainingstag + MAX_LUECKE+1) + `ruhetagRunLen` (Länge eines Ruhetag-Blocks) — Basis für Variante-B-Warnung + Auto-Ruhetage |
| `test108.js` | Wizard ohne Tag-Zwang: `SPLITS` deckt 0..6 Tage ab, 0/1 Tag → genau 1 Ganzkörper-Plan, bestehende Splits (2..6) unverändert |
| `test109.js` | Adaptive Pläne-Liste: `planListenDichte` (voll / zeilen / akkordeon) samt Schwellen + Sonderfall „viele Pläne, nur 1 Sportart → keine Akkordeon" |
| `test111.js` | Ziele erst mit Plan-Übung: `planUebungen`/`zieleVerfuegbar` (nichts da → aus, Plan-Übung/Aktivität → an, nur bestehendes Ziel → an, leerer Übungsname zählt nicht) |
| `test112.js` | Statistik-Karten öffnen per Tipp: „Öffnen"-Knöpfe entfernt, Karten tragen `muskelnOeffnen`/`kalenderOeffnen`, innere Ziele (Info-„i", Vorschau-Tage) stoppen das Bubbling |
| `test113.js` | Progression aus echten Wdh: `effektiveNote` (Soll erreicht → Note bleibt, unter Soll → ≥4, unter Wdh-Minimum → 5, Zeit-/satzlose Übungen unverändert) |
| `test114.js` | Statistik-Kacheln im Raster: sechs Statistiken in `.stat-raster` (auto-fit), Akkordeon (`statToggle`/`stat-inhalt`/`stat-kopf`) restlos entfernt, jede STAT_OPTIONEN-id hat ihre Karte, Info-Texte draußen |
| `test115.js` | Nicht-Kraft Etappe 1: generische Messgröße `massText` (Beweglichkeit in Grad nur bei Sportart mit `mass` + Wert) + Verdrahtung (Yoga-Config, `ein-mass`, `aktivitaetAblegen`-Messwert, Protokoll-Anzeige) |
| `test116.js` | Statistik-Kacheln entschlacken: kleine `.stat-karte h2` + `rund klein` im CSS, Körpergewicht mit kleinem „+" und antippbarer Kurve (→ Details), separater Details-Knopf entfernt |

## Ausführen

**Windows OHNE Node** (auf dem Entwicklungsrechner ist keins installiert —
VS Codes Electron springt ein):

    $env:ELECTRON_RUN_AS_NODE = "1"
    $code = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
    & $code tests\extract.js index.html $env:TEMP\trainer_check.js
    & $code --check $env:TEMP\trainer_check.js
    & $code tests\test79.js index.html
    & $code tests\test80.js index.html
    & $code tests\test81.js index.html
    & $code tests\test82.js index.html
    & $code tests\test83.js index.html
    & $code tests\test84.js index.html
    & $code tests\test85.js index.html
    & $code tests\test86.js index.html
    & $code tests\test89.js index.html
    & $code tests\test93.js index.html
    & $code tests\test103.js index.html
    & $code tests\test108.js index.html
    & $code tests\test109.js index.html
    & $code tests\test111.js index.html
    & $code tests\test112.js index.html
    & $code tests\test113.js index.html
    & $code tests\test114.js index.html
    & $code tests\test115.js index.html
    & $code tests\test116.js index.html

Mit echtem Node: `node` statt `Code.exe`, ohne die Umgebungsvariable.

**GitHub Actions:** Dieselbe Kette läuft automatisch bei jedem Push
(`.github/workflows/tests.yml`) — grünes Häkchen am Commit, Badge im README.
Dafür muss dieser `tests/`-Ordner mit im Repository liegen.

**Erwartung:** jede Datei endet mit `N ok, 0 Fehler` und Exit-Code 0.

## Hinweise

- `test77.js` (v77-Parse-Semantik) ist durch v79 („jede Zeile = Übung")
  ÜBERHOLT und bewusst nicht enthalten — seine gültigen Fälle stecken in
  `test80.js`.
- Die historische Kette aus früheren Chat-Sitzungen (`dom.js`, `flow.js`,
  `migr.js`, `pruefung.py`, `css.py` — siehe `docs/ARCHITECTURE.md`, Abschnitt „11. Arbeitsweise") liegt
  nicht (mehr) vor. Neue Tests nach demselben Muster hier ergänzen:
  Funktionen per `grabFn()` aus der index.html extrahieren, nie kopieren.
