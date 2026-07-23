# Simpelheit — Konzept & Änderungsauftrag

> **STATUS (v82): UMGESETZT.** Der Bau-Auftrag aus Abschnitt 6 ist seit **v76** komplett gebaut und
> seither vom Nutzer erweitert: **v77** Muster-Zeilen („Sätze 2 Wdh 20 Liegestütze" ↔ echte Übungen),
> **v79** „jede nicht-leere Zeile ist eine Übung" (siehe Anmerkungen in Abschnitt 5). Dieses Dokument
> ist damit **kein offener Auftrag mehr, sondern die verbindliche Konzept-Referenz** — besonders die
> goldene Regel aus Abschnitt 2 gilt unverändert für alle künftigen Umbauten.
>
> **An den nächsten Chat:** Dieses Dokument **ergänzt `UEBERGABE.md`** und setzt übergeordnete
> Leitplanken. Lies **beide**, bevor du etwas anfasst — erst die UEBERGABE (Ist-Zustand), dann dieses
> Dokument (Konzept). Bei Widerspruch gewinnen für das **Simpelheit-Feature** die Regeln hier;
> alle bestehenden Leitplanken (eine Datei, offline, verschlüsselt, additiver Datenvertrag, eine gelbe
> Hauptaktion, Testkette) bleiben unangetastet.
>
> **Das ganze Konzept in einem Satz:** Ein Datenmodell, fünf Ansichten. Die Simpelheits-Stufe blendet
> nur ein und aus — sie **konvertiert nie**.

---

## 1. Das eigentliche Ziel (Leitplanken)

Die App ersetzt den Trainingsplan auf Papier oder im Kopf — für **jeden**, vom Anfänger bis zum Profi,
**in derselben App**. Der Anfänger wird langsam eingeführt (vorgefertigte Pläne nach vorhandenen Geräten),
der Profi trägt seinen längst verinnerlichten Plan in Sekunden ein. Das ist keine Feature-Liste, sondern
die Messlatte für jede Entscheidung.

**Neue, verbindliche Leitplanken (gelten ab jetzt für die ganze App):**

1. **Eine Skala statt zwei Apps.** Es gibt **keinen** Anfänger-/Profi-*Modus-Umschalter*. Beide nutzen
   dasselbe Modell; der Unterschied ist nur, **wie viel Oberfläche sichtbar** ist (Simpelheit) und **wie
   viel vorbefüllt** wird (Wizard). Ein Modus-Schalter würde Code verdoppeln und bevormunden.
2. **Stufe = Ansicht, nicht Format.** Die goldene Regel dieses Features (Abschnitt 2).
3. **Vorlage ≠ Instanz.** Beim Loggen wird der Zielwert als **Snapshot** in den Protokolleintrag kopiert,
   nicht per Live-Referenz. *(Ist schon so: `protokoll.saetze[]` trägt `uebungId`+`name`; `planId` stabil,
   `plan`-Name nur Anzeige. Nicht zurückbauen.)*
4. **Referenzen über IDs, nie über Namen.** *(Ist schon so: `planId`, `uebungId`. Nicht zurückbauen.)*
5. **Additiver Datenvertrag.** Felder werden nur **hinzugefügt**, nie umbenannt/entfernt; `datenNachruesten()`
   füllt sie. *(Bestehende Leitplanke — der Grund, warum Simpelheit fast ohne neue Daten auskommt, s. Abschnitt 4.)*
6. **Der reale Langzeitschaden ist Datenverlust, nicht Diebstahl.** Export/Sicherung ist erste Klasse.
   *(Ist schon so: verschlüsselter Export + Sicherungs-Banner. Die Verschlüsselung ist **kein** Ballast —
   sie ist genau das, was den Cloud-Export sicher macht.)*
7. **Übungstyp bestimmt das Log-Layout** (Kraft = Sätze×Wdh×Gewicht, Zeit = Dauer, …). *(Ist schon so:
   `plan.typ` folgt der Sportart, `modus:"wdh"|"zeit"`.)*

> **Ehrliche Einordnung:** Die Punkte 3–7 waren schon gebaut, bevor dieses Dokument entstand — sie sind hier
> nur **festgeschrieben**, damit niemand sie versehentlich wieder aufweicht. Wirklich **neu** sind nur 1, 2
> und das Simpelheit-Feature selbst.

---

## 2. Die goldene Regel: Stufe = Ansicht, nicht Format

Die naheliegende (falsche) Idee wäre: fünf Datenformate, zwischen denen beim Stufenwechsel konvertiert wird.
Das ist der teure, brüchige Weg:

* Jede Konvertierungsrichtung ist eigener Code und eigene Fehlerquelle.
* **Runter (5→1)** wäre harmlos (Struktur zu Text), **rauf (1→5)** ist **nicht verlustfrei möglich**:
  „Bankdrücken bisschen schwer" lässt sich nicht sauber in `{uebungId, saetze, wdh, gewicht}` parsen.
  Genau da bräche „hoch-kompatibel".

**Die Lösung:** Es gibt **ein einziges Datenmodell** (das volle v71-Modell aus der UEBERGABE). Die Stufe
steuert **ausschließlich**, wie viel davon **angezeigt und abgefragt** wird.

* Stufe 1 schreibt in **denselben** Plan-/Protokolleintrag wie Stufe 5 — füllt aber nur ein Freitext-Feld,
  der strukturierte Rest bleibt leer.
* Stufe wechseln = **nichts konvertieren**. Runter blendet Felder aus, rauf blendet sie ein (bei Altdaten
  eben leer — das ist ehrlich und in Ordnung).
* „Hoch/runter-kompatibel" ist damit **gratis wahr**, weil es nur ein Format gibt. Kein Konverter, keine
  Verlustgefahr.

> **Die eine Invariante, an der du alles misst:**
> **Senken löscht nie Daten. Heben erfindet nie Daten.** Wer das verletzt, hat die Regel gebrochen.

Das ist zugleich der **wartbare** Weg (Leitplanke „wartbar ohne KI"): ein Modell + Sichtfilter statt
mehrerer Konverter, die in zwei Jahren keiner mehr versteht.

---

## 3. Der Simpelheitsgrad 1–5

Beim **Ersteinrichten** wird die Stufe gefragt; jederzeit unter **Mehr** änderbar. **„Mehr" ist auf jeder
Stufe erreichbar** — das ist der feste Anker (auf Stufe 1/2 über „⋯", ab Stufe 3 als Tab).

| Stufe | Was der Nutzer sieht | Statistik | Navigation |
|---|---|---|---|
| **1 · Notizblock** | Eine Seite. Abschnitte (= Pläne) mit Name + Freitext. „+" legt einen Abschnitt an. Kein Zahlenzwang, kein Training. | keine | keine Leiste, nur „⋯" → Mehr |
| **2 · Notizblock+Zahlen** | Wie 1, aber je Zeile ein Feld **Übungsname + Wiederholungen** (Zahl). Weiter eine Seite, kein Training. | keine | „⋯" → Mehr |
| **3 · Plan + Training** *(Kern)* | Pläne als echte Container: **Sätze×Wdh×Gewicht**, „letztes Mal: X", Pause-Timer, Training startbar, Protokoll wird geschrieben. | Serie/Flamme (minimal) | **Pläne · Mehr** |
| **4 · + Auswertung** | Wie 3 + volle Statistik (Kalender, Volumen, Gewichtskurve, Protokoll-Detail) + sichtbare Progression. | voll | **Pläne · Statistik · Mehr** |
| **5 · Vollausbau** *(heute)* | Alles: Trainingsplanung-Wizard, Sportart-System, Ziele, Kalender-Wiederholungen, TTS, Aufwärmen/Dehnen. | voll + Ziele/Kalender | **Pläne · Statistik · Profil · Mehr** |

> **Stufe 5 = der heutige Stand.** Es wird nichts weggenommen — die Stufen 1–4 sind **reduzierte Sichten**
> auf genau diese App, kein Parallelbau.

**„Letztes Mal: X" (ab Stufe 3):** der eigentliche Grund, warum die App besser ist als das Heft — Papier
kann das nicht. Datenquelle ist die vorhandene `notenHistorie[]`/das Protokoll; **kein** neues Feld nötig.

---

## 4. Auswirkung aufs Datenmodell — nur **zwei** neue Felder

Der beste Beleg, dass die goldene Regel stimmt: das ganze Feature braucht fast keine neuen Daten.

```js
einrichtung.simpelheit : 1..5          // NEU. Default bei Migration = 5 (s. u.)
plaene[].freitext      : ""            // NEU. Roher Text der Stufe-1/2-Abschnitte
```

Alles andere existiert bereits:
* **Stufe 2** (Name + Wdh) nutzt `plaene[].uebungen[]` mit **nur** `name` + `wdh`; die übrigen Übungsfelder
  bleiben auf Default. Kein neues Feld.
* **Stufe 3–5** nutzen das Modell unverändert.

**`datenNachruesten()` (Vertrag wahren, idempotent):**
* `einrichtung.simpelheit` fehlt → auf **5** setzen. *(Begründung: Bestandskonten benutzen heute die volle
  App; sie auf Stufe 1 zu werfen, würde ihre Oberfläche verstecken. Neue Konten werden im Ersteinrichten
  gefragt und überschreiben den Default sofort.)*
* jeder Plan ohne `freitext` → `freitext = ""`.
* Beides muss **auch in `leereKontodaten()`** greifen (sonst fehlt es neuen Konten — der v7-Bug).

> **Kein `protokoll[].freitext` in dieser Stufe.** Stufe 1/2 **definieren Pläne**, sie loggen (noch) nicht.
> Sollte später Freitext-*Logging* gewünscht sein, ist das ein **weiteres** additives Feld — dann, nicht jetzt.
> *(Interpretation, s. Abschnitt 9 — vom Nutzer zu bestätigen.)*

---

## 5. Übungs-Erkennung (Stufe 1/2 → höher): **Angebot, nie automatisch**

Beim Hochstufen kann die App die `freitext`-Zeilen eines Abschnitts durchgehen und Zeilen, die **exakt**
(bzw. normalisiert: Groß/Klein, Leerzeichen) einem Namen in `UEBUNGEN_DB` / `SPORT_UEBUNGEN` entsprechen,
zum **Verknüpfen anbieten**: „‚Klimmzüge' passt zu einer bekannten Übung — als Übung übernehmen?".

* Findet sich nichts → bleibt Freitext, kein Fehler.
* Der Abschnittsname wird zum **Plan-Namen** (ist er schon).
* **Nicht-destruktiv:** `freitext` bleibt erhalten, auch nach Übernahme. Ein Fehlschlag kostet **nie** Daten.

Damit ist das Matching Kür, kein Muss — und die goldene Regel bleibt heil (kein erzwungenes 1→5-Parsen).

> **Aktualisierung v77 (Nutzer-Entscheidung, überstimmt diesen Abschnitt teilweise):** Es gibt jetzt
> zusätzlich ein dokumentiertes **Muster**: Zeilen der Form „Sätze 2 Wdh 20 Liegestütze" (bzw.
> „Sätze 3 Zeit 45 Plank", Zeit in Sekunden) werden beim Bearbeiten der Stufe-1-Seite **live** als echte
> Übungen geparst (`abschnittTextSetzen`), und die Übungen des Plans werden umgekehrt als solche Zeilen
> in den Stufe-1-Text gerendert (`abschnittTextErzeugen`) — Stufe 1 ist damit ein Text-Editor derselben
> Daten. Zeile löschen = Übung löschen; vorhandene Übungen werden über den Namen wiedergefunden, damit
> Gewicht/Pause/Notenhistorie erhalten bleiben. Das Angebot oben gilt weiter für **nackte** Übungsnamen
> ohne Muster (übernommene Zeilen wandern dann aus dem Freitext in die Übung). Die goldene Regel bleibt
> gültig: der **Stufenwechsel** selbst konvertiert nach wie vor nichts — geparst wird nur, wenn der
> Nutzer wirklich tippt.
>
> **Aktualisierung v79 (Nutzer-Entscheidung):** Noch einen Schritt weiter — beim Bearbeiten der
> Stufe-1-Seite wird **jede nicht-leere Zeile** eine Übung: ohne Muster zählt nur der Name (vorhandene
> Übungen behalten ihre Werte, neue bekommen Standardwerte). Freitext im Abschnitt gibt es damit
> praktisch nicht mehr; Notizen gehören in „Getan". Außerdem: Heißt ein Abschnitt wie eine Sportart
> („Laufen"), übernimmt der Plan sie automatisch samt Typ.

---

## 6. Konkrete Code-Änderungen (Auftrag)

Reihenfolge = empfohlene Bau-+Test-Etappen (je ein Durchgang, je +1 Version, Testkette dazwischen).

1. **Datenfeld + Migration** (Abschnitt 4). Klein, sichtbar im `migr.js`-Test. **Zuerst.**
2. **Accessor + Gate.** Eine zentrale Funktion `stufe()` (liest `einrichtung.simpelheit`) und ein
   Sicht-Filter, den **Navigation** und **View-Aufbau** abfragen — nicht verstreut `if`-en.
3. **Navigations-Leiste stufenabhängig.** Der Nav-Renderer zeigt die Tabs aus der Tabelle in Abschnitt 3;
   auf Stufe 1/2 statt Leiste ein „⋯"→Mehr. `--navhoehe`/Freiraum-Rechnung (Konvention Abschnitt 10 der
   UEBERGABE) muss auf „keine Leiste" sauber reagieren.
4. **View-Sichtbarkeit gaten** (betroffene Views/Funktionen aus der UEBERGABE):
   `heuteKarteZeichnen`/`planListeZeichnen` (Stufe-1/2-Freitext-Sicht vs. Karten), `view-training`/
   `view-vorschau`/`view-stoppuhr` (ab 3), `view-statistik` (ab 4, minimal ab 3), `view-profil`
   inkl. Sportart-System/Wizard/`zieleStartZeichnen` (ab 5).
5. **Ersteinrichtungs-Frage.** Ganz am Anfang (im/nach Register-Flow, vor dem ersten Hauptbildschirm):
   „Wie einfach soll die App sein? 1–5" mit kurzer Klartext-Erklärung je Stufe. Schreibt `einrichtung.simpelheit`.
6. **Umschalter unter Mehr.** „Simpelheit ändern" 1–5. Nach Wechsel: **nur neu zeichnen**, **nichts an den
   Daten anfassen** (die Invariante). Beim Hochstufen ggf. das Matching-Angebot aus Abschnitt 5 anbieten.
7. **Stufe-1/2-Editor.** Die eine Seite: Abschnitt anlegen (Name), Freitext (Stufe 1) bzw. Name+Wdh-Zeilen
   (Stufe 2). Schreibt in `plaene[]` (`freitext` bzw. `uebungen[]` mit name+wdh).

> **Eine gelbe Hauptaktion je Bildschirm** gilt auch hier (UEBERGABE Abschnitt 10): auf der Stufe-1-Seite
> ist das „+ Abschnitt", nicht mehrere gelbe Knöpfe.

---

## 7. Was **nicht** neu gebaut werden muss (schon da)

Damit der nächste Chat nichts doppelt: **Snapshot beim Loggen, IDs statt Namen, Wizard-Vorbefüllung,
Pausentimer (+30/−15 s), verschlüsselte Sicherung + Banner, Übungstyp→Log-Layout** existieren bereits.
Nicht neu erfinden, nur an die Stufen-Sicht anschließen.

---

## 8. Test-Auswirkung (in die bestehende Kette einhängen)

* **`migr.js`:** neue Felder werden gesetzt, **idempotent** (zweiter Lauf ändert nichts); Bestandskonto → `simpelheit = 5`.
* **Neuer Rundlauf-Test (der wichtigste):** Daten auf Stufe 5 anlegen → auf 1 senken → wieder auf 5 heben →
  **Datenstand identisch**. Das ist die maschinelle Prüfung der Invariante aus Abschnitt 2.
* **`flow.js`/DOM-Test:** je Stufe rendert die **richtige** Navigation und nur die erlaubten Views; „⋯"→Mehr
  ist auf 1/2 erreichbar.
* **Matching (Abschnitt 5):** exakter Treffer wird angeboten, Nicht-Treffer bleibt Freitext, `freitext`
  überlebt die Übernahme.

---

## 9. Offene Entscheidungen (vom Nutzer zu bestätigen — nicht raten)

1. **Schnitt der Stufen 3 und 4** (Tabelle Abschnitt 3): Liegt die Grenze „Statistik erscheint" richtig bei
   3→4? Oder soll Stufe 3 schon eine Mini-Statistik zeigen / Stufe 4 die Ziele?
2. **Loggen auf Stufe 1/2:** Interpretation hier = Stufe 1/2 **definieren nur Pläne**, echtes Training/Logging
   ab Stufe 3. Falls Stufe 1/2 auch „schnell was notieren, das ich getan habe" können soll → zusätzliches
   additives Feld `protokoll[].freitext` (dann eigene Etappe).
3. **Stufe pro Konto** (Annahme, in `einrichtung`) — bestätigt? Alternative wäre pro Gerät (localStorage,
   wie der System-Umschalter). Pro Konto ist empfohlen, weil die Stufe die *Nutzer*-Vorliebe beschreibt,
   nicht das Gerät.
