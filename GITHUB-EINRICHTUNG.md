# GitHub einrichten — Klick-Anleitung

Diese Anleitung führt dich einmal durch alles, was dein Repository für
Außenstehende attraktiv macht. Die Dateien dafür liegen schon fertig im
Trainer-Ordner. Diese Anleitung selbst musst du NICHT hochladen (darf aber —
sie verrät nichts Geheimes).

**Sicherheitsregel vorweg:** Niemals Passwörter, Tokens oder Schlüssel in
irgendeine Datei im Repository schreiben — alles dort ist öffentlich lesbar.

---

## 0. Was ist neu im Ordner?

| Datei | Zweck | Hochladen? |
|---|---|---|
| `README.md` | Die öffentliche Visitenkarte — sieht jeder Besucher zuerst | Ja |
| `CHANGELOG.md` | Versions-Liste (aus „Was ist neu" der App) | Ja |
| `LICENSE` | MIT-Lizenz (Standardtext, englisch — das ist so üblich) | Ja |
| `.github\ISSUE_TEMPLATE\` | 3 Formular-Vorlagen für Fehler/Wunsch/Frage | Ja |
| `.github\workflows\tests.yml` | Lässt deine Tests bei jedem Upload automatisch laufen | Ja |
| `tests\` | Wird jetzt von der Test-Automatik gebraucht | Ja (jetzt Pflicht) |
| `GITHUB-EINRICHTUNG.md` | diese Anleitung | Optional |

---

## 1. Platzhalter ersetzen — ✓ ERLEDIGT

Benutzername **`UP-Birdo`** und Repo-Name **`Trainer`** sind bereits in
`README.md` und `LICENSE` eingetragen (App-Adresse:
`https://up-birdo.github.io/Trainer/`). Hier ist nichts mehr zu tun.

> Wichtig ist nur: Das Repository auf GitHub muss wirklich **Trainer** heißen
> (Groß-/Kleinschreibung egal). Heißt es anders → Repo-Seite → Settings →
> ganz oben „Repository name" → umbenennen. GitHub Pages und die App
> funktionieren danach unter der neuen Adresse weiter.

---

## 2. Dateien hochladen

1. Dein Repository auf github.com öffnen.
2. **Add file → Upload files**.
3. Aus dem Trainer-Ordner ins Browserfenster ziehen:
   `README.md`, `CHANGELOG.md`, `LICENSE`, den Ordner `tests` und den Ordner
   `.github` (ganze Ordner ziehen — GitHub übernimmt die Struktur).
4. Unten als Beschreibung z. B. „Projektseite: README, Changelog, Lizenz,
   Issue-Vorlagen, Test-Automatik" → **Commit changes**.

**Falls sich der `.github`-Ordner nicht ziehen lässt** (manche Browser mögen
Ordner mit Punkt nicht): **Add file → Create new file**, als Dateinamen den
kompletten Pfad tippen: `.github/workflows/tests.yml` — jeder Schrägstrich
erzeugt automatisch einen Ordner. Inhalt aus der Datei kopieren, committen.
Dasselbe für die vier Dateien unter `.github/ISSUE_TEMPLATE/`
(`config.yml`, `fehler.yml`, `wunsch.yml`, `frage.yml`).

---

## 3. About-Box füllen (rechte Spalte der Repo-Seite)

Klicke auf das **Zahnrad ⚙** neben „About" (rechts oben):

- **Description** — reinkopieren:

      Private Trainings-App fürs iPhone — verschlüsselt, offline, ohne Server. Eine HTML-Datei, kein Framework.

- **Website**: Häkchen bei „Use your GitHub Pages website" setzen (trägt die
  App-Adresse automatisch ein).
- **Topics** — einzeln eintippen, nach jedem Enter drücken:

      pwa, fitness, workout, offline-first, ios, privacy, encryption, vanilla-js, no-backend

- **Save changes**.

Über die Topics wird dein Projekt in der GitHub-Suche gefunden.

---

## 4. Social-Preview-Bild (Vorschau beim Teilen von Links)

**Settings → General** → runterscrollen bis **„Social preview"** → **Edit →
Upload an image** → dein `Trainer-Icon-1024.png` hochladen.

Ohne dieses Bild erscheint beim Teilen deines Repo-Links (WhatsApp, Teams …)
nur ein graues GitHub-Standardbild. Ideal wären 1280×640 Pixel — dein
quadratisches Icon funktioniert aber, GitHub passt es ein.

---

## 5. Labels beschriften (optional, 2 Minuten)

**Issues → Labels**. Die drei Labels, die deine App benutzt (`bug`,
`enhancement`, `question`), existieren schon. Optional je Label auf **Edit**
und eine deutsche Beschreibung eintragen:

| Label | Description |
|---|---|
| `bug` | Fehler in der App |
| `enhancement` | Wunsch oder Verbesserung |
| `question` | Frage zur App oder zum Code |

---

## 6. Ersten Release anlegen (zeigt: das Projekt lebt)

Rechte Spalte → **Releases** → **Create a new release**:

1. **Choose a tag** → `v82` eintippen → „**Create new tag: v82** on publish"
   anklicken.
2. **Release title**: `Trainer 0.082`
3. Beschreibung — reinkopieren:

       - Neue Willkommens-Seite beim allerersten Öffnen: zeigt groß, was diese App von anderen unterscheidet — Verschlüsselung, keine Werbung, kein Tracking, komplett offline.
       - Geht etwas schief, bleibt die App nicht mehr stumm: Der Fehler wird angezeigt und lässt sich mit einem Tipp als GitHub-Meldung übergeben.
       - „Gut zu wissen" komplett auf den neuesten Stand gebracht.

4. **Publish release**.

Bei künftigen Versionen genauso: Tag `v83`, Titel `Trainer 0.083`, Punkte aus
der `CHANGELOG.md` kopieren.

---

## 7. Kontrolle: läuft die Test-Automatik?

Nach dem Upload aus Schritt 2: Tab **Actions** (oben) → dort sollte ein Lauf
„Tests" erscheinen und nach ~1 Minute ein **grünes Häkchen** bekommen.
Gleichzeitig wird das Badge oben im README grün.

Falls **rot**: auf den Lauf klicken — das Log zeigt, welcher Schritt
fehlschlug. Häufigste Ursache: der `tests`-Ordner fehlt im Repository.

---

## 8. Repository auf deinem Profil anpinnen

Deine Profilseite (`github.com/` + Benutzername) → **Customize your pins** →
Trainer-Repo ankreuzen → Save. So sehen Besucher deines Profils das Projekt
sofort.

---

## 9. Später: Screenshots ins README

1. Auf dem iPhone: **Seitentaste + Lauter-Taste** gleichzeitig — je ein
   Screenshot von Start, Training und Statistik.
2. Auf den PC übertragen und umbenennen zu `start.png`, `training.png`,
   `statistik.png`.
3. Lokal einen Ordner `docs` mit Unterordner `bilder` anlegen, die drei Bilder
   hinein — dann auf GitHub **Add file → Upload files** und den ganzen
   `docs`-Ordner hineinziehen, committen.
4. `README.md` auf GitHub öffnen → Stift-Symbol (Edit) → im Screenshot-Block
   die zwei Kommentar-Zeilen löschen: die Zeilen, die mit `<!--` beginnen,
   und die Zeile `-->`. Committen — die Bilder erscheinen.

---

## 10. Merkzettel: bei jeder neuen App-Version

1. `index.html` + `sw.js` hochladen (wie bisher — beide!).
2. `CHANGELOG.md`: neuen Abschnitt oben ergänzen (Text aus „Was ist neu").
3. Release anlegen (Schritt 6, dauert 1 Minute).

Die Test-Automatik läuft von selbst bei jedem Upload.
