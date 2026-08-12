# Design: Fragen-Generator für istqb-quiz (Ollama)

Datum: 2026-08-12

## Zweck

Admin-Tool (nur für den Repo-Maintainer, nicht Teil der öffentlichen
istqb-quiz-App), das mit Ollama neue Multiple-Choice-Fragen aus den
vorhandenen Syllabus-Texten (`src/data/theory-1.md` … `theory-5.md`)
generiert, zur manuellen Prüfung anzeigt, und akzeptierte Fragen
automatisch in `src/data/quizData.json` einträgt, committet und pusht.
Läuft ausschließlich lokal auf dem Mac-Mini-Homeserver (Docker, nur per
Tailscale erreichbar) — die öffentliche istqb-quiz-App (GitHub Pages)
bleibt komplett unverändert und bekommt keine Ollama-Abhängigkeit.

## Nutzerfluss

1. Kapitel wählen (1–5) und Anzahl gewünschter neuer Fragen.
2. Backend liest den passenden `theory-N.md`-Text und die bereits
   vorhandenen Fragen dieses Kapitels aus `quizData.json` (zur
   Duplikat-Vermeidung — die vorhandenen Fragen werden Ollama als Kontext
   mitgegeben: "erstelle KEINE Fragen, die diesen bereits vorhandenen
   inhaltlich entsprechen").
3. Ollama generiert N neue Fragen im bestehenden Schema (`question`,
   `options` [4], `correct` [Index], `explanation`).
4. UI zeigt jede generierte Frage mit Annehmen/Verwerfen-Checkbox.
5. Klick "Übernehmen": Backend vergibt fortlaufende `id`s (weiter ab dem
   aktuellen Maximum), setzt `chapter` und `points: 1`, hängt die
   akzeptierten Fragen an `quizData.json` an, formatiert (gleiche
   Einrückung wie bisher), committet mit einer Conventional-Commit-Message
   und pusht zu `origin/main` — automatisch, kein Zwischenschritt (Tool ist
   Single-User, nur für den Maintainer).

## Architektur

- **Ort im Repo:** neuer Unterordner `question-generator/` im
  `istqb-quiz`-Repo (Python-Backend + einfaches HTML/JS-Frontend, kein
  eigenes React/Vite nötig — reicht als schlichtes serverseitig gerendertes
  oder Vanilla-JS-Formular, da es nur ein internes Admin-Tool ist).
- **Backend:** FastAPI (`question-generator/app.py`), analog zum
  `vokabel-song`-Projekt (`~/vokabel-song`) — gleiches Muster:
  Ollama-Call über `urllib`, `VokabelSongError`-artige eigene Exception,
  Git-Operationen über `subprocess.run(["git", ...], cwd=REPO_ROOT)`.
- **Deployment:** eigener Docker-Container (oder direkt `uvicorn` im
  Vordergrund/als `launchd`-Dienst — kein Compose-Overhead nötig für ein
  Single-Container-Admin-Tool), auf dem Mac Mini, erreichbar nur über
  Tailscale (kein öffentlicher Port).
- **Git-Zugriff:** Backend operiert direkt im Server-seitigen Checkout
  dieses Repos (`istqb-quiz`) auf dem Mac Mini — derselbe Checkout, den
  `gh`/`git` dort bereits nutzt. Kein separates Auth-Setup nötig
  (wiederverwendet die bestehende `gh auth setup-git`-Konfiguration vom
  vokabel-song-Deployment).

## Komponenten

### Backend

- `generiere_fragen(kapitel: int, anzahl: int, syllabus_text: str, vorhandene_fragen: list[dict]) -> list[dict]`
  Ein Ollama-Call. Prompt enthält den Syllabus-Text, eine Kurzliste der
  vorhandenen Fragen (nur `question`-Text, zur Dopplungsvermeidung), und
  die Anweisung, `anzahl` neue Fragen im JSON-Array-Format
  `[{"question": "...", "options": ["...","...","...","..."], "correct": 0, "explanation": "..."}]`
  zurückzugeben. Gleiche Validierung wie `generiere_quiz_fragen` in
  `vokabel-song`: 4 Optionen, `correct` ein gültiger Index, alle Strings.
- `naechste_frage_id(quiz_data: dict) -> int` — `max(q["id"] for q in quiz_data["questions"]) + 1`.
- `uebernehme_fragen(kapitel: int, akzeptierte_fragen: list[dict]) -> None`
  Lädt `quizData.json`, vergibt IDs fortlaufend, hängt an `questions` an,
  schreibt die Datei zurück (gleiche Formatierung: `json.dump(..., ensure_ascii=False, indent=2)`),
  führt `git add src/data/quizData.json`, `git commit -m "feat(quiz): add N generated questions for chapter M"`,
  `git push` aus (via `subprocess.run`, Fehler werfen eine eigene
  Exception mit dem stderr-Text).
- Endpoints:
  - `POST /api/generate-questions` — `{kapitel: int, anzahl: int}` → gibt die generierten (noch nicht übernommenen) Fragen zurück.
  - `POST /api/accept-questions` — `{kapitel: int, fragen: list[dict]}` → schreibt, committet, pusht; gibt den Push-Status zurück.

### Frontend

Einfaches Vanilla-HTML+JS (eine Datei `question-generator/static/index.html`
mit `<script>`-Block, kein Build-Schritt) — reicht für ein internes
Ein-Personen-Tool:
- Formular: Kapitel-Dropdown (1–5, mit Titeln aus `chapters`), Anzahl-Eingabe.
- Nach Generieren: Liste der Fragen mit Checkbox pro Frage (Text, 4
  Optionen mit markierter richtiger Antwort, Erklärung sichtbar), Button
  "Ausgewählte übernehmen".
- Nach Übernahme: Erfolgsmeldung mit Commit-Hash/Push-Status oder
  Fehlermeldung.

## Fehlerbehandlung

- Ollama nicht erreichbar / ungültiges JSON / falsches Schema → eigene
  Exception, HTTP 502, Fehlertext im UI.
- `git push` schlägt fehl (z.B. Netzwerk, Konflikt) → Fragen sind bereits
  lokal in `quizData.json` geschrieben und committet, nur der Push
  schlägt fehl — Fehlermeldung weist darauf hin, dass ein manueller
  `git push` im Repo auf dem Mac Mini nötig ist (kein automatischer
  Retry, keine Datenverlust-Gefahr, da der Commit bereits existiert).

## Testing

- `generiere_fragen`: Tests mit gemocktem Ollama, analog zu
  `vokabel-song`s `test_quiz.py` (gültiges JSON, Markdown-Fence,
  ungültiges Schema, fehlende Optionen).
- `naechste_frage_id`: reiner Unit-Test.
- `uebernehme_fragen`: Test mit temporärem Git-Repo (tmp_path,
  `git init` im Test), prüft dass Datei geschrieben, committet, und
  (lokal, ohne echten Remote) der Commit existiert — `git push` selbst
  wird mit einem Fake-Remote oder gemocktem `subprocess.run` getestet,
  kein echter Push in Tests.
- Kein automatisiertes Frontend-Test-Setup (Vanilla JS, kein Framework) —
  manuelle Verifikation wie bei den `vokabel-song`-Frontend-Tasks.

## Out of Scope

- Keine Bewertung von Freitextantworten (Multiple-Choice bleibt wie es
  ist — bewusste Entscheidung, siehe Brainstorming).
- Keine Änderung an der öffentlichen istqb-quiz-App selbst (kein neuer
  Menüpunkt, kein neuer Code-Pfad dort) — der Generator ist komplett
  getrennt und lebt nur im `question-generator/`-Unterordner.
- Kein automatischer Review/Freigabe-Workflow über mehrere Personen — Tool
  ist für genau einen Nutzer (den Maintainer).
- Kein Löschen/Bearbeiten bestehender Fragen — nur Hinzufügen neuer.
