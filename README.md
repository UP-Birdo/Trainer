# Trainer

[![Tests](https://github.com/UP-Birdo/Trainer/actions/workflows/tests.yml/badge.svg)](https://github.com/UP-Birdo/Trainer/actions/workflows/tests.yml)

**Dein Training. Deine Daten. Sonst niemand.**

Trainer ist eine private Trainings-App fürs iPhone (läuft auch auf Android und am
Computer): Trainingspläne, sprachgeführtes Training mit Timer und Ansagen,
automatische Steigerung und Statistik — komplett verschlüsselt, komplett offline,
ohne Konto bei irgendeinem Anbieter.

**➡ App öffnen: <https://up-birdo.github.io/Trainer/>**

## Was diese App anders macht

- ✓ **Ende-zu-Ende verschlüsselt** — Deine Daten liegen nur auf deinem Gerät,
  geschützt mit echter Verschlüsselung (AES-GCM, Schlüssel aus deinem Passwort).
  Es gibt keinen Server, der gehackt werden könnte.
- ✓ **Keine Werbung. Kein Abo. Kein Tracking.** — Nichts wird gemessen, verkauft
  oder beworben. Du bist der Nutzer — nicht das Produkt.
- ✓ **Funktioniert komplett offline** — Im Keller-Gym ohne Empfang genauso wie im
  Flugzeug: Die App braucht nach dem ersten Öffnen kein Internet mehr.
- ✓ **Deine Daten gehören dir** — Verschlüsselte Sicherung zum Mitnehmen, Umzug
  aufs neue Handy in einer Minute. Plus Wiederherstellungscode, falls du das
  Passwort vergisst.
- ✓ **Passt sich dir an** — Vom simplen Notizblock (Stufe 1) bis zum vollen
  Trainings-System mit Timer, Ansagen und automatischer Steigerung (Stufe 5):
  Du wählst die Einfachheits-Stufe, deine Daten bleiben immer dieselben.

## Installation auf dem iPhone

1. Den App-Link oben in **Safari** öffnen.
2. Teilen-Symbol antippen → **„Zum Home-Bildschirm"**.
3. Fertig — Trainer startet ab jetzt wie eine normale App, auch ohne Internet.

Android: Link in Chrome öffnen → Menü → „App installieren".
Computer: einfach im Browser benutzen.

<!-- Screenshots: Bilder nach docs/bilder/ hochladen, dann diese beiden
     Kommentar-Zeilen (die mit den spitzen Klammern) löschen.

## Screenshots

| Start | Training | Statistik |
|---|---|---|
| ![Start](docs/bilder/start.png) | ![Training](docs/bilder/training.png) | ![Statistik](docs/bilder/statistik.png) |

-->

## Funktionen

- Trainingspläne selbst bauen oder vom Assistenten erstellen lassen
- Sprachgeführtes Training: Ansagen, Timer, Pausen — Handy weglegen und trainieren
- Automatische Steigerung (Doppelprogression) samt Deload-Wochen
- Statistik: Trainings-Kalender, Volumen, Gewichtskurve, Übungs-Fortschritt,
  Bestwerte, Ausdauer-Kurve
- Über 130 Übungen, mehrere Sportarten, eigene Übungen anlegbar
- „Einfachheit" Stufe 1–5: von der reinen Notiz bis zum vollen System —
  Umstellen ändert nie deine Daten
- Verschlüsselte Sicherung (Export/Import) und Wiederherstellungscode
- Unterbrochenes Training? Die App bietet beim nächsten Öffnen an, genau dort
  weiterzumachen

## Datenschutz & Sicherheit

- **Kein Server, keine Cloud, kein Konto bei Dritten.** Alle Daten bleiben auf
  deinem Gerät.
- **Zero-Knowledge:** Die Daten sind mit einem Schlüssel aus deinem Passwort
  verschlüsselt (PBKDF2 mit 310 000 Runden → AES-GCM). Selbst wer diese Website
  betreibt, kann sie nicht lesen.
- Auch die exportierte Sicherungsdatei ist verschlüsselt.
- Der Quellcode liegt offen in diesem Repository — jeder kann nachprüfen, dass
  die App genau das tut.

## Technik

Bewusst einfach gehalten:

- **Eine einzige HTML-Datei** — kein Framework, kein Build-Schritt, keine
  Abhängigkeiten.
- PWA mit Service Worker → funktioniert offline und aktualisiert sich selbst.
- Regressionstests in [tests/](tests/) laufen bei jedem Upload automatisch
  (grünes Häkchen oben im Badge).

## Feedback

Am einfachsten direkt **in der App**: Mehr → Feedback (öffnet ein fertig
ausgefülltes GitHub-Issue). Oder hier im Repository ein
[Issue eröffnen](https://github.com/UP-Birdo/Trainer/issues/new/choose).

## Lizenz

[MIT](LICENSE) — frei nutzbar mit Namensnennung.
