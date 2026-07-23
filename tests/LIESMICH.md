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
  `migr.js`, `pruefung.py`, `css.py` — siehe UEBERGABE Abschnitt 11) liegt
  nicht (mehr) vor. Neue Tests nach demselben Muster hier ergänzen:
  Funktionen per `grabFn()` aus der index.html extrahieren, nie kopieren.
