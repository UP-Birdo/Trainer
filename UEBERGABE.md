# Trainer — Projektübergabe

> **An das nächste Chat-Fenster:** Dieses Dokument enthält alles, was du über das Projekt wissen musst.
> Es gehört zusammen mit den sechs Dateien (`index.html`, `sw.js`, `manifest.json`, `icon-180/192/512.png`)
> als Paket hochgeladen. Stand: **Version 0.025 / APP_VERSION 25**.

---

## 1. Was ist das?

Eine persönliche Trainings-App als **PWA** (Progressive Web App) für **iPhone**. Ein einzelnes HTML-File
plus Service Worker, gehostet auf **GitHub Pages**, per „Zum Home-Bildschirm" als App installiert.
Kein Server, keine Frameworks, keine Build-Kette, keine Abhängigkeiten.

**Warum so:** Alle fertigen Apps hatten Werbung, Abos oder keine eigenen Pläne. Ein Raspberry Pi wurde
bewusst verworfen (Single Point of Failure, DynDNS/Zertifikat-Aufwand, kein Nutzen — die App braucht
keinen Server).

**Nutzer:** IT-Administrator, PowerShell-Umfeld, kein Web-Entwickler. Deployment läuft über die
GitHub-Weboberfläche (Upload → Commit).

---

## 2. Deployment

| | |
|---|---|
| Repo | GitHub, öffentlich, Datei `index.html` im Root |
| Hosting | GitHub Pages (`Settings → Pages → Deploy from a branch → main → / (root)`) |
| URL | `https://DEINNAME.github.io/training/` |
| Update | Dateien im Repo überschreiben → Commit → App aktualisiert sich **selbst** (siehe Auto-Update) |

**Ablauf bei jeder Änderung:** `APP_VERSION` in `index.html` UND `VERSION` in `sw.js` hochzählen,
beide Dateien liefern, Nutzer committet.

---

## 3. Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Die komplette App (HTML + CSS + JS, ~183 kB) |
| `sw.js` | Service Worker: `index.html` Netz-zuerst, Rest Cache-zuerst |
| `manifest.json` | PWA-Manifest (Name „Trainer", standalone, portrait) |
| `icon-192/512.png` | Manifest-Icons |
| `icon-180.png` | iOS `apple-touch-icon` |

Icons zeigen vier schräge Striche (die Satz-Strichliste der App), der letzte gelb.
Erzeugt mit Python/PIL — Skript ist nicht aufgehoben, Icons bei Bedarf neu bauen.

---

## 4. Sicherheitsarchitektur (das Herzstück — nicht anfassen ohne Verständnis)

```
Passwort ──PBKDF2(310k)──► öffnet Hülle A ─┐
                                           ├──► DATENSCHLÜSSEL ──► AES-GCM ──► Kontodaten
Wiederherstellungscode ──PBKDF2──► Hülle B ─┘
```

* Pro Konto ein zufälliger **256-Bit-Datenschlüssel**. Nur er ver-/entschlüsselt die Daten.
* Der Datenschlüssel liegt **zweifach verpackt** auf der Platte: mit Passwort *und* mit
  Wiederherstellungscode (20 Zeichen, ~100 Bit, Zeichensatz ohne O/0/I/1/L).
* **Passwort vergessen ≠ Daten weg.** Code eingeben → nur Hülle A wird neu geschrieben.
* Passwort ändern braucht keine Neuverschlüsselung der Daten.
* Auf der Platte (`localStorage`, Key `trainingsapp.v3`) steht nur: Benutzername, Salze, Chiffrate.
* Falscher Schlüssel → AES-GCM wirft → **das ist zugleich die Passwortprüfung**. Kein eigener Prüfwert.
* **Export = der komplette verschlüsselte Kontoeintrag.** Braucht keine eigene Krypto, darf in iCloud liegen.
* „Angemeldet bleiben" (7 Tage, Opt-in): Datenschlüssel-**Bytes** in IndexedDB (`trainer-anmeldung`).
  Ehrlich dokumentiert: Damit liegt der Schlüssel neben den Daten — der Schutz ist dann die
  iPhone-Sperre, nicht mehr das App-Passwort. Der 7-Tage-Ablauf ist Hygiene, keine Sicherheit.
  **Abmelden löscht ihn sofort.** Passwort ändern / neuer Code verlangen dann einmal das Passwort.

**Fallstrick:** `CryptoKey`-Objekte in IndexedDB scheitern auf iOS/WebKit still. Deshalb Roh-Bytes.

**Fallstrick 2 (v24 behoben, nicht zurückbauen):** `bytesZuBase64()` arbeitet in 8-kB-Häppchen.
`String.fromCharCode(...bytes)` legt jedes Byte als eigenes Argument auf den Aufrufstapel und wirft
ab ~125.000 Bytes (V8; JSC früher) `RangeError`. Da dort die KOMPLETTEN Kontodaten durchlaufen,
wäre Speichern und Export nach wenigen Monaten Protokoll hart gescheitert.

---

## 5. Datenmodell

```js
tresor = { version:3, konten:[ { id, benutzer, huellePasswort:{salz,huelle}, huelleCode:{...}, paket:{iv,chiffre} } ] }

// entschlüsselter Inhalt von paket:
daten = {
  profil:      { groesse, geburtsjahr, geschlecht },
  gewichte:    [ { datum:"JJJJ-MM-TT", kg } ],          // ein Wert pro Tag, neuester gewinnt
  protokoll:   [ { datum, plan, sportart, sonder, dauerMin,   // v25: sportart+sonder für den Kalender
                   saetze:[ { uebungId, name, modus, satz, wdh, gewicht, dauer, note } ] } ],
  ruhetage:    [ "JJJJ-MM-TT" ],                         // manuell markiert
  ziele:       [ { id, uebung, wdh, datum } ],
  plaene:      [ { id, name, sportart:"kraft"|…, tag:1..7|null,   // v25: Tag ist ein FELD, nicht der Name
                   quelle:"assistent"|undefined, reihenfolge:"klassisch"|"zirkel",
                   aufwaermen:bool, dehnen:bool,
                   uebungen:[ { id, name, modus:"wdh"|"zeit", saetze, wdh, wdhMin, wdhMax,
                                gewicht, gewichtSchritt, dauer, pause, notenHistorie:[] } ] } ],
  einrichtung: { sportarten:["kraft"], ort, geraete:[], geraeteProOrt:{}, erfahrung, ziel,
                 wochentage:[], dauer, fokus, bonus:[] },   // ab v23 IMMER da (datenNachruesten legt sie an)
  sicherung:   { zeit, version }
}
```

### Aufwärtskompatibilität — verbindlicher Vertrag

> **Felder werden nur HINZUGEFÜGT, nie umbenannt oder entfernt.**
> `datenNachruesten()` füllt fehlende Felder mit Standardwerten und läuft bei **jedem** Login
> *und* in `leereKontodaten()` (sonst fehlen neuen Konten Felder — war ein echter Bug in v7).
> Dadurch laden alte Datenstände und alte Sicherungen in jeder künftigen Version.

---

## 6. Versionierung

```js
const APP_VERSION = 25;                              // interne Ganzzahl — bei JEDEM Update +1
const ANZEIGE_VERSION = (APP_VERSION/1000).toFixed(3);  // "0.025" — abgeleitet, kann nie auseinanderlaufen
```
* `sw.js`: `const VERSION = "v25"` mitziehen (Cache-Wechsel).
* Der Nutzer ruft aus, wann **1.0** kommt → dann Formel durch festen String ersetzen.
* Auto-Update liest per Regex `const APP_VERSION = (\d+);` aus der Datei — **muss genau einmal vorkommen**.

---

## 7. iOS-Erkenntnisse (teuer erkauft)

| Problem | Lösung |
|---|---|
| App lädt beim Antippen nicht neu (iOS weckt eingefrorene Seite) | `visibilitychange` → `index.html` mit `cache:no-store` holen, `APP_VERSION` vergleichen, `location.reload()` — **nur** in sicheren Ansichten (nie im Training) |
| Icon/Name ändern sich nie | iOS macht einen Schnappschuss. Home-Icon löschen + neu hinzufügen. Nur so. |
| `speechSynthesis` stumm | Muss in einer echten Tippgeste freigeschaltet werden (`audioFreischalten()` mit stiller Utterance) |
| Timer im Hintergrund gedrosselt/eingefroren | Töne **vorab auf dem Audio-Thread** planen (`osc.start(ctx.currentTime + n)`), Anzeige aus `Date.now()` rechnen, Wake Lock, App im Vordergrund lassen |
| `confirm()`/`alert()` blockiert | Eigener Dialog (`frage()`, `meldung()`, `passwortFrage()`) |
| Checkbox unsichtbar | Globales `input{appearance:none}` killt das Häkchen-Rendering → Umschalt-Knöpfe im App-Stil |
| Doppeltipp überspringt Schritte | 350-ms-Sperre (`tippGesperrt()`) |
| Zoom/Scrollen im Training | `touch-action:manipulation` + `maximum-scale=1` + `body.training-fest{position:fixed}` |
| Grid sprengt den Bildschirm | `repeat(7, minmax(0,1fr))` statt `1fr` — Zellinhalte blähen sonst die Spalten auf |
| `var(--x)` in SVG-Attributen | Ungültig — Schrift per CSS-Regel `.diagramm text{}` setzen |
| IndexedDB kann geräumt werden | Kein Datenverlust, App fragt dann wieder nach dem Passwort |
| Kein Hintergrund-Push, kein HealthKit | Aus dem Web nicht erreichbar. Nicht versuchen. |
| Ordner-Zugriff (`showDirectoryPicker`) | Existiert auf iOS nicht → `navigator.share()` mit konstantem Dateinamen, iOS bietet „Ersetzen" an |

---

## 8. Funktionsumfang (Stand 0.022)

**Konten:** Anmeldung, Registrierung (mit Größe/Geburtsjahr/Geschlecht/Startgewicht), Wiederherstellungscode
(einmalig angezeigt), Passwort-Reset per Code, Passwort ändern, Code erneuern, „Angemeldet bleiben" (7 Tage),
verschlüsselte Sicherung (Export via Teilen-Menü / Import), Sicherungs-Banner (nie / >7 Tage / nach Update).

**Navigation:** Bottom-Bar mit 4 Einträgen — **Pläne · Statistik · Profil · Mehr**. Ausgeblendet im
Training, Wizard, Login, Code-Bildschirm.

**Pläne (Tab 1):** Heute-Karte (Plan des Wochentags + großer Start / „Ruhetag 🌙"), Plan-Liste
(Karte = nur „Start"; **langes Drücken 500 ms** → Bearbeiten/Duplizieren/▲/▼/Löschen),
🪄 Trainingsplanung, Eigenen Plan anlegen.

**Trainingsplanung (Wizard):** Vollbild, eine Frage pro Bildschirm, wischbar, Fortschrittspunkte,
Zusammenfassung am Ende. Fragen: **Sportarten** → Ort (Zuhause/Gym/Draußen/Eigene) → Geräte (dynamisch
nach Ort, gruppiert) → Erfahrung → Ziel (Muskelaufbau/Abnehmen/Kraft/Kraftausdauer) → Wochentage (2–6) →
Dauer (3–6 Übungen) → Schwerpunkt → Bonus (Aufwärmen/Dehnen).

> **Alle Fragen ab „Ort" hängen an `nurWenn: kraftGewaehlt`.** Ohne Krafttraining gibt es nichts zu bauen:
> Der Wizard springt zur Zusammenfassung, `sportartenSichern()` speichert **nur** `sportarten` —
> Ort/Ziel/Geräte wurden nicht gefragt und dürfen deshalb auch nicht überschrieben werden.
> Neue Sportart ergänzen = Eintrag in `SPORTARTEN`. Sobald eine zweite `ausgebaut:true` bekommt, müssen
> `kraftGewaehlt()` und der Abschluss-Zweig in `wzWeiter()` überdacht werden.

**Training:** Fortschrittsbalken über alle Schritte, Phase, Übungsname, Satz-Strichliste, große Uhr,
🏆 REKORD, „Danach: …"-Vorschau, Satz fertig / ⏸ Pause / +30 s / −15 s / Abbrechen.
Ansagen per TTS, Piep bei −3 s und 0. Aufwärmen (dynamisch, 6 Übungen ~4 min) davor,
Dehnen (statisch, 6 × 30 s) danach — pro Plan schaltbar. Zirkel-Modus (Fisher-Yates pro Runde).

**Bewertung:** Note 1–5 pro Übung → `progressionAnwenden()` → Ergebnisbildschirm mit allen Änderungen.

**Statistik (Tab 2):** 🔥 Trainings-Serie groß, Kennzahlen klein, Monatskalender (gelb=trainiert,
blau=manueller Ruhetag zum Antippen, gestrichelt=automatisch), Körpergewicht (Info-Zeile mit Größe/BMI/
Veränderung + Kurve), Volumen (wächst ab erstem Training, zoomt ab 12 Wochen auf Monate, Trendzeile),
Trainings-Protokoll.

**Profil (Tab 3):** Profildaten, **Sportarten** (Mehrfachauswahl, 12 Stück, nur `kraft` ist
`ausgebaut:true`), **Ort** (4 Orte + 24 Geräte, Auswahl **pro Ort getrennt**,
„neue Geräte → Übungen einbauen"), Ziele (mit Erreichbarkeits-Einschätzung + „In Pläne einbauen"),
Trainingsplanung.

**Mehr (Tab 4):** Ton testen, Passwort/Code, Sicherung, Abmelden/Konto löschen, 📖 Gut zu wissen.

**Editor:** Name, Reihenfolge (Klassisch/Zirkel), Bonus-Schalter, Übungen (Basis-Felder mit −/+ Steppern,
Feinheiten hinter Klappe, ▲▼, Entfernen), Übung hinzufügen → **Bibliothek**.

**Bibliothek:** 83 Übungen, Suche, Kategorie-Filter, „Nur mit meinen Geräten", Freitext-Option.

---

## 8a. Sportarten & Kalender (v25)

`SPORTARTEN` trägt je Eintrag `farbe`, `einheiten` (recherchiert) und `modi`. **Nur `kraft` ist
`ausgebaut:true`** — nur dafür gibt es Generator, Progression und Volumen. Andere Sportarten:
Plan anlegen, starten, protokollieren, Kalender + Flamme — aber **keine automatische Steigerung**
(„Note 1 → +2 Wdh" ergibt bei 10 km nichts) und **kein Volumen** (sprengt sonst die Kurve).

Recherchierte Einheiten: Lauf/Rad/Schwimmen/Rudern/Wandern → Distanz + Zeit, Pace wird **gerechnet,
nie gespeichert** (sonst zwei Wahrheiten). Klettern → Routen + Grad, Skala wählbar (UIAA / französisch /
Fontainebleau / V), es gibt keine eine Skala. Rückschlag/Kampf → Runden/Sätze + Zeit.
Für die Umsetzung fehlen die Modi `strecke`, `runden`, `grad` — **noch nicht gebaut.**

**Kalenderregel (eine Regel, zwei Zeitrichtungen):** Vergangenheit + heute zeigen die **Realität**
(Training gefüllt in der Farbe seiner Sportart, sonst Ruhetag), Zukunft zeigt die **Planung**
(Wochentag eines Plans, nur umrandet). Ein Training überschreibt die Planung immer. Sondertraining
(= Plan ohne festen Tag) bekommt zusätzlich einen Punkt.

**Plan-Liste:** zeigt nur Pläne mit `tag === heute` und Pläne ohne Tag. Rest hinter „Alle Pläne zeigen"
(`alleplaeneZeigen`, bewusst NICHT gespeichert — nach jedem App-Start wieder heute).

## 9. Fachliche Regeln (belegt recherchiert)

**Progression** (die EINZIGE Stelle: `progressionAnwenden()`):
| Note | Wdh-Modus | Zeit-Modus |
|---|---|---|
| 1 viel zu leicht | +2 Wdh, Pause −15 s | +15 s |
| 2 leicht | +1 Wdh | +10 s |
| 3 passend | — | — |
| 4 schwer | Pause +15 s | Pause +15 s |
| 5 nicht geschafft | −1 Wdh, Pause +15 s | −10 s, Pause +15 s |

* **Double Progression:** Wdh > `wdhMax` → Gewicht +`gewichtSchritt`, Wdh = `wdhMin`.
  Wdh < `wdhMin` → Gewicht −Schritt, Wdh = `wdhMax`. Körpergewicht (Schritt 0): nur Wdh.
* **Deload:** 3× Note 5 in Folge → Wdh auf Min + ein Gewichtsschritt runter (Zeit: −20 %), Pause +30 s.
* Pause immer 30–300 s.

**Startwerte:** Anteil des Körpergewichts × Faktor(Erfahrung × Geschlecht × Alter).
Anfänger ×0.8, Fortgeschritten ×1.25, weiblich ×0.7, ab 50 ×0.85, ab 65 ×0.7.
Geprüft: 80-kg-Anfänger → 8 kg/Hand KH-Bankdrücken, 65-kg-Anfängerin → 5 kg (beide im empfohlenen Bereich).
**Prinzip: lieber zu leicht** — die Progression korrigiert das in 2–3 Trainings, zu schwer der Orthopäde.

**Ziele je Ziel-Auswahl:** Muskel 8–12/90 s · Abnehmen 12–20/45 s · Kraft 6–10/120 s · Ausdauer 15–25/30 s.

**Flamme:** zählt **Trainings** in Serie (nicht Kalendertage). Kette reißt erst bei **>3 Tagen** Abstand
→ bis zu 2 Ruhetage am Stück sind gratis, Mo/Mi/Fr läuft ewig. Manuelle Ruhetage verlängern die Toleranz
**nicht** (sonst wäre die Serie wertlos).

**Aufwärmen/Dehnen** (Konsens Cleveland Clinic / Harvard Health / Hinge Health):
dynamisch **vor** dem Training (5–10 min), statisch **danach** (15–60 s, 30 s Standard).
Langes statisches Dehnen auf kalte Muskeln senkt Kraft/Leistung um 5–10 % → **niemals** vorher einbauen.

**Volumen:** Wdh × Gewicht; Körpergewicht = Wdh × 1; Zeit = Sekunden ÷ 10. Bewusst grob — es geht um den Trend.

---

## 10. Code-Konventionen

* **Sprache:** Deutsche Bezeichner und Kommentare durchgehend. Antworten an den Nutzer auf Deutsch.
* **Lesbarkeit vor Effizienz** — der Code muss in Jahren ohne KI wartbar sein.
* `#region`-Blöcke gliedern das Script.
* Kommentare erklären **warum**, nicht was. Besonders bei iOS-Workarounds.
* Farb-Tokens: `--ground #16181C`, `--panel #1E2126`, `--chalk #EDEAE3`, `--muted #8C9199`,
  `--signal #F2C14E` (15-kg-Gelb, aktiv), `--rest #3E8FD6` (20-kg-Blau, Pause), `--warn #C8553D`.
  Palette aus der Welt der Wettkampf-Hantelscheiben — kein generisches Dark-Neon.
* Keine externen Bibliotheken. Kein `localStorage` für Klartext-Nutzdaten.
* Alle Nutzereingaben durch `text()` escapen (XSS ist die Achillesferse jeder Web-App).
* Tippziele ≥ 44 px. Navigation gehört in die untere Daumenzone.
* **Ausgewählt = umgefärbt.** Keine ✓-Präfixe in Knopftexten (v23 entfernt) — die Farbe trägt das allein.
* Symbole nur dort, wo das Symbol die Aussage IST (▲ ▼). Sonst Klartext.
* `--navhoehe` ist fest gesetzt; `body.nav-an .view.aktiv` rechnet den Freiraum unten daraus
  (`calc(var(--navhoehe) + 64px)`). Die Safe-Area kürzt sich raus — `body` und `#nav` haben sie beide.

## 11. Arbeitsweise mit dem Nutzer

* **Zweite und dritte Prüfung** ist Pflicht — Korrektheit hat oberste Priorität.
* **Vor dem Ausliefern testen:** JS-Syntax (`node --check`), alle `onclick`-Funktionen definiert,
  alle `getElementById`-IDs vorhanden, dazu Logiktests der geänderten Regeln.
  Diese Testkette hat bereits mehrere echte Fehler gefunden.
* Kurze, technische Erklärungen — „der allwissende gute Lehrer". Keine Textwände.
* Ehrlich sein, wenn etwas nicht geht (iOS-Grenzen) oder wenn ich falsch lag
  (Bottom-Navigation: erst abgelehnt, nach Recherche revidiert).
* Nach jedem Update: **konkrete Klick-Anleitung** zum Hochladen und Testen.
* Iterativ: bauen → testen → Rückmeldung → nachschärfen. Die erste Version ist nie die letzte.

---

## 11a. Größen & Grenzen (gemessen, Stand v24)

| | |
|---|---|
| Ein Training (4 Übungen × 3 Sätze) | ~1,4 kB JSON |
| Ein Jahr (3×/Woche) | ~219 kB Klartext → ~292 kB verschlüsselt+Base64 |
| `index.html` | 183 kB roh, **49 kB gzip** über die Leitung |
| GitHub Pages | Seite ≤ 1 GB · Repo empfohlen ≤ 1 GB · 100 GB/Monat (soft) · 10 Builds/h |
| Bindende Grenze | **localStorage ~5 MB pro Origin** (WebKit) → ~9–17 Jahre Protokoll |

Reihenfolge der Grenzen, wenn es eng wird: **1.** localStorage-Quote (→ auf IndexedDB umziehen,
`Speicher`-Modul kapselt das schon), **2.** Lesbarkeit der einen Datei, **3.** GitHub (praktisch nie:
49 kB × 100 GB = ~2 Mio Aufrufe/Monat, und der Service Worker liefert Wiederbesuche aus dem Cache).

`speichern()` verschlüsselt **immer den kompletten Datenstand** neu (22 Aufrufstellen). Das ist O(n)
pro Schreibvorgang — bei 3 MB einige Millisekunden, also unkritisch, aber der Grund, warum die
Base64-Grenze oben überhaupt gefährlich war.

## 12. Offene Ideen (nicht umgesetzt)

* **Modi `strecke` / `runden` / `grad`** — ohne sie sind Nicht-Kraft-Pläne auf `wdh`/`zeit` beschränkt
* Progression und Volumen für Nicht-Kraft-Sportarten (braucht eigene Recherche)
* Meilenstein-Flammen (7/30 Tage andere Farbe)
* Plate Calculator (erst relevant, wenn mit Langhantel trainiert wird)
* Notizfeld pro Training

**Bewusst abgelehnt** (nicht erneut vorschlagen): Cloud-Sync/Server (zerstört Zero-Knowledge, schafft
Angriffsfläche), Social/Community-Feed, Abzeichen-Sammlung, Übungsdatenbank mit Bildern/Videos
(Urheberrecht + Pflegeaufwand), Apple Health (aus dem Web unerreichbar), geplante Hintergrund-Pushes (iOS).

---

## 13. Bekannte Baustellen

* **Sportarten außer Krafttraining sind Attrappen** — gemerkt, aber ohne Wirkung. Am Knopf steht
  „noch ohne Pläne", der Nutzer weiß es. Ausbau braucht je Sportart ein eigenes Datenmodell
  (Strecke/Zeit statt Sätze/Wdh), einen eigenen Generator und einen eigenen Trainingsbildschirm.
* Der Nutzer hatte zuletzt einen **überzoomten Screenshot** — Ursache vermutlich Pinch-Zoom
  (Safari ignoriert `user-scalable=no` teilweise). Kalender-Layout wurde robust gemacht; falls es
  wieder auftritt: kein Layout-Bug, sondern Zoom.
* Der entscheidende Praxistest steht noch aus: **TTS-Ansagen über laufende Spotify-Musik** auf iOS.
  Falls sie stumm bleiben oder Spotify hart stoppen → Plan B: Ansagen vorab als WAV rendern
  (in PowerShell mit `System.Speech.Synthesis.SpeechSynthesizer` + `SetOutputToWaveFile`)
  und als `<audio>` abspielen — zählt als Medienwiedergabe und ist hintergrundsicher.

---

## 14. Wie du nach dem Umzug startest

1. Alle 7 Dateien (6 App-Dateien + dieses Dokument) ins neue Chatfenster hochladen.
2. Diesen Satz mitschicken: *„Das ist mein Trainer-Projekt, lies UEBERGABE.md — wir machen dort weiter."*
3. Der nächste Claude liest die Übergabe, kann `index.html` direkt bearbeiten und weiterbauen.
