---
name: run-istqb-quiz
description: Build, run, screenshot and smoke-test the istqb-quiz app (Vite + React SPA). Use when asked to run, start, launch, preview, screenshot, or verify the ISTQB quiz app in a real browser.
---

# Run istqb-quiz

Vite 8 + React 19 + Tailwind 4 SPA, komplett clientseitig (kein Backend,
Fortschritt liegt in `localStorage`). Deployment: GitHub Pages unter dem
Base-Pfad `/istqb-quiz/`.

Angetrieben wird die App über **`.claude/skills/run-istqb-quiz/driver.mjs`**
(Playwright/Chromium, headless). Der Driver startet den Dev-Server selbst,
wenn keiner läuft, und stoppt ihn danach wieder.

**Alle Pfade und Kommandos sind relativ zum Projekt-Root** und müssen von
dort laufen — der Driver importiert `playwright` aus `./node_modules`.

## Prerequisites

Node ist **nicht** vorausgesetzt, dieses Setup wurde mit Node 26.9.0
(Homebrew) verifiziert. CI (`.github/workflows/deploy.yml`) baut mit Node 20.

```bash
brew install node
```

```bash
npm install
```

Playwright ist **keine** Dependency des Projekts — bewusst, damit
`npm ci` in CI schlank bleibt. Für den Driver einmalig nachinstallieren:

```bash
npm install --no-save playwright && npx playwright install chromium
```

## Run (agent path)

Voller Smoke-Durchlauf — Startseite, Quiz öffnen, Frage beantworten,
Persistenz, Glossar, Console-Errors. Exit-Code 1 bei Fehlschlag:

```bash
node .claude/skills/run-istqb-quiz/driver.mjs smoke
```

Erwartete Ausgabe:

```
✓ Dev-Server bereit nach 1.0s
✓ Startseite gerendert, 6 Kapitel
✓ Quiz geöffnet, Fortschritt 1/35
✓ Antwort ausgewertet, Erklärungen sichtbar
✓ Fortschritt in localStorage persistiert
✓ Glossar geöffnet
✓ keine Console-Errors

✓ SMOKE PASSED
```

Probeprüfung mit Zeitlimit — stellt die Uhr um eine volle Stunde vor und
prüft, dass der Ablauf die Prüfung beendet und das Ergebnis schreibt
(~7s, `--unlock` ist implizit):

```bash
node .claude/skills/run-istqb-quiz/driver.mjs exam
```

```
✓ Probeprüfung gestartet, Countdown steht auf 60:00
✓ Countdown nach 30 Min korrekt bei 30:00
✓ Zeitablauf beendet die Prüfung und zeigt das Ergebnis
✓ Ergebnis in examHistory persistiert (0/40)

✓ EXAM PASSED
```

Einzelner Screenshot:

```bash
node .claude/skills/run-istqb-quiz/driver.mjs shot home
```

Screenshots landen in `.claude/skills/run-istqb-quiz/screenshots/`
(gitignored). **Sieh sie dir an** — ein leeres Bild heißt, die App ist
nicht hochgekommen.

### Flags

| Flag | Wirkung |
|---|---|
| `--unlock` | Kapitel §02–§05 freischalten (siehe Gotchas) |
| `--mobile` | Viewport 390×844 statt 1280×900 |
| `--light` | Light-Theme statt Dark |
| `--headed` | Sichtbares Browserfenster |
| `--url=…` | Andere URL, z. B. der Preview-Server |
| `--out=…` | Anderes Screenshot-Verzeichnis |

Verifizierte Kombination:

```bash
node .claude/skills/run-istqb-quiz/driver.mjs shot home-mobile-light --mobile --light --unlock
```

## Build

```bash
npm run build
```

Läuft in <1s, Output nach `dist/`. Der Bundle-Chunk ist ~531 kB
(gzip ~152 kB) — Vite warnt über die 500-kB-Grenze. Das ist der
Normalzustand, kein Regressionssignal.

Produktions-Build gegenprüfen (Driver funktioniert auch dagegen):

```bash
npm run preview
```

```bash
node .claude/skills/run-istqb-quiz/driver.mjs smoke --url=http://localhost:4173/istqb-quiz/
```

## Run (human path)

```bash
npm run dev
```

Öffnet nichts von selbst; die App liegt unter
<http://localhost:5173/istqb-quiz/>. Beenden mit Ctrl-C.

## Test

Es gibt **keine** Testsuite — kein `npm test`, kein Vitest, kein Playwright-
Test-Runner im Projekt. `smoke` und `exam` oben sind die einzigen
Ausführungsprüfungen. Lint:

```bash
npm run lint
```

`npm run lint` ist sauber (Exit 0). Jeder neue Befund kommt also von
deiner Änderung.

## Gotchas

- **Base-Pfad `/istqb-quiz/`.** `vite.config.js` setzt `base`, weil die App
  auf GitHub Pages in einem Unterpfad liegt. `http://localhost:5173/`
  antwortet mit **302** auf `/istqb-quiz/` — im Browser unauffällig, aber
  ein `curl` ohne `-L` auf die Root-URL sieht keinen HTML-Body. Immer die
  volle URL inklusive `/istqb-quiz/` verwenden.
- **Kapitel §02–§05 sind gesperrt.** `src/App.jsx` schaltet sie nur frei,
  wenn `?unlock=<CODE>` in der URL steht. Den Code brauchst du nicht: die
  App liest danach ausschließlich `localStorage['istqb_unlock_all'] === '1'`.
  Der Driver setzt das Flag per `addInitScript` (`--unlock`) — so bleibt der
  Secret-Code aus Skripten und Logs heraus. Ohne `--unlock` sind die
  „Quiz starten"-Buttons der gesperrten Kapitel im DOM **vorhanden, aber
  `disabled`** — ein blinder `.click()` auf den falschen Index läuft ins
  Leere statt zu scheitern. Der Driver nimmt deshalb `.first()` (§01 ist frei).
- **Der Driver muss im Projekt-Root laufen.** `playwright` wurde mit
  `--no-save` installiert und liegt nur in `./node_modules`. Ein Skript
  außerhalb des Repos scheitert mit `ERR_MODULE_NOT_FOUND: playwright`.
- **`--no-save` überlebt kein `npm ci`.** Nach einem sauberen Install ist
  Playwright weg und der Driver bricht mit einem Hinweis ab. Dann die
  Install-Zeile aus Prerequisites erneut ausführen.
- **Kein Chrome auf dem Rechner.** Playwright bringt seine eigene
  Chromium-Headless-Shell mit (~94 MB, nach
  `~/Library/Caches/ms-playwright/`). Ein systemweites Chrome/Chromium gibt
  es hier nicht — `channel: 'chrome'` in Playwright würde scheitern.
- **Kein „Richtig"/„Falsch"-Text nach dem Absenden.** Das Feedback ist rein
  farblich (rote/grüne Rahmen) plus eine Erklärung pro Option. Nicht auf
  Ergebnistext asserten — der Driver wartet stattdessen auf den Button
  „Nächste Frage".
- **Die Fake-Clock muss in 1-Sekunden-Schritten laufen.** Der Countdown hängt
  jeden Tick an ein frisches `setTimeout`, das erst nach dem React-Render
  existiert. Ein einzelnes `page.clock.fastForward('60:00')` feuert deshalb nur
  den ersten Timer und die Uhr bleibt bei 59:00 stehen. Der Driver schleift
  stattdessen über `runFor(1000)` — ~1,9ms pro Tick, eine Stunde also ~7s.
- **Fortschritt ist persistent.** Ein Durchlauf schreibt
  `localStorage['istqb_progress']`. Der Driver nutzt pro Lauf einen frischen
  Browser-Context, startet also immer sauber; im echten Browser muss man
  „Fortschritt zurücksetzen" klicken.

## Troubleshooting

| Symptom | Ursache / Fix |
|---|---|
| `Cannot find package 'playwright'` | Skript lief außerhalb des Projekt-Roots, oder `npm ci` hat die `--no-save`-Installation entfernt. Install-Zeile aus Prerequisites erneut ausführen und aus dem Root starten. |
| `command not found: node` | Node fehlt komplett. `brew install node`. |
| `Dev-Server wurde unter … nicht erreichbar` | Port 5173 belegt (`pkill -f vite`), oder `npm install` wurde nie ausgeführt. |
| Driver hängt nach Abbruch, Port bleibt belegt | Bei hartem Kill bleibt der gespawnte Vite-Prozess stehen: `pkill -f vite`. |
| Smoke bricht bei „nur N Kapitel gerendert" ab | `src/data/quizData.json` kaputt oder Startseite rendert nicht — Screenshot in `screenshots/home.png` ansehen. |
