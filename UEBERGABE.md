# Trainer — Projektübergabe

> **An das nächste Chat-Fenster:** Dieses Dokument enthält alles, was du über das Projekt wissen musst.
> Es gehört zusammen mit den sechs Dateien (`index.html`, `sw.js`, `manifest.json`, `icon-180/192/512.png`)
> als Paket hochgeladen. Stand: **Version 0.040 / APP_VERSION 40**.

---

## 1. Was ist das?

Eine persönliche Trainings-App als **PWA** (Progressive Web App) für **iPhone**. Ein einzelnes HTML-File
plus Service Worker, gehostet auf **GitHub Pages**, per „Zum Home-Bildschirm" als App installiert.
Kein Server, keine Frameworks, keine Build-Kette, keine Abhängigkeiten.

**Warum so:** Alle fertigen Apps hatten Werbung, Abos oder keine eigenen Pläne. Ein Raspberry Pi wurde
bewusst verworfen (Single Point of Failure, DynDNS/Zertifikat-Aufwand, kein Nutzen — die App braucht
keinen Server).

**Ziel/Ambition (v34):** Ein **allgemeines** Trainings-Tool, nicht primär Krafttraining. Andere
Sportarten sollen mit der Zeit **genauso tief** ausgebaut werden wie Kraft (eigenes Übungs-/Fortschritts-
Modell je Sportart), nicht als leichte Nebenschiene. Heute ist Kraft die einzige voll gebaute Sportart —
der Rest ist Gerüst. Details und der Weg dahin: Abschnitt 13.

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
Erzeugt mit `icons.py` (Python/PIL, **liegt jetzt bei**). v26: Die alten Icons hatten 0 % Mischpixel,
also gar kein Antialiasing — bei schrägen Strichen ergibt das Treppenstufen. Neu: 16-faches
Supersampling + LANCZOS. Maße sind aus dem alten 512er ausgemessen und unverändert.

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
  protokoll:   [ { datum, plan, planId, sportart, typ, sonder, dauerMin, strecke, zeitEinheit,   // planId (v35) = stabile Zuordnung; plan(Name) nur Anzeige/Altdaten-Rückfall
                   saetze:[ { uebungId, name, modus, satz, wdh, gewicht, dauer, note } ] } ],
  ruhetage:    [ "JJJJ-MM-TT" ],                         // manuell markiert
  ziele:       [ { id, uebung, art:"wdh"|"gewicht"|"zeit", wert, einheit, datum, wdh } ],  // wdh = Altfeld, liegt tot da
  plaene:      [ { id, name, sportart, typ:"kraft"|"aktivitaet", tage:[1..7],   // typ FOLGT der Sportart
                   // typ "aktivitaet": dauer(s), zeitEinheit, strecke, steigerung:{woche,stufen,vorEntlastung}
                   // uebungen[] gibt es bei BEIDEN Typen (Topspins im Tischtennis-Plan)
                   quelle:"assistent"|undefined, reihenfolge:"klassisch"|"zirkel",
                   aufwaermen:bool, dehnen:bool,
                   uebungen:[ { id, name, geraet, modus:"wdh"|"zeit", zeitEinheit:"s"|"min"|"h", saetze, wdh, wdhMin, wdhMax,
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
const APP_VERSION = 40;                              // interne Ganzzahl — bei JEDEM Update +1
const ANZEIGE_VERSION = (APP_VERSION/1000).toFixed(3);  // "0.040" — abgeleitet, kann nie auseinanderlaufen
```
* `sw.js`: `const VERSION = "v40"` mitziehen (Cache-Wechsel).
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
Training, Vorschau, Wizard, Login, Code-Bildschirm. Unterseiten behalten die Bar und markieren ihren
Bereich: Editor + Bibliothek → Pläne, **Sportart-Seite → Profil** (v30), Gut zu wissen → Mehr.
Reiter und Seitentitel heißen gleich (**Mehr**) — vorher landete man über „Mehr“ auf „Einstellungen“.

**Pläne (Tab 1):** Heute-Karte (Plan des Wochentags + großer Start / „Ruhetag 🌙“) — **auch sie ist
langdrückbar** (`data-plan`, v30). Darunter die Liste: tagfreie Pläne und weitere Pläne von heute.

> **Der Plan der Heute-Karte fällt aus der Liste raus.** `heuteKarteZeichnen()` gibt seine ID zurück,
> `planListeZeichnen()` filtert sie. Seit dem Tagesfilter (v26) stand er sonst zweimal auf demselben
> Bildschirm. Gilt auch bei „Alle Pläne zeigen“.

Darunter zwei gleichrangige Knöpfe (Trainingsplanung · Eigenen Plan anlegen), **bewusst kein `primaer`**:
Die eine gelbe Hauptaktion dieses Bildschirms ist „Training starten“.

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

**Profil (Tab 3):** Reihenfolge **Profildaten → Sportarten → Ziele** (v30: Sportarten zuerst, weil sie
Ort und Geräte überhaupt erst freischalten; Ziele setzen Pläne voraus). Die Trainingsplanung steht nur
noch im Pläne-Tab — zwei Einstiege in dieselbe seltene Aktion waren einer zu viel.
Profildaten inkl. **Gewicht** (schreibt in `daten.gewichte`, dieselbe Liste wie die Statistikkurve).
Sportarten als Liste — tippen öffnet `view-sportart`: Schalter „Diese Sportart nutze ich“, bei
Krafttraining dort Ort + 32 Geräte, Auswahl **pro Ort getrennt**, „neue Geräte → Übungen einbauen“.

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

**Plan-Liste:** zeigt nur Pläne mit `tage.includes(heute)` und Pläne ohne Tag. Rest hinter „Alle Pläne zeigen"
(`alleplaeneZeigen`, bewusst NICHT gespeichert — nach jedem App-Start wieder heute).

## 8b. Vorschau & Dauerschätzung (v26)

**Vorschau (`view-vorschau`)** liegt zwischen „Start" und Training: Inhaltsverzeichnis des ganzen
Ablaufs, dazu Klassisch/Zirkel (Zirkel erneut tippen = neu mischen), Aufwärmen/Dehnen.
Arbeitet auf einer **Kopie** (`vorschauPlan`) — der gespeicherte Plan ändert sich nie.
`audioFreischalten()` sitzt jetzt in „Los geht's": echte Tippgeste, iOS-Pflicht.

**`dauerSchaetzen(plan)`** rechnet über `ablaufErzeugen()` — dieselbe Quelle wie das echte Training,
damit die Schätzung nicht abdriften kann. `SEK_PRO_WDH = 4` (recherchiert: 2–4 s exzentrisch + 1–2 s
konzentrisch; Gegenprobe 10 Wdh x 4 s = 40 s Spannungszeit, Fenster 30–70 s).

**Gewicht im Profil** schreibt in `daten.gewichte` (ein Wert pro Tag) — dieselbe Liste wie die
Statistikkurve. Bewusst KEIN zweites Feld in `profil`: zwei Wahrheiten laufen auseinander.

## 8c. Betriebssystem (v27)

`systemErkannt()` liest den User-Agent; `systemAktiv()` = Umschalter aus `localStorage["trainer.system"]`
oder Erkennung. **Der Umschalter liegt bewusst NICHT im Konto** — er beschreibt das Gerät und würde
sonst beim Anmelden auf dem Zweitgerät mitwandern und dort das Falsche behaupten.

> **Er steuert nur TEXTE.** Das Verhalten hängt weiter an Fähigkeiten: `sicherungTeilen()` fragt
> `navigator.canShare`, nicht „ist das ein iPhone“. Das bleibt richtig, wenn ein Hersteller etwas
> nachrüstet — eine Systemabfrage nicht. Neue systemabhängige Texte über `systemText(ios, android, sonst)`;
> stehen sie fest im HTML, gehören sie zusätzlich in `systemTexteAnwenden()`.

iPadOS 13+ meldet sich als Macintosh — nur `maxTouchPoints > 1` unterscheidet es noch vom echten Mac.

**Testfalle:** Node bringt ein eigenes `navigator` mit, als Getter OHNE Setter. `globalThis.navigator = {…}`
schlägt im Test **still** fehl — alles wird dann „andere“. `Object.defineProperty` nutzen.

## 8d. Zeiteinheiten & Ziele (v29)

**Zeit wird IMMER in Sekunden gespeichert** (`u.dauer`). `u.zeitEinheit` (`s`/`min`/`h`) sagt nur, wie
angezeigt und eingegeben wird — sonst müsste jede Rechnung die Einheit mitschleppen. Obergrenze
`MAX_DAUER_S = 6 h` (vorher hart 600 s = 10 min; ein 30-min-Tischtennistraining war schlicht nicht
eintragbar). Einheit wechseln ändert die Dauer **nicht** — 90 s heißen danach 1,5 min.

> **Falle, teuer bezahlt:** `inEinheit()` rundet auf zwei Stellen (1860 s → 0,52 h). Nie damit rechnen!
> `dauerStufe()` addiert deshalb in **Sekunden** (`schritt * faktor`). Über den Anzeigewert gerechnet
> hätte jeder Tastendruck die Dauer um den Rundungsfehler verschoben — der Test hat es gefangen.

Uhr: `uhrText()` zeigt ab 1 h `h:mm:ss` („125:30“ liest niemand als zwei Stunden).
Ansage: `zeitAnsage()` sagt „30 Minuten“, nicht „1800 Sekunden“.

**Ziele** hängen an einer Übung, die **wirklich in einem Plan steht** (`planUebungen()`), sonst gäbe es
weder Ist-Stand noch Einschätzung — ohne Plan ist der +-Knopf aus. `zielArten(u)` leitet die möglichen
Ziel-Arten aus der Übung ab: Zeit-Übung → nur Dauer in **ihrer** Einheit; Wdh-Übung → Wiederholungen,
und Gewicht nur, wenn `gewichtSchritt > 0` (Liegestütze haben kein Gewicht). Die Steigerungsraten in
`zielEinschaetzen()` stammen aus `progressionAnwenden()` — dieselbe Regel, die die App wirklich anwendet.
`zielInPlan()` **kopiert** die vorhandene Übung (eigene ID, leere Notenhistorie), statt eine neue zu bauen —
nur so stimmen Modus, Zeiteinheit und Gewichte.

## 8e. Das Plansystem (v31 — der große Umbau)

**`plan.typ` folgt IMMER der Sportart** (`planTypFuer()`, Tabelle `SPORTARTEN[].planTyp`).
Kein Feld, das der Nutzer extra wählt: Krafttraining → Übungen/Sätze/Progression, jede andere
Sportart → **Aktivität** mit einer Dauer. „Satz 1 von 1" bei Tischtennis wäre gelogen.

| | `typ:"kraft"` | `typ:"aktivitaet"` |
|---|---|---|
| Editor | Übungen, Reihenfolge, Bonus | Dauer + Einheit, ggf. Strecke |
| Start | Vorschau → Timer | **Stoppuhr** (`view-stoppuhr`) |
| Zusätzlich | — | **Erledigt** (Formular vorbelegt) |
| Volumen / Progression | ja | nein (siehe unten) |

**Drei Wege, EIN Formular:** Stoppuhr, „Erledigt" und „Aktivität nachtragen" füllen alle
`eintragenOeffnen()` vor. Der Protokolleintrag entsteht **nur** in `aktivitaetAblegen()` —
sonst gäbe es drei Stellen, an denen dasselbe schiefgeht.

**Strecke nur, wo es ein Maß gibt** (`hatStrecke()`). Klettern, Tischtennis, Tennis, Fußball,
Kampfsport, Yoga haben bewusst keins — dort ist die Trainingszeit die ganze Wahrheit.
**Pace wird gerechnet, nie gespeichert** (`paceText()`, `paceJe`: 1 km Laufen, 100 m Schwimmen,
500 m Rudern; `paceJe:null` → km/h via `tempoText()`).

### Ausdauer-Steigerung — die Regel und warum

`zieleAnwenden()`, ausgelöst durch einen Eintrag, **höchstens einmal pro Kalenderwoche**
(`isoWoche()`; bei 3 Einheiten wären 20 % je Einheit +73 % je Woche).

* Die **10-%-Regel ist nicht belegt** — niemand weiß, woher sie stammt, und bei kleinen Umfängen
  wird sie absurd (10 % von 2 km = 200 m). Eine Studie mit 874 Anfängern fand bis 30 % kein
  erhöhtes Verletzungsrisiko. Deshalb `STEIGERUNG_MAX = 0.20` + Mindestschritt.
* Besser belegt ist der Rhythmus: 3 Steigerungswochen → **Entlastung auf 70 %** → **Rückkehrwoche
  auf den Umfang davor, OHNE Zuwachs** → weiter. Gegenprobe aus der Quelle: 50 km ergeben nach
  elf Wochen „fast 90" — das geht nur mit sechs Steigerungen auf, nicht mit acht.
  **Die Rückkehrwoche war mein Fehler, den der Test gefangen hat — nicht wegoptimieren.**
* Wer unter Plan bleibt (< 90 %), steigert nicht.

**Kraft-Ziele:** `kraftZieleAnwenden()` läuft bei **jeder** Bewertung und setzt `wdhMax` auf den
Zielwert — damit klettert die Progression wirklich bis 20 Wdh, statt bei 12 in Gewicht zu kippen.
Sie arbeitet auf dem **echten** Plan, nicht auf `lauf.plan` (das ist seit der Vorschau eine Kopie).

**Häufigkeit steigern** ist bewusst NICHT automatisch: Eine zusätzliche Einheit pro Woche braucht
drei bis vier Wochen Anpassung, und man steigert nie Umfang und Häufigkeit gleichzeitig.
`zielInPlan()` verweist bei Aktivitäten auf die Wochentage im Plan.

### v32 — was der Umbau von v31 noch nicht konnte

**Der Wizard fragt jede Sportart einzeln.** Die Fragen `tage_<sportart>` und `dauer_<sportart>` werden
aus `SPORTARTEN` **erzeugt**, nicht getippt (`WIZARD_FRAGEN.concat(...)`), und über `nurWenn` ein- und
ausgeblendet. Eine neue Sportart braucht deshalb genau einen Eintrag in `SPORTARTEN` — sonst müsste
man sie an drei Stellen nachtragen. `aktivitaetsFelderVorbereiten()` legt die Felder an, in die
`wzMulti`/`wzSingle` schreiben.

> **Absturzfalle:** `plaeneErstellen()` rechnet `SPLITS[einrichtung.wochentage.length]`. Ohne
> Krafttraining ist `wochentage` leer → `SPLITS[0]` ist `undefined` → Absturz. Die Wache
> `!kraftGewaehlt(einrichtung) ? [] : …` MUSS vor der **Berechnung** stehen, nicht erst vor der
> Verwendung. Das ist v32 schon einmal passiert, als `sportartenSichern()` entfiel.

**Übungen gibt es bei BEIDEN Plan-Typen.** „Topspins, 10 Wdh" im Tischtennis-Plan ist ein echter Fall:
Die Übung landet über `planUebungen()` im Ziel-Dropdown, `kraftZieleAnwenden()` setzt `wdhMax` auf den
Zielwert, und nach dem Eintragen der Aktivität öffnet `bewertungOeffnen()` **dieselbe** Bewertung wie
beim Krafttraining. Nur so greift die Progression. Ohne Übungen geht es direkt zurück zur Liste.
Nur Reihenfolge/Zirkel/Aufwärmen/Dehnen bleiben Kraft-eigen.

**Kalender, mehrere Sportarten an einem Tag** (`tagFarben()`):

| Anzahl | Darstellung |
|---|---|
| 1 | Fläche in der Sportfarbe |
| 2 | Fläche in Farbe A, **Rahmen** in Farbe B |
| 3+ | Ring aus Tortenstücken (`conic-gradient`), Zahl im dunklen **Kern** |

Der Kern ist keine Deko: Auf einem dreifarbigen Verlauf wäre die Zahl je nach Segment mal lesbar,
mal nicht.

### v33 — Aufräumen und die Gerätefrage ernst nehmen

**Die Übung merkt sich ihr Gerät** (`u.geraet`). Vorher musste man es über den Namen in `UEBUNGEN_DB`
suchen — nach einer Umbenennung wäre die Verbindung stillschweigend weg gewesen. Migration schlägt es
einmalig nach, Freitext-Übungen bekommen `"keine"`. Gleiche Lehre wie beim Wochentag: **Feld statt
Namensraterei.**

**Abwählen räumt auf** — immer mit Rückfrage, denn es ist nicht rückholbar:

| Aktion | Folge |
|---|---|
| Gerät abwählen (`haengtAnGeraet`) | Übungen mit diesem `geraet` fliegen aus allen Plänen; leere Pläne werden gemeldet |
| Sportart abwählen (`haengtAnSportart`) | Pläne dieser Sportart **und** ihre Ziele weg |
| Dazuwählen | immer harmlos, nie eine Rückfrage |

> **Das Protokoll wird NIE angefasst.** Was trainiert wurde, wurde trainiert — das darf keine
> Einstellung umschreiben. Der Kalender bleibt dadurch ehrlich, auch wenn der Plan längst weg ist.

**Der Generator bevorzugt Geräteübungen** (stabile Sortierung, `geraet !== "keine"` zuerst).
Vorher stand `UEBUNGSPOOL` in Datenbank-Reihenfolge, und die ist körpergewichts-zuerst: Der Rundlauf
ab Index 0 lieferte selbst im voll ausgestatteten Gym „Liegestütze, Pike Push-ups, enge Liegestütze"
als ganzen Drück-Tag — die Maschinen wurden nie erreicht. **Die Gerätefrage war damit praktisch
wirkungslos.** Jetzt: 25 von 25 Übungen mit Gerät im vollen Gym, ohne Ausstattung unverändert reines
Körpergewicht. Die Rotation über die Tage (`benutzt[kategorie]`) bleibt: keine Übung zweimal pro Woche.

**Jedes Gerät hat mindestens eine Übung** — von `pruefung`/`raum.js` abgesichert. Neues Gerät ohne
Übung = Karteileiche im Profil.

### v40 — Geführter Editor-Picker (ersetzt die Übungs-Bibliothek)

**Ende der Strecke „bis 0.040".** Im Editor wird eine Übung jetzt über einen **geführten Picker** statt
über die alte Vollbild-Bibliothek hinzugefügt (Nutzer-Entscheidung: „Dropdown ersetzt die Bibliothek").
* **Kraft-Plan:** `select` Gerät (Alle/Körpergewicht/eigene Geräte) → `select` passende Übung aus
  `UEBUNGEN_DB`, gefiltert nach Gerät und „noch nicht im Plan". `pickerHinzu` baut sie mit `uebungBauen`
  (Startgewichte wie zuvor `bibWaehlen`).
* **Sportart-Plan:** `select` Drill aus `SPORT_UEBUNGEN[sportart]` (v39); `pickerHinzu` baut mit
  `sportUebungBauen` (kein Gerät, `art` mitgeführt). Damit haben Nicht-Kraft-Pläne endlich echte,
  vorgeschlagene Übungen — vorher zeigte „Übung hinzufügen" die kraft-only Bibliothek.
* **„Eigene Übung" (Freitext) bleibt** — wie zugesagt, hängt eine leere Übung an (`eigeneUebung`).
* Funktionen: `uebungPickerZeichnen` (baut den Picker je nach `editorPlan.typ`), `pickerUebungenZeichnen`
  (füllt nur das Übungs-Dropdown, für den Gerätewechsel ohne Voll-Neuaufbau), `pickerHinzu`. Aufruf aus
  `editorZeichnen` (der Picker ersetzt den alten Knopf `#uebung-hinzu` → jetzt `#uebung-picker`).

> **Entfernt (Aufräumen):** die ganze Ansicht `view-bibliothek`, `bibliothekOeffnen`/`bibZeichnen`/
> `bibKatSetzen`/`bibMeineUmschalten`/`bibWaehlen`, `uebungAnlegen`, `bibKategorie`/`bibNurMeine`, das
> nav-Mapping und die dadurch tot gewordene Konstante `KATEGORIE_NAMEN`. Die Bibliothek war nur vom Editor
> erreichbar — sauber ersetzbar. `geraetName` bleibt (anderweitig genutzt).
>
> **Hinweis:** `#picker-uebung` steht im Quelltext zweimal (Kraft- und Sport-Zweig von
> `uebungPickerZeichnen`), rendert aber immer nur EINEN — dieselbe id ist Absicht, damit
> `pickerUebungenZeichnen`/`pickerHinzu` das Feld unabhängig vom Zweig finden. Statische Doppel-ID-Prüfung
> meldet das als Fehlalarm.
>
> Getestet (jsdom, 10 Fälle): Kraft-Picker (Gerät-Dropdown, Übungs-Dropdown, Gerätefilter, Hinzufügen,
> gültige Felder, Duplikat-Schutz), Sport-Picker (Drills, `art`/Gewicht korrekt), freie Eingabe; view-bibliothek
> restlos weg (0 Referenzen), keine toten Funktionen, alle Alt-Regressionen grün.

---

### v39 — Datenmodell für Sportart-Übungen (`SPORT_UEBUNGEN`)

**Neues Gegenstück zu `UEBUNGEN_DB`, aber JE SPORTART statt je Muskelgruppe.**
`const SPORT_UEBUNGEN = { laufen:[…], tischtennis:[…], … }` — Vorlagen `{ name, art, modus, saetze, wdh|dauer }`.
* `art:"technik"` (Fertigkeit: Topspin, Aufschlag) **oder** `art:"kondition"` (Athletik/Ausdauer: Intervalle,
  Footwork). Das Feld `art` wandert in die Plan-Übung und **trägt die spätere Fortschritts-Strategie (0.044)** —
  Technik steigert man anders als Kondition. So verbaut das Modell die Entscheidung nicht.
* `modus`/`saetze`/`wdh|dauer` wie bei Kraft, aber **ohne Gewicht** (Drills laufen über Wdh/Zeit). Bewusst kein
  neuer `strecke`-Modus — der kommt mit der Ausdauer-Progression später (offene Idee).
* Seed: **39 Übungen über alle 11 aktivitaet-Sportarten** (3–4 je Sportart, Technik+Kondition gemischt),
  recherchiert (nur Namen/Art). Voller Ausbau je Sportart = 0.041+.

**Helfer:** `sportUebungen(sportId)` → Liste (oder `[]`); `sportUebungBauen(vorlage)` → volle Plan-Übung
(wie `uebungBauen` für Kraft, aber `gewicht:0`, `art` mitgeführt, `neueUebung()` als Basis).
Getestet (jsdom): jede Sportart hat Übungen, keine Fremd-Keys, alle Vorlagen wohlgeformt (art∈{technik,kondition},
modus∈{wdh,zeit}, wdh/dauer/saetze gesetzt), Builder liefert gültige Übung mit notenHistorie/pause.
**Noch nicht verdrahtet** — der Editor nutzt es erst ab **0.040** (Dropdown).

---

### v38 — Generator nutzt Maschinen (Gym-Plan mischt Maschine + Freihantel)

**Nutzer-Entscheidung:** Generierte Gym-Pläne sollen die vorhandenen Maschinen nutzen. Ursache des alten
Verhaltens: der Rundlauf ab Array-Index 0 nahm die (in der DB zuerst stehenden) Körpergewichts-/leichten
Übungen und erreichte selbst im voll ausgestatteten Gym die Maschinen nie (Test-Gym-Plan: max. 11 kg).

**Fix in `plaeneErstellen`:** Kandidaten je Kategorie werden neu geordnet — **Maschine/Freihantel im
Reißverschluss** (M, F, M, F …), danach Körpergewicht-an-Gerät, zuletzt reines Körpergewicht.
`const MASCHINEN_IDS = new Set(GERAETE.filter(g=>g.gruppe==="Maschinen").map(g=>g.id))` (aus der Gruppe
abgeleitet, keine zweite Liste). Der **Gerätefilter** davor garantiert weiterhin: nur Machbares steht zur
Wahl — zuhause ohne Maschinen bleibt es automatisch beim Körpergewicht.

> **Bewusst ein MIX, nicht „nur Maschinen".** Erster Versuch war „Maschinen strikt zuerst" → Test ergab
> 18/18 Maschinen, also fielen LH-Kniebeuge/Klimmzug ganz raus. Der Reißverschluss hält die Grundübungen
> drin. Getestet (jsdom): Gym-Plan **11 Maschine / 7 Freihantel / 0 Körpergewicht** (voll ausgestattet,
> 75 kg Anfänger, Beinpresse 55 kg); zuhause **0 Maschinen, 0 kg**; zuhause+Kurzhantel: keine Maschinen,
> Hanteln genutzt; keine Übung doppelt je Plan; alle Alt-Regressionen grün.
>
> **Test-Falle notiert:** `uebungBauen` überträgt `anteil` NICHT auf die gebaute Übung — in Tests darf man
> Freihantel/Maschine nicht über `u.anteil` klassifizieren (immer leer), sondern über `geraet` + `gewicht`.
>
> **Rest-Effekt v37:** Die neuen v37-Übungen sind tiefer in den Listen und tauchen in einem 3-Tage-Plan
> meist noch nicht auf (Bibliothek/manuelle Auswahl/kommendes Dropdown haben sie voll). Falls sie später
> auch generiert erscheinen sollen: in ihre kat-Abschnitte einsortieren oder Rotations-Offset — eigener Schritt.

---

### v37 — Übungs-Datenbank erweitert (Start von Milestone 0.050)

**+36 kuratierte Übungen (99 → 135)**, breit über Maschinen, Kabel, Kleingeräte und Freihantel,
2–3 je zuvor dünnem Gerät. Als **beschrifteter Block am Ende von `UEBUNGEN_DB`** (gut reviewbar/rückrollbar).
`UEBUNGSPOOL` leitet sich per `filter(kat)` ab → die Neuen sind **automatisch** in Bibliothek und Pool.
`anteil` ist je Übung an den **Geschwister-Übungen desselben Geräts kalibriert** (z. B. Einbeinige
Beinpresse 0.45 gegen Beinpresse 0.90); Körpergewicht-Übungen ohne `anteil` → 0 kg, Wdh-Progression.
Getestet (jsdom): Startgewichte plausibel, Pool/Bibliothek zeigen sie, Generator weiter valide, jedes
Gerät weiterhin ≥1 Übung.

> **Offene Design-Frage (dem Nutzer gestellt, Antwort steht aus):** Der Generator rotiert `UEBUNGSPOOL`
> **in Array-Reihenfolge ab Index 0** (`benutzt[kategorie]`), startet bei jeder Generierung neu bei 0 und
> erreicht die **am Array-Ende** angehängten neuen Übungen praktisch nie. Folge: die Neuen erscheinen in
> **Bibliothek, Pool und manueller Auswahl** (und im kommenden Editor-Dropdown, 0.039), aber **nicht
> automatisch in frisch generierten Plänen**. Kein Bug — bewusst als sichere Anhänge-Variante gebaut
> (null Änderung am bestehenden Generierungs-Verhalten). Optionen für den nächsten Schritt: (a) so lassen
> (Generator nutzt kuratierten Kern, Rest über Dropdown/Bibliothek), (b) neue Übungen in ihre kat-Abschnitte
> einsortieren, (c) Generator „gewichtete Geräte-Übung bevorzugen" beibringen. **(c)/(b) ändern das
> Generierungs-Verhalten und brauchen eigenen Test.**

---

### v36 — Code-Durchsicht + Neuigkeiten-Seite

**Vollständige Tote-Code-/Fehler-Durchsicht.** Ergebnis: der Code ist sauber — keine ungenutzten
Funktionen, keine ungenutzten Top-Level-Variablen, keine `console.log`/`debugger`-Reste, kein loses `==`,
keine kaputten `onclick`-Handler, keine fehlenden `getElementById`-Ziele. Behoben wurden nur zwei
Kommentar-Altlasten aus dem v34-Umbau (ein verdoppeltes `/* --- Plangenerator --- */`, ein veralteter
Doppel-Kommentar an `heuteKarteZeichnen`, dessen Rückgabewert seit v34 ungenutzt ist).

> **Falle für die nächste Durchsicht:** `wischenEinrichten` sieht wie tote Funktion aus (Name kommt nur
> einmal vor), ist aber ein **benannter IIFE** `(function wischenEinrichten(){…})()` — er läuft sofort und
> richtet die Wisch-Geste im Wizard ein. **Nicht entfernen.** Immer prüfen, bevor „unreferenziert" gelöscht
> wird: IIFEs und über `onclick`-Strings gerufene Funktionen tauchen bei naiver Suche als „tot" auf.

**Neue Seite „Neuigkeiten" (Einstellungen → Hilfe → „✨ Neuigkeiten").** `view-neuigkeiten` +
`neuigkeitenOeffnen()`, gebaut nach demselben Muster wie „Gut zu wissen" (Karte + `meta`-Bullets),
`navAktualisieren` hält den Mehr-Tab aktiv.
* Inhalt in `const NEUIGKEITEN` (Array `{ stand, punkte:[] }`), **nutzer-sichtbare** Neuerungen,
  **gruppiert** (nicht jede Version), neueste zuerst. **Pflege:** bei einem Update mit sichtbarer Neuerung
  oben ergänzen oder in die jüngste Gruppe einreihen; rein interne Versionen (z. B. v35 Datenzuordnung)
  weglassen — die interessieren beim Trainieren niemanden.
* **Achtung Anführungszeichen:** In den Strings **typografische** Quotes „ … " verwenden (U+201E/U+201C),
  nie ein gerades `"` — das beendet die JS-Zeichenkette. (Genau dieser Fehler trat beim Bau auf und wurde
  vom `node --check` gefangen.)

---

### v35 — Protokoll↔Plan über die stabile ID (Fundament für alles Weitere)

**Das Protokoll ordnet Trainings jetzt über `planId` statt über den Namen zu.** Neue Einträge tragen
`planId` mit (`plan`-Name bleibt für Anzeige/Altdaten). Migration in `datenNachruesten` verknüpft alte
Einträge einmalig: der zum gespeicherten Namen passende Plan gibt seine id her; kein Treffer → `planId:null`,
der Name dient weiter als Rückfall. Historische Namen waren eindeutig (Wochentag-Präfix bzw. A/B/C), die
Rück-Verknüpfung ist damit sicher. Idempotent (Guard `if(e.planId === undefined)`).

Betroffene Stellen: `trainingBeenden` und `aktivitaetAblegen` (WRITE, jetzt mit `planId`), die „zuletzt
trainiert"-Suche in `planListeZeichnen` (READ: `e.planId ? e.planId === p.id : e.plan === p.name`).

> **Damit ist die Altlast „Namensraterei" weg** — dasselbe Prinzip wie beim Wochentag (v31) und beim
> Gerät (v33): **Feld statt Name.** Freigeschaltet ist dadurch: die A/B/C-Buchstaben in generierten
> Plannamen dürfen nun fallen (Vollkörper-Tage dürfen gleich heißen), und Sportart-Pläne können sauber
> auf ihre Historie zugreifen. Getestet (jsdom): Namens-Treffer→id, Waise→null, bereits migriert bleibt,
> idempotent, neuester Treffer gewinnt.

---

### v34 — Start-Bildschirm getrennt, Namen entrümpelt

**Der bisherige Pläne-Tab war zwei Dinge in einem** (Heute-Karte + Plan-Verwaltung). Aufgeteilt in:
* **`view-start` ("Heute")** — neuer erster Tab, neuer Nav-Eintrag `⌂ Heute` (Bottom-Bar jetzt **5** statt 4).
  Zeigt nur: Heute-Karte, Sicherungs-Banner (die „wichtige Meldung"), und **Ziele** als Lese-Block
  (`zieleStartZeichnen`, nutzt bewusst dasselbe `zielEinschaetzen` wie das Profil — eine Quelle).
  Gezeichnet von `startOeffnen()`.
* **`view-plaene` ("Pläne")** — nur noch die Plan-Liste + Anlege-Knöpfe. `planListeZeichnen()` zeichnet
  **keine** Heute-Karte/Banner/Flamme mehr und **schließt den heutigen Plan nicht mehr aus** (auf diesem
  Bildschirm gibt es kein Doppel mehr, weil die Heute-Karte woanders liegt).

**Landung nach Aktion:** Login/Passwort-Reset/Training-fertig → `startOeffnen()`. Editor/Wizard/Plan-Flows
bleiben bewusst auf `view-plaene`. `zeige()` holt das aufgeschobene Update jetzt auch bei `view-start` nach.

**Onboarding-Zweig** in `heuteKarteZeichnen()`: Bei **null Plänen** zeigt der Start eine Willkommens-Karte
mit „Trainingsplanung starten" — sonst sähe ein neuer Nutzer durch die Trennung nur „Ruhetag" und fände
die (nun im Nachbar-Tab liegenden) Anlege-Knöpfe nicht.

**Namen ohne Wochentag:** Generierte Pläne heißen `titel` statt `wochentag + " – " + titel`
(„Ganzkörper A" statt „Montag – Ganzkörper A"). Der Tag steht im Feld `tage` — im Namen war er Dopplung.
Die **A/B/C-Buchstaben bleiben vorerst**, weil das Protokoll Pläne noch über den **Namen** zuordnet
(`protokoll[i].plan === p.name`, zwei Stellen). Erst nach Umstellung auf `plan.id` (siehe Baustellen)
dürfen sie fallen.

> **Architektur-Urteil (v34, damit es nicht erneut aufgeworfen wird):** Nach ausdrücklicher Prüfung —
> **kein Rewrite, keine Modul-Aufteilung, kein Build-Schritt, kein Framework.** Ein einzelnes File ohne
> Toolchain, per Copy-Paste deploybar und offline lauffähig, ist die *Stärke* des Projekts, nicht die
> Altlast. Es gibt aktuell **kein** Performance-Problem (ein Nutzer, winzige Datenmengen, `innerHTML`-
> Neuaufbau < 1 ms). Optimierungsziel ist der **menschliche Nachfolger mit weniger Wissen**, nicht die
> Lesbarkeit für die KI — und was für ihn gut ist (eine Datei, `#region`-Karte, WARUM-Kommentare), ist
> für die KI ohnehin gut.

---

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
* **Eine gelbe Hauptaktion je Bildschirm.** Zwei `primaer`-Knöpfe heben sich gegenseitig auf.
* Wochentage als **eine Zeile mit sieben Spalten** (`.tage-raster`, wie der Kalenderkopf). Als
  2-Spalten-Raster brauchte das im Editor vier Zeilen plus „Kein fester Tag“ — ~220 px, bevor man
  die erste Übung sah. **Keine Auswahl IST kein fester Tag**; der Extraknopf war nur eine zweite
  Art, dasselbe zu sagen.
* **Ausgewählt = umgefärbt.** Keine ✓-Präfixe in Knopftexten (v23 entfernt) — die Farbe trägt das allein.
* `button.gewaehlt` ist die **letzte Regel im Stylesheet** und muss es bleiben. Sie ist (0,1,1) —
  genauso spezifisch wie `.note button` oder `.umschalter button`; bei Gleichstand gewinnt die spätere
  Regel. Weiter oben würde jede darunter stehende Behälter-Regel die Umfärbung ausknipsen.
  `.wz-opt.gewaehlt` (0,2,0) und `.wahl-raster button.gewaehlt` (0,2,1) sind spezifischer und
  gewinnen unabhängig von der Reihenfolge. `#nav button` (1,0,1) schlägt sie — Nav trägt aber `.aktiv`.
* Symbole nur dort, wo das Symbol die Aussage IST (▲ ▼). Sonst Klartext.
* `--navhoehe` ist fest gesetzt; `body.nav-an .view.aktiv` rechnet den Freiraum unten daraus
  (`calc(var(--navhoehe) + 64px)`). Die Safe-Area kürzt sich raus — `body` und `#nav` haben sie beide.

## 11. Arbeitsweise mit dem Nutzer

* **Zweite und dritte Prüfung** ist Pflicht — Korrektheit hat oberste Priorität.
* **Vor dem Ausliefern testen.** Die Testkette liegt bei (`dom.js` + `flow.js` + `migr.js` + `pruefung.py` + `css.py`):
  1. `node --check` auf den `<script>`-Block
  2. `pruefung.py` — onclick-Ziele, IDs, CSS-Klassen ohne Regel, verwaiste Funktionen
  3. `css.py` — **Kaskade rechnerisch**: schlägt eine spätere Regel die Umfärbung?
  4. `migr.js` — Altdaten jeder Generation (v22/v25/v26) + Idempotenz
  5. `flow.js` — kompletter Durchlauf mit DOM-Ersatz: Konto → Wizard → Vorschau → Training →
     Bewertung → Sicherung raus/rein → Systemtexte → Kalender → Filter (57 Prüfungen)
  6. `ziel.js` — Zeiteinheiten, Editor-Zeitfeld, Ziele, Einschätzung, Migration (55 Prüfungen)
  7. `akt.js` — Plan-Typ, Streckenmaß, Pace, 20-%-Regel mit Entlastung, Aktivität eintragen (49 Prüfungen)
  8. `neu.js` — Wizard je Sportart, Übungen in Aktivitäten, Kalenderfarben (41 Prüfungen)
  9. `raum.js` — Gerätefeld, Aufräumen beim Abwählen, Generator-Geräteauswahl (40 Prüfungen)
  Diese Kette hat mehrfach echte Fehler gefunden — zuletzt einen, den ich selbst gerade eingebaut hatte.

**Test-Fallen, teuer erkauft:**
* Node hat ein eigenes `navigator` (Getter ohne Setter) → `Object.defineProperty` statt Zuweisung.
* `frage(text, mitAbbrechen, rueckruf)` nimmt einen **Rückruf**, kein Promise. Falscher Stub =
  `aufraeumen()` läuft nie = verwaiste Intervalle = Phantomfehler.
* `hauptKnopf()` beginnt mit `tippGesperrt()` (350 ms). Im Test `tippGesperrt = () => false` setzen.
* `speichern()` ist fire-and-forget. Vor `sicherungDatei()` einmal `await sitzungSpeichern()`.
* `connect()` im Audio-Ersatz muss das Ziel **zurückgeben** (Kettenaufruf).
* **Keine kurzen Marker gegen Chiffrate testen.** „182“ trifft im Base64 rein zufällig (~1 % pro Lauf) —
  der Test flackerte. Marker mit Umlaut nehmen: die kann Base64 gar nicht enthalten.
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

* **RICHTUNG (v34, Nutzer-Ansage): Die App ist kein Kraft-Tool, sondern ein *allgemeines* Trainings-Tool.**
  Andere Sportarten sollen **genauso tief** ausgebaut werden wie Krafttraining — nicht als leichte
  „Aktivität"-Nebenschiene. Heute sind sie noch Attrappen (Knopf „noch ohne Pläne"). Der Ausbau ist
  **überwiegend Domänen-Modellierung, nicht Datei-Layout**:
  * **Datenmodell verallgemeinern:** Heute gibt es zwei Typen — `typ:"kraft"` (Übung + Sätze/Wdh/Gewicht +
    Noten-Progression + Deload) und `typ:"aktivitaet"` (Strecke/Zeit, leichter). „So groß wie Kraft"
    heißt: pro Sportart definieren, was **eine Übung** und was **Fortschritt** bedeutet. Dafür fehlen die
    Modi `strecke`/`runden`/`grad` (siehe Offene Ideen) und je Sportart eine eigene Progressionsregel
    (Kraft = Doppelprogression; Ausdauer = 30-%-Regel; Technik-Sport = ? → **braucht Recherche je Sportart**).
  * **Generator + Trainingsbildschirm:** je Sportart-Klasse ein eigener Plangenerator (analog `plaeneErstellen`
    für Kraft) und ggf. ein eigener Ablauf im Training. Das ist die eigentliche Arbeit.
  * **Übungsinhalte:** Der Nutzer weiß die konkreten Übungen je Sportart noch nicht — das ist ein
    **Inhalts-/Recherche-Schritt** pro Sportart, kein Code-Schritt.

  **Separate Datenbank-Datei je Sportart, „erst beim Auswählen laden"? → NEIN als Netz-Lazy-Load, JA als
  reine Datei-Trennung.** Netz-Nachladen beim Auswählen bricht die Offline-Garantie (im Keller-Gym ohne
  Signal ist die Sportart-Datei dann nicht da). Und es macht das Training **nicht besser** — Text-/Übungsdaten
  sind wenige kB je Sportart; Ladezeit/Speicher sind kein Engpass. Was Training „besser" macht, ist die
  **Inhaltsqualität** (gute Übungen, gute Progressionsregel), nicht der Lade-Mechanismus. *Falls* die
  Datei durch viele Sportarten unhandlich wird, ist der zulässige Schritt: statische Tabellen je Sportart
  in `daten.js` / `daten_<sportart>.js` per normalem `<script src>` auslegen — **alle im Service-Worker-
  Cache**, also weiterhin offline, kein Build. Nutzen = Wartbarkeit (jede Sportart ein editierbarer Block),
  **nicht** Ladeperformance. Preis: SW-Cache-Liste pflegen, mehr Dateien beim Deploy. Personenbezogene
  Pläne/Daten landen **nie** in diesen Dateien — die bleiben im verschlüsselten Blob.
  * Medien (Bilder/Videos je Übung) bleiben abgelehnt (Urheberrecht + Pflege). *Nur falls je Medien dazukämen*,
    wäre **das** der einzig sinnvolle Lazy-Load-Fall (online-einmal, dann SW-gecacht) — Text niemals.

### Optimierungs-Rückstand (v34, priorisiert — je ein eigener Bau-+Test-Durchgang)

1. ~~Zuordnung Plan↔Protokoll auf `plan.id`~~ — **ERLEDIGT in v35** (siehe Changelog). Nächster
   Folgeschritt, der jetzt freigeschaltet ist: A/B/C aus generierten Plannamen entfernen (in `SPLITS`
   bzw. `plaeneErstellen`), Vollkörper-Tage dürfen dann gleich heißen.
2. **`zieleZeichnen` (Profil) und `zieleStartZeichnen` (Start) zusammenführen** — in v34 bewusst leicht
   dupliziert. Zwei Stellen, die synchron bleiben müssen. Nur diese vereinen, nicht „DRY um jeden Preis".
3. **Ziel-Statistik** (jeder geloggte Wert als Punkt + Ziel-Linie) — aus vorhandenen `saetze` baubar,
   vorhandene SVG-Helfer (`gewicht-diagramm`/`volumen-diagramm`) nutzen.
4. **Ist-Wdh im Training → Progression** (Nutzer-Wunsch): Eingabefeld im `satz-wdh`-Schritt (Default =
   Ziel-Wdh), `satzProtokollieren` loggt den **echten** Wert, `progressionAnwenden` leitet daraus ab statt
   aus der manuellen Note 1–5. Achtung: schreibt die **einzige** Progressionsquelle um und behebt zugleich,
   dass heute die **geplanten** statt der echten Wdh geloggt werden (`eintrag.wdh = u.wdh`).
5. **Skalierbarkeit (nur beobachten):** `protokoll` wächst unbegrenzt; `speichern()` verschlüsselt +
   serialisiert **jedes Mal den ganzen Datensatz** in localStorage (~5 MB Deckel). Über Jahre relevant →
   dann alte Einheiten archivieren/ausdünnen, Statistik auf rollendes Fenster + Aggregate. Nicht dringend.

### Übungs-Erweiterung & geführte Auswahl (nächster großer Schritt — Nutzer-Wunsch)

Ziel: (a) mehr Übungen je **Gym-Maschine**, (b) **Sportarten mit eigenen Übungen**, (c) im Editor beim
Plan-Erstellen **Sportart → Gerät → passende Übungen als Dropdown** vorschlagen — **freie Eingabe bleibt**.

**Ist-Stand (v35, vermessen):**
* `UEBUNGEN_DB` = **99 Übungen**, Schema `{ name, kat:"beine"|"druck"|"zug"|"rumpf"|"cardio", geraet:<GERAETE-id>, modus?:"zeit", anteil?:<0..1> }`.
* `UEBUNGSPOOL` ist **aus `UEBUNGEN_DB` abgeleitet** (`filter(kat)`). Die Bibliothek (`bibliothekOeffnen`)
  liest `UEBUNGEN_DB` direkt. **Folge:** Ein neuer DB-Eintrag mit gültigem `kat`+`geraet` erscheint
  **automatisch** in Generator *und* Bibliothek — Erweitern = anhängen, keine Logikänderung.
* **Maschinen sind dünn** (meist 1 Übung: `brustpresse`/`butterfly`/`schultermaschine`/`rudermaschine`/
  `bauchmaschine`/`rueckenbank`/`wadenmaschine`/`beinpresse` je 1). Das ist der einfachste Gewinn.
* **`anteil` steuert die Startgewicht-Schätzung** (`startwerteBerechnen`/`uebungBauen`). Neue Geräteübungen
  brauchen ein **plausibles `anteil`**, sonst schlägt der Generator Unsinns-Gewichte vor. **Vor dem
  Anhängen prüfen, wie `anteil` genau rechnet.**

**Knackpunkt Sportarten:** Übungen haben **keine Sportart-Achse** — nur `kat` (Muskelgruppe, kraft-spezifisch).
Tischtennis/Klettern/… passen nicht in beine/druck/zug/rumpf. „Sportarten mit Übungen" braucht daher eine
**neue Datenstruktur**, z. B. `SPORT_UEBUNGEN = { tischtennis:[…], klettern:[…] }` oder ein Feld `sportart`
auf der Übung. Der Plan-Typ `aktivitaet` erlaubt `uebungen[]` bereits (Topspins-Beispiel) — die *Anzeige/das
Training* dafür ist der eigentliche Bau. Je Sportart eine eigene, **recherchierte** Übungs-/Drill-Liste
(Inhalts-Schritt) und je Sportart-Klasse eine eigene Fortschrittsregel (Kraft-Progression passt nicht auf
ein Technik-Drill).

**Editor-Dropdown (UX):** Im Editor beim Hinzufügen: 1) Sportart (aus `SPORTARTEN`), 2) Gerät (aus `GERAETE`,
gefiltert nach Ort/Sportart), 3) Dropdown der dazu passenden Übungen (`UEBUNGEN_DB`/`SPORT_UEBUNGEN` nach
`geraet`/`sportart` gefiltert) **plus** „Eigene Übung…" als Freitext (heutiges Verhalten, **muss bleiben**).
Betrifft `view-editor`/`editorZeichnen`/`bibliothekOeffnen`.

**Reihenfolge-Empfehlung:** (1) Maschinen-Übungen in `UEBUNGEN_DB` erweitern (klein, sichtbar, testbar:
Generator läuft, Bibliothek zeigt mehr, `pruefung` „jedes Gerät ≥1 Übung" hält). (2) `SPORT_UEBUNGEN`-
Struktur + Editor-Dropdown. (3) Sport-Inhalte je Sportart recherchieren + Fortschrittsregeln.

### Milestone 0.050 — „General Training" (Roadmap, vom Nutzer bestätigt)

**Leitidee:** Weg vom „Kraft-Tool, das auch Läufe loggt" — hin zum Trainings-Tool, in dem **jede Sportart
ein vollwertiger Bereich** ist. Etappen (jede eigener Bau-+Test-Durchgang; bis 0.040 fragt Claude vor
jeder Etappe nach den Entscheidungen):

* **0.037 ✅** Maschinen-/Geräte-Übungen erweitert (+36). *Erledigt.*
* **0.038 ✅** Generator nutzt vorhandene Maschinen (Reißverschluss Maschine/Freihantel). *Erledigt.*
* **0.039 ✅** Datenmodell für Sportart-Übungen: `SPORT_UEBUNGEN` (Sportart → Übungen/Drills)
  **oder** Feld `sportart` auf der Übung. So bauen, dass die spätere Fortschritts-Entscheidung nicht verbaut wird.
* **0.040 ✅** Editor-Dropdown (Picker ersetzt Bibliothek): Sportart → Gerät/Kontext → passende Übungen vorgeschlagen; **freie Eingabe bleibt**.
  Verbraucht die v37-Übungen und das 0.039-Modell. *(Ende der aktuell zugesagten Strecke „bis 0.040".)*
* **0.041–0.043** Erste recherchierte Übungs-/Drill-Listen je Sportart (Laufen, Klettern, Tischtennis, Yoga …).
* **0.044–0.046** **Kernentscheidung + Umbau:** Fortschritt als **Strategie je Sportart-Klasse** —
  `fortschrittFuer(klasse)` statt der kraft-festen `progressionAnwenden`. Kraft = Doppelprogression (steht),
  Ausdauer ≈ 30-%-Regel (teils da), Technik/Ballsport = Volumen/Zeit/Skill-Stufen (neu). **Diese Weiche
  zuerst festlegen, sonst Rework.**
* **0.047** Ist-Werte im Training → automatische Ableitung (Backlog-Punkt 4), greift dann für **alle** Klassen.
* **0.048–0.049** Generator + Trainingsbildschirm je Sportart-Klasse, wo sinnvoll.
* **0.050** Politur + Neuigkeiten-Eintrag „0.050 — General Training".

**Leitplanken über alles:** eine Datei, offline, verschlüsselt, wartbar ohne KI; getestete Etappen-Kadenz.

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
