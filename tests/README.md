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
| `test114.js` | Statistik-Kacheln im Raster: je `STAT_OPTIONEN`-Eintrag eine Kachel in `.stat-raster` (auto-fit; Anzahl bewusst nicht festgenagelt), Akkordeon (`statToggle`/`stat-inhalt`/`stat-kopf`) restlos entfernt, jede STAT_OPTIONEN-id hat ihre Karte, Info-Texte draußen |
| `test115.js` | Nicht-Kraft Etappe 1: generische Messgröße `massText` (Beweglichkeit in Grad nur bei Sportart mit `mass` + Wert) + Verdrahtung (Yoga-Config, `ein-mass`, `aktivitaetAblegen`-Messwert, Protokoll-Anzeige) |
| `test116.js` | Statistik-Kacheln entschlacken: kleine `.stat-karte h2` + `rund klein` im CSS, Körpergewicht mit kleinem „+" und antippbarer Kurve (→ Details), separater Details-Knopf entfernt |
| `test117.js` | Nicht-Kraft Etappe 2: `massText` mit Ordinalskala (Kletter-Grad als String, ohne Einheit) + numerische Regression + Verdrahtung (Klettern-Skala, `ein-mass-select`, `massFeldAufbauen`/`massEingabe`, truthy-Guard) |
| `test118.js` | Nicht-Kraft Etappe 3: Intervall-Logik `intervallPhasen`/`intervallGesamt`/`intervallPhaseBei` (Phasen-Abfolge, keine End-Pause, Gesamtdauer, aktuelle Phase + Restsekunden). Timer/Töne/Wake nur am Gerät prüfbar |
| `test119.js` | Audit-Bugfixes: `const eintrag = neu` (Sort-Bug), `text(a.text)`-Escaping, `profil`-Nachrüstung, Wake-Lock für Stoppuhr/Intervall, kein `text`-Shadowing, „Runden starten", `view-start` im Auto-Update |
| `test120.js` | Haupt-Tabs entschlacken: `statHatDaten` (Körpergewicht manuell immer, andere nur mit Daten) + strukturelle Checks (Serie-Label/Kein-Training-Hinweis weg, Körpergewicht volle Breite, kleine Überschrift, Heute nur Trainingsplanung) |
| `test121.js` | Nicht-Kraft Etappe 4: Ziel + Fortschritt je Messgröße — `massZahl` (Ordinalskala als Rang, Komma-Eingabe), `massVergleich` (Ziel erreicht?, `null` bei fehlendem Wert), `massSchritt`/`massKlemmen` (ein Schritt + Grenzen), `planZielText` (eine Ziel-Zeile) und `intervallSteigern` (eine Runde mehr, solange ≤ 20 %, sonst Belastung) + Verdrahtung |
| `test122.js` | Muskelkarte „Beide" + Einfachheits-Zeile: `muskelAnsichten` (beide → front+back, kein stiller Fallback) + Verdrahtung (Figuren gebaut statt fester IDs, Treffer aus dem getippten Block, Einfachheit als `einst-zeile` mit Stufe im Namen, Erklärtext in der Auswahl) |
| `test123.js` | Weniger Text auf den einfachen Stufen: Muster-Hinweis hinter dem „i" (nur Stufe 1, klappt beim Stufenwechsel zu), kurzer Platzhalter, Getan-Untertitel + Plus-Erklärung weg, zwei Füll-Sätze auf „Heute" weg — informativer Ruhetag-Untertitel bleibt |
| `test124.js` | Sportart-Frage statt Auto-Plan + Langdruck auf Übungs-Karten: `uebungMenue` (Pfeile nur wo sie hinführen, Ersatztitel, unbekannter Index öffnet nichts) + Verdrahtung (`langdruckBinden` für beide Kartenarten, `data-uebung`, Neu-Anbindung nach dem Zeichnen, zwei Antworten, Nachhol-Knopf nur ohne Plan) |
| `test125.js` | Plan per Kurz-Tipp öffnen + Muskel-Map an gelisteten Übungen: `planTippen` (Gate ab Stufe 3) + Verdrahtung (Karte/Zeile tragen den Tipp, Knöpfe stoppen das Bubbling, Klick nach dem Langdruck wird einmal geschluckt, Kopf-Figur nur bei erkannten Muskeln) |
| `test126.js` | Editor-Feinschliff: `planTageText` (Stand-Zeile: kein fester Tag / „Mo, Do" / Takt 2 genannt, Takt 1 nicht) + Verdrahtung (Wochentage-Block zugeklappt, Übungen/Picker erst mit Sportart, einzige Profil-Sportart vorausgewählt) |
| `test127.js` | Rekord-Moment: `satzWert`/`rekordText`/`istNeuerRekord` (Historie UND laufendes Training, zweiter gleicher Satz meldet nicht, erster Satz ohne Historie ist kein Rekord) + Verdrahtung (Kopie vor dem Anhängen, Toast) |
| `test128.js` | Mehrfach-Auswahl von Plänen: `auswahlText` (1 Plan / N Pläne) + `eintraegeZurueck` (ein Rückgängig für die ganze Aktion — aufsteigend einsetzen, Rand-/Alles-Fälle, Übergabereihenfolge egal) + Verdrahtung (Menü-Einstieg, Tipp hakt an, Langdruck gesperrt, Tabwechsel beendet) |
| `test129.js` | Leer-Zustand + „+"-Menü: `planNeuWege` (Assistent ab Stufe 5, Beispielplan nur bei Kraft, Intervall nur einmal trotz mehrerer Intervall-Sportarten, Nachtragen zuletzt) + Struktur (Leer-Zustand rendert genau einen Knopf, fester Intervall-Knopf weg) |
| `test164.js` | Zurück-Wischen von der linken Kante: `wischZurueck` (Kante, Mindestweg, erlaubte Schräge, Gegenrichtung, Randfälle) + der **Vertrag im HTML** — jede Ansicht mit Zurück-Knopf ist markiert (`data-zurueck`), und Editor/Training/Bewertung/Ergebnis sind es bewusst **nicht**; dazu die vier Wachen im `touchstart`, „Zurück" links im Kopf und „Abbrechen" im Aktionsmenü |
| `test163.js` | Mehrfach-Löschen in den Listen mit Daten: läuft über das **echte Register** `LISTEN_TYPEN` (jede Liste wird auf Vollständigkeit geprüft, eine neue kommt automatisch dazu) — Rückfrage vor jedem Löschen, EIN Rückgängig stellt Inhalt **und** Reihenfolge her, „Alle" nimmt nur Sichtbares (Körpermaß-Filter, Zehner-Grenze fällt im Modus weg), Verlauf geht in den Papierkorb, Gewicht nicht, Modus endet mit seiner Ansicht |
| `test162.js` | Rote Einfärbung überlasteter Muskeln: `lastFarbe` (Signalfarbe bis 70 %, stetiger Übergang, Warnrot ab 130 %, keine Sprünge, Randfälle) + Verdrahtung an **einer** Stelle (`muskelnAufCanvas`) und Quoten genau **einmal** je Zeichenlauf |
| `test161.js` | Belastungs-Rechnung nutzt Vorhandenes: `satzGewichtung` (Note wiegt den Satz, relative Intensität **nur als Ersatz** — nie beides, ohne beides neutral), `maxGewichtJeUebung`, Wirkung auf `muskelLast` (harte vs. leichte Sätze, auch für Sekundärmuskeln, Regression ohne Noten) + `leistungFaellt` als **eigene** Aussage — geprüft wird, dass die Last-Rechnung `verfehltFolge` gar nicht kennt |
| `test160.js` | Belastungs-Modell der Muskelkarte: `alterJahre`, `kapazitaetsFaktor` (Erfahrung/Alter/Geschlecht/Bonus — und **hart geprüft, dass Körpergewicht und BMI NICHT eingehen**), `muskelKapazitaet`, `muskelLast` (Fenster, Sekundär zählt halb, Soll-Sätze raus, Tage seit dem letzten Reiz), `muskelAuslastung`/`auslastungStufe` + Verdrahtung in Detail-Karte und Statuszeile |
| `test159.js` | Gewicht im Training + Plan zieht nach: `sollVerfehlt` (zu wenig Wdh **oder** zu wenig Gewicht, Dropsätze/Körpergewicht/Zeit ausgenommen), `effektiveNote` mit Gewicht, `progressionAnwenden` (einmal ändert nichts, zweimal übernimmt Wdh + Gewicht, Zähler-Reset, `wdhMin` als Boden, Deload hat Vortritt, ohne Angabe alte Progression) + `gewichtSchrittFuer`/`hatGewicht` und die Verdrahtung |
| `test158.js` | Sollwerte zählen nicht als Leistung: `echteSaetze`/`istSollEintrag` (rein, kaputte Eingaben, `soll:false` gilt als echt, alte Einträge ohne Feld bleiben gemessen) + die Trennlinie in **beide** Richtungen — Bestwerte/Rekord/Fortschritt/„letztes Mal" filtern, Volumen/Heatmap/Serie/Kalender **nicht** — und die Kennzeichnung im Verlauf |
| `test157.js` | Tipp-Vorschläge im Notizblock: `notizAktuelleZeile` (Zeile unter dem Cursor, Ränder geklemmt), `notizVorschlaege` (ab 2 Zeichen, Anfangs-Treffer zuerst, fertiger Name schlägt sich nicht selbst vor, Mengen stören nicht), `notizZeileMitName` (Name ersetzen, Mengen behalten, verdrehte Zahlen gerade ziehen) + Verdrahtung inkl. `onmousedown`-Fokus-Trick und „gespeichert wird erst beim Verlassen" |
| `test156.js` | Stufen-Auswahl in der Denkrichtung: die gespeicherten Nummern 1..5 bleiben **unverändert** (Datenvertrag), jede Stufe nennt ihre Zielgruppe (`fuer`, alle verschieden, Vollausbau = für den Anfang, Notizblock = für Erfahrene), `simpelheitListe` sortiert 5→1 und enthält jede genau einmal + Verdrahtung (keine Nummer im Knopf und in der Mehr-Zeile, Zielgruppe über der Funktionsliste, Erst-Frage nach dem Umfang) |
| `test155.js` | Notizblock-Autokorrektur: `notizZeileDeuten` (Muster unverändert; Kurzform „Name 3 10" in jeder Reihenfolge, mit `x`, kleinere Zahl = Sätze; Zahlen IM Namen überleben — „500-m-Intervalle 3 10", „Kurzhantel 20 kg 3 10"; eine Zahl allein oder nackte Zahlen ergeben nichts) + Rückschreibung ins Feld und der Beleg, dass „Getan" und das „i" ganz weg sind, das Datenfeld `freitext` aber bleibt |
| `test154.js` | **Stufen-Register**: jede `<section id="view-…">` braucht eine Entscheidung — Mindeststufe in `VIEW_MIN_STUFE` **oder** ausdrücklicher Eintrag „gilt ab Stufe 1"; keine Karteileichen in beide Richtungen, `viewErlaubt`/`navTabsFuerStufe` je Stufe, kein Tab auf eine gesperrte Ansicht, jede Stufe hat ein Zuhause + die stufenabhängigen Blöcke (Audio ab 3, Statistik-Auswahl ab 4, Profil ab 5, Ziele ab 5) |
| `test153.js` | Drei Ideen-Box-Wünsche: `muskelFigurenHtml` (beide Seiten nur, wo beide getroffen werden — Reihenfolge vorne/hinten, gleiche Muskel-Liste an beiden, Extra-Klasse durchgereicht), `ruhetageOhneTrainingstage` (rein, Reihenfolge bleibt, leere Eingaben) + Verdrahtung: Invariante im `speichern()` **ohne Meldung**, `fortschrittNeuZeichnen` beim Löschen, Rückgängig und Papierkorb |
| `test151.js` | Drill-Beschreibungen — **Etappen-Register** (wie `test142`, nur für `SPORT_TEXT`): oben die Liste der Sportarten, darunter Vollständigkeit je Etappe, „häufigster Fehler" in jedem Text, keine Karteileichen, Substanz-Prüfungen + `drillText` erbt aus `UEBUNG_TEXT` (Klimmzüge) und die Beschreibung steht unter dem Tipp. **Seit v152 vollständig:** jeder Drill braucht einen Text, das Register muss alle Sportarten kennen |
| `test150.js` | Wizard Teil 2 — alle Sportarten gleich tief: welche Fragen eine Sportart bekommt (Strecke/Ziel **genau dort**, wo es sie gibt — in beide Richtungen geprüft, Übungen überall), Stützpunkte vorhanden, `wzZahlFeld` (Kletter-Grade bleiben Text, sonst wäre `massVergleich` NaN) + `aktivitaetsPlaeneBauen` (Antworten landen im Plan, Reihenfolge nach Katalog, Rückfall auf die Startwerte) |
| `test149.js` | Wizard entschlackt + nach Sportarten geordnet: jede Frage trägt ihre Sportart, `wzAktualisiereSichtbar` gruppiert sie in `SPORTARTEN`-Reihenfolge (jede Gruppe zusammenhängend, nicht Gewähltes fällt weg), `wzGruppenStand` (die wievielte Frage ihrer Sportart) + Hilfetext hinter dem „i" und eine Schritt-Anzeige, die wirklich mitzählt |
| `test148.js` | Übungs-Suche als eigene Ansicht: `pickerKandidaten` mit Bereichs-, Geräte- und Art-Filter (einzeln, kombiniert, plus Suchtext, Plan-Übungen fallen raus), `pickerFilterHtml` (zwei Reihen bei Kraft, eine bei Aktivität, keine ohne Sportart, kein `<select>` mehr) + Aufbau der Ansicht (Eigene Übung ganz unten, Hinweistext weg) und die beiden Rückwege |
| `test147.js` | Vier Ideen-Box-Wünsche: Einstellungs-Zeile trägt nur den Plan-Namen (`planEinstText` ist **ganz** weg), Muskel-Karte ohne Beschriftung und mit größeren Figuren (Vergleich Editor > Plan-Karte statt fester Zahl), Plan-Karte ohne Tag-Zeile bei tagfreien Plänen (nur `planListeZeichnen`, der Wizard darf es weiter sagen) + `zielPlusZeichnen` (+/× samt Vorlese-Text, und alle drei Umschalt-Stellen ziehen nach) |
| `test146.js` | Editor-Kopf + Einfachauswahl: `planEinstText` nennt die Sportart; Struktur über die **Verschachtelung** geprüft (Name/Sportart/Wochentage/Kraft-Block **in** `#editor-einst-block`, Aktivitäts-Werte als eigene Karte **außerhalb**), Überschrift aus dem Plan-Namen, Zwangs-Aufklappen ohne Sportart, `planNameTippen` ohne Neuzeichnen + `muskelTippen` wählt in beiden Modi höchstens einen Muskel |
| `test145.js` | Drill-Katalog (81 Drills): Umfang je Sportart (≥6, Technik + Kondition), jeder Drill vollständig (Art/Modus/Sätze/Menge), Namen je Sportart eindeutig, Kurz-Tipp für jeden Drill (`drillTipp`, Erbe aus `UEBUNG_INFO`), keine Tipp-/Muskel-Leichen, nur bekannte Muskeln — und die figurlosen Drills sind **exakt** die dokumentierten sechs + Verdrahtung der Anzeige (Figur, Tipp, Nachzeichnen) |
| `test144.js` | Fortschrittsregel je Sportart-Klasse: `planGesteigert` (Ausdauer hebt Strecke + Zeit, Spielsport nur Zeit, Klettern nur den Grad, Intervall die Runden), Reinheit (Plan bleibt unangetastet), `null` wenn nichts zu heben ist, `steigerungText` verspricht nur Wirkliches, jede Klasse bleibt unter `STEIGERUNG_MAX` je Woche + Zuordnung aller Sportarten |
| `test142.js` | Übungs-Beschreibungen — **Etappen-Register**: oben eine Liste aller Kategorien (`kat`/`version`/`anzahl`), darunter die Prüfungen darüber (Kategorie vollständig, Anzahl stimmt, jeder Text nennt den häufigsten Fehler) plus die allgemeinen Substanz-Prüfungen. **Seit v143 vollständig:** jede Übung aus `UEBUNGEN_DB` braucht einen Text, das Register muss alle Kategorien kennen und seine Summe der Bibliotheksgröße entsprechen |
| `test141.js` | Übungs-Beschreibungen Etappe 2: Kategorie **druck** vollständig (33 Übungen), Bein-Etappe unversehrt, jeder Druck-Text nennt den häufigsten Fehler, plus die Substanz-Prüfungen aus `test138` |
| `test140.js` | Muskelkarte für Sportart-Drills: `uebungMuskeln` findet Drills (exakt + normalisiert, Primär/Sekundär, richtige Figur-Seite), Kraftübungen unverändert, absichtlich nicht zugeordnete Drills bleiben figurlos + Integrität von `SPORT_MUSKELN` (keine Leichen, nur bekannte Muskeln) |
| `test139.js` | Muskelkarte austauschbar + Sekundärmuskeln: Alias-Schicht gegen eine KÜNSTLICHE feinere Karte (aufgeteilter Muskel, unbekannter verschwindet), `uebungMuskelSatz` (beide Datenformen), Integrität der aktiven Karte (Name/Seite je Muskel, keine Leichen, ≤255, gültige Zuordnungen) — zugleich der Aufnahme-Test für eine künftige Karte |
| `test138.js` | Übungs-Beschreibungen (`UEBUNG_TEXT`, etappenweise): keine Karteileichen (jeder Schlüssel ist eine echte Übung), Etappe 1 (Beine) vollständig, Substanz je Text (≥120 Zeichen, ≥2 Sätze, nicht doppelt, nicht gleich dem Kurz-Tipp), jede Übung behält ihren Kurz-Tipp |
| `test137.js` | Dropsätze: `dropSaetze` (80 / 80-60 %, fallende Wdh, keine Drops bei Zeit/Körpergewicht) + Ablauf (hängt ohne Pause am Arbeitssatz) + die Wechselwirkung mit `effektiveNote` (Dropsatz bremst die Progression NICHT, ein echter schwacher Satz schon) |
| `test136.js` | Supersätze: `superBloecke` (Kopplung mit dem Nachbarn, Ketten, Schalter an der letzten Übung zählt nicht) + `imSuperatz` + der AUSGEFÜHRTE Ablauf (keine Pause zwischen Partnern, Pause danach, ungleiche Satzzahl, Rampen davor) |
| `test135.js` | Aufwärmsätze: `aufwaermSaetze` (Staffelung 60 / 50-75 / 40-60-80 %, Gewicht steigt & Wdh fallen, Rundung auf die Schrittweite, nie 0 kg, mind. 2 Wdh, keine Rampe bei Zeit/Körpergewicht/0) + Verdrahtung (vor den Arbeitssätzen, halbe Pause, nicht protokolliert, kein Rekord) |
| `test134.js` | Körpermaße: `koerpermassReihe` (nur die eigene Art, chronologisch, Original unberührt), `koerpermassSetzen` (ein Wert je Tag UND Art), `koerpermassTrend` (Zuwachs/Abnahme, Zehntel) + Tabelle und Verdrahtung (Nachrüstung, Kachel, Stufen-Gate) |
| `test133.js` | Runden-Umschalter im Editor: `planIntervallSetzen` (an/aus, Standardwerte), `editorIvSetzen`/`editorIvStufe` (Grenzen aus `IV_GRENZEN`, Runden +1 / Sekunden +5), Plan-Dauer folgt immer den Phasen, Guards ohne Intervall + Verdrahtung |
| `test132.js` | Muskel-Map des ganzen Plans: `planMuskeln` (sammelt über alle Übungen, jeder Muskel auf SEINE Seite — auch bei gemischten Übungen —, keine Doppelten, kaputte Pläne werfen nicht) + `planFigurenHtml` + Verdrahtung (Plan-Karte, Editor-Block, gemeinsamer Post-Pass) |
| `test131.js` | Grundeinstellungen hinter einer Zeile: `planEinstText` (Tage + Zirkel/Bonus bei Kraft, Ziel bei Aktivität; Normalfälle bleiben stumm) + Struktur (alle drei Blöcke im Aufklapper, Name/Sportart davor, Übungsliste danach) |
| `test130.js` | Zwei Fehler: globale `[hidden]`-Regel (schlägt eigene `display`-Regeln — sonst blieb der Statistik-Tab auf Stufe 3 stehen) + `navTabsFuerStufe` als Regression + heller iOS-Nav-Hintergrund, dunkler bleibt transparent |

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
    & $code tests\test117.js index.html
    & $code tests\test118.js index.html
    & $code tests\test119.js index.html
    & $code tests\test120.js index.html
    & $code tests\test121.js index.html
    & $code tests\test122.js index.html
    & $code tests\test123.js index.html
    & $code tests\test124.js index.html
    & $code tests\test125.js index.html
    & $code tests\test126.js index.html
    & $code tests\test127.js index.html
    & $code tests\test128.js index.html
    & $code tests\test129.js index.html
    & $code tests\test130.js index.html
    & $code tests\test131.js index.html
    & $code tests\test132.js index.html
    & $code tests\test133.js index.html
    & $code tests\test134.js index.html
    & $code tests\test135.js index.html
    & $code tests\test136.js index.html
    & $code tests\test137.js index.html
    & $code tests\test138.js index.html
    & $code tests\test139.js index.html
    & $code tests\test140.js index.html
    & $code tests\test141.js index.html
    & $code tests\test142.js index.html
    & $code tests\test144.js index.html
    & $code tests\test145.js index.html
    & $code tests\test146.js index.html
    & $code tests\test147.js index.html
    & $code tests\test148.js index.html
    & $code tests\test149.js index.html
    & $code tests\test150.js index.html
    & $code tests\test151.js index.html
    & $code tests\test153.js index.html
    & $code tests\test154.js index.html
    & $code tests\test155.js index.html
    & $code tests\test156.js index.html
    & $code tests\test157.js index.html
    & $code tests\test158.js index.html
    & $code tests\test159.js index.html
    & $code tests\test160.js index.html
    & $code tests\test161.js index.html
    & $code tests\test162.js index.html
    & $code tests\test163.js index.html
    & $code tests\test164.js index.html

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
