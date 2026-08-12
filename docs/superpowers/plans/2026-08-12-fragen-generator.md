# Fragen-Generator (Ollama) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a small, admin-only tool (lives in `question-generator/` inside this repo) that uses Ollama to generate new ISTQB-style multiple-choice questions from the existing syllabus text, lets the maintainer review/accept them in a minimal web UI, then writes, commits, and pushes accepted questions into `src/data/quizData.json` — completely separate from the public istqb-quiz app.

**Architecture:** FastAPI backend (`question-generator/app.py` + `question-generator/fragen_generator.py`) mirroring the `vokabel-song` project's patterns (Ollama via `urllib`, a custom exception mapped to HTTP 502, `git` operations via `subprocess`), plus a single-file vanilla HTML/JS frontend (no build step — this is a one-person internal tool). Runs in Docker on the Mac Mini homeserver, reachable only via Tailscale.

**Tech Stack:** Python 3.11, FastAPI, uvicorn, pytest; vanilla HTML/CSS/JS (no framework, no build step); Docker.

## Global Constraints

- This tool is **completely separate** from the public istqb-quiz React app — no changes to `src/App.jsx` or any other public-app file, no new menu entry, no shared runtime dependency. The public app keeps deploying to GitHub Pages exactly as before.
- The backend operates directly on a git checkout of this repo: `REPO_ROOT` defaults to the parent directory of `question-generator/` (i.e. this repo's own root, for running directly on the host) but can be overridden via the `REPO_ROOT` environment variable (needed for the Docker deployment in Task 5, where the checkout is bind-mounted at a different path). `QUIZ_DATA_PATH` is `<REPO_ROOT>/src/data/quizData.json`, `THEORY_DIR` is `<REPO_ROOT>/src/data`.
- Accepted questions are written with the **exact existing `quizData.json` schema**: `{"id": int, "chapter": int, "points": 1, "question": str, "options": [str, str, str, str], "correct": int, "explanation": str}`. New IDs continue from the current maximum ID in the file (`max(existing ids) + 1`, incrementing per new question).
- `git add`/`commit`/`push` run via `subprocess.run(["git", ...], cwd=REPO_ROOT)`. If `push` fails after `commit` succeeds, the error message must say the commit exists locally and only the push needs to be retried manually — no automatic retry, no data loss.
- A custom exception (`FragenGeneratorError`) is raised on any Ollama or git failure; the API maps it to HTTP 502 with `{"error": str}}`, same pattern as `vokabel-song`'s `VokabelSongError`.
- No automated tests for the frontend (plain HTML/JS, no framework) — verify manually via curl against a running backend, same approach used for `vokabel-song`'s frontend tasks.
- All Python tests run via `python3 -m pytest tests/ -v` from inside `question-generator/` (not the repo root) — `question-generator/` is its own self-contained Python project, and running `pytest` from within it puts it on `sys.path` so the plain `import fragen_generator` / `import app` statements used across the test files and inside `app.py` itself resolve correctly.
- Git operations in tests must never touch the real network/remote — use a local bare repo as a fake `origin` (`git init --bare` in a temp directory), never mock `subprocess.run` unless explicitly noted.

---

### Task 1: `generiere_fragen()` — Ollama-generated ISTQB-style questions

**Files:**
- Create: `question-generator/fragen_generator.py`
- Create: `question-generator/requirements.txt`
- Create: `question-generator/tests/conftest.py`
- Create: `question-generator/tests/test_fragen_generator.py`

**Interfaces:**
- Produces: `question_generator.fragen_generator.FragenGeneratorError(Exception)`; `fragen_generator.generiere_fragen(kapitel: int, anzahl: int, syllabus_text: str, vorhandene_fragen: list[dict]) -> list[dict]`, where each returned dict has `question: str`, `options: list[str]` (exactly 4), `correct: int` (valid index), `explanation: str`. Module constants: `REPO_ROOT`, `QUIZ_DATA_PATH`, `THEORY_DIR`, `OLLAMA_URL`, `OLLAMA_MODEL`.

- [ ] **Step 1: Create `question-generator/requirements.txt`**

```
fastapi>=0.115
uvicorn[standard]>=0.32
httpx>=0.27
pytest>=8.0
```

- [ ] **Step 2: Create `question-generator/tests/conftest.py`**

```python
import importlib.util
import pathlib

import pytest

MODULE_PATH = (
    pathlib.Path(__file__).resolve().parent.parent / "fragen_generator.py"
)


@pytest.fixture
def fragen_generator():
    spec = importlib.util.spec_from_file_location("fragen_generator", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
```

- [ ] **Step 3: Write `question-generator/tests/test_fragen_generator.py` (will fail — module doesn't exist yet)**

```python
import json

import pytest


class FakeResponse:
    def __init__(self, body: bytes):
        self._body = body

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_generiere_fragen_parses_json_array(fragen_generator, monkeypatch):
    ollama_body = json.dumps(
        {
            "response": json.dumps(
                [
                    {
                        "question": "Was ist Prompt Engineering?",
                        "options": ["a", "b", "c", "d"],
                        "correct": 1,
                        "explanation": "b ist richtig, weil ...",
                    }
                ]
            )
        }
    ).encode("utf-8")

    monkeypatch.setattr(
        fragen_generator.urllib.request,
        "urlopen",
        lambda req, timeout: FakeResponse(ollama_body),
    )

    fragen = fragen_generator.generiere_fragen(2, 1, "Syllabus-Text ...", [])

    assert fragen == [
        {
            "question": "Was ist Prompt Engineering?",
            "options": ["a", "b", "c", "d"],
            "correct": 1,
            "explanation": "b ist richtig, weil ...",
        }
    ]


def test_generiere_fragen_strips_markdown_fence(fragen_generator, monkeypatch):
    fenced = (
        "```json\n"
        + json.dumps(
            [
                {
                    "question": "?",
                    "options": ["a", "b", "c", "d"],
                    "correct": 2,
                    "explanation": "...",
                }
            ]
        )
        + "\n```"
    )
    ollama_body = json.dumps({"response": fenced}).encode("utf-8")

    monkeypatch.setattr(
        fragen_generator.urllib.request,
        "urlopen",
        lambda req, timeout: FakeResponse(ollama_body),
    )

    fragen = fragen_generator.generiere_fragen(1, 1, "Text", [])

    assert fragen[0]["correct"] == 2


def test_generiere_fragen_raises_on_invalid_json(fragen_generator, monkeypatch):
    ollama_body = json.dumps({"response": "kein json hier"}).encode("utf-8")

    monkeypatch.setattr(
        fragen_generator.urllib.request,
        "urlopen",
        lambda req, timeout: FakeResponse(ollama_body),
    )

    with pytest.raises(fragen_generator.FragenGeneratorError):
        fragen_generator.generiere_fragen(1, 1, "Text", [])


def test_generiere_fragen_raises_on_malformed_outer_json(fragen_generator, monkeypatch):
    ollama_body = b"not valid json at all"

    monkeypatch.setattr(
        fragen_generator.urllib.request,
        "urlopen",
        lambda req, timeout: FakeResponse(ollama_body),
    )

    with pytest.raises(fragen_generator.FragenGeneratorError):
        fragen_generator.generiere_fragen(1, 1, "Text", [])


def test_generiere_fragen_raises_on_wrong_options_count(fragen_generator, monkeypatch):
    fragen = [
        {
            "question": "?",
            "options": ["a", "b", "c"],
            "correct": 0,
            "explanation": "...",
        }
    ]
    ollama_body = json.dumps({"response": json.dumps(fragen)}).encode("utf-8")

    monkeypatch.setattr(
        fragen_generator.urllib.request,
        "urlopen",
        lambda req, timeout: FakeResponse(ollama_body),
    )

    with pytest.raises(fragen_generator.FragenGeneratorError):
        fragen_generator.generiere_fragen(1, 1, "Text", [])


def test_generiere_fragen_raises_on_invalid_correct_index(fragen_generator, monkeypatch):
    fragen = [
        {
            "question": "?",
            "options": ["a", "b", "c", "d"],
            "correct": 4,
            "explanation": "...",
        }
    ]
    ollama_body = json.dumps({"response": json.dumps(fragen)}).encode("utf-8")

    monkeypatch.setattr(
        fragen_generator.urllib.request,
        "urlopen",
        lambda req, timeout: FakeResponse(ollama_body),
    )

    with pytest.raises(fragen_generator.FragenGeneratorError):
        fragen_generator.generiere_fragen(1, 1, "Text", [])


def test_generiere_fragen_raises_on_missing_explanation(fragen_generator, monkeypatch):
    fragen = [{"question": "?", "options": ["a", "b", "c", "d"], "correct": 0}]
    ollama_body = json.dumps({"response": json.dumps(fragen)}).encode("utf-8")

    monkeypatch.setattr(
        fragen_generator.urllib.request,
        "urlopen",
        lambda req, timeout: FakeResponse(ollama_body),
    )

    with pytest.raises(fragen_generator.FragenGeneratorError):
        fragen_generator.generiere_fragen(1, 1, "Text", [])


def test_generiere_fragen_includes_existing_questions_in_prompt(
    fragen_generator, monkeypatch
):
    captured = {}

    def fake_urlopen(req, timeout):
        captured["prompt"] = json.loads(req.data.decode("utf-8"))["prompt"]
        body = json.dumps(
            {
                "response": json.dumps(
                    [
                        {
                            "question": "Neue Frage?",
                            "options": ["a", "b", "c", "d"],
                            "correct": 0,
                            "explanation": "...",
                        }
                    ]
                )
            }
        ).encode("utf-8")
        return FakeResponse(body)

    monkeypatch.setattr(fragen_generator.urllib.request, "urlopen", fake_urlopen)

    fragen_generator.generiere_fragen(
        1,
        1,
        "Syllabus-Text",
        [{"id": 1, "chapter": 1, "question": "Alte Frage?", "options": [], "correct": 0, "points": 1, "explanation": ""}],
    )

    assert "Alte Frage?" in captured["prompt"]
```

- [ ] **Step 4: Run tests, confirm they fail**

Run: `cd "/Users/jelenaivanova/Downloads/istqb/istqb-quiz/question-generator" && python3 -m pytest tests/ -v`
Expected: FAIL — `ModuleNotFoundError` or collection error (module doesn't exist yet)

- [ ] **Step 5: Create `question-generator/fragen_generator.py`**

```python
"""Ollama question generation and quizData.json integration for istqb-quiz."""

import json
import os
import subprocess
import urllib.request
import urllib.error

REPO_ROOT = os.environ.get(
    "REPO_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
QUIZ_DATA_PATH = os.path.join(REPO_ROOT, "src", "data", "quizData.json")
THEORY_DIR = os.path.join(REPO_ROOT, "src", "data")

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:latest")


class FragenGeneratorError(Exception):
    """Raised when question generation or git integration fails."""


def _ollama_generate(prompt: str) -> str:
    payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}

    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        raise FragenGeneratorError(f"Ollama nicht erreichbar unter {OLLAMA_URL} ({e})")
    except json.JSONDecodeError as e:
        raise FragenGeneratorError(f"Ollama hat eine ungültige Antwort geliefert: {e}")

    return data.get("response", "").strip()


def generiere_fragen(
    kapitel: int, anzahl: int, syllabus_text: str, vorhandene_fragen: list[dict]
) -> list[dict]:
    vorhandene_texte = "\n".join(f"- {f['question']}" for f in vorhandene_fragen)
    prompt = (
        f"Hier ist der Syllabus-Text zu Kapitel {kapitel}:\n\n{syllabus_text}\n\n"
        f"Erstelle {anzahl} neue Multiple-Choice-Prüfungsfragen zu diesem Kapitel, "
        f"im Stil einer ISTQB-Zertifizierungsprüfung. "
        f"Erstelle KEINE Fragen, die inhaltlich diesen bereits vorhandenen Fragen "
        f"entsprechen:\n{vorhandene_texte}\n\n"
        f"Jede Frage hat genau 4 Antwortoptionen, nur eine ist richtig, plus eine "
        f"kurze Erklärung, warum die Antwort richtig ist. "
        f"Gib NUR ein JSON-Array zurück, ohne Erklärungen außerhalb des JSON, ohne "
        f"Markdown-Codeblock, in exakt diesem Format: "
        f'[{{"question": "...", "options": ["...", "...", "...", "..."], '
        f'"correct": 0, "explanation": "..."}}]'
    )

    rohtext = _ollama_generate(prompt)
    rohtext = (
        rohtext.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    )

    try:
        fragen = json.loads(rohtext)
    except json.JSONDecodeError as e:
        raise FragenGeneratorError(f"Ollama hat kein gültiges JSON geliefert: {e}")

    if not isinstance(fragen, list) or not fragen:
        raise FragenGeneratorError("Ollama hat keine Fragen zurückgegeben.")

    for item in fragen:
        if not isinstance(item, dict):
            raise FragenGeneratorError("Ollama hat ungültige Fragen geliefert.")
        if not isinstance(item.get("question"), str):
            raise FragenGeneratorError("Ollama hat ungültige Fragen geliefert.")

        optionen = item.get("options")
        if not isinstance(optionen, list) or len(optionen) != 4:
            raise FragenGeneratorError("Ollama hat ungültige Fragen geliefert.")
        if not all(isinstance(o, str) for o in optionen):
            raise FragenGeneratorError("Ollama hat ungültige Fragen geliefert.")

        korrekt = item.get("correct")
        if not isinstance(korrekt, int) or not (0 <= korrekt < 4):
            raise FragenGeneratorError("Ollama hat ungültige Fragen geliefert.")

        if not isinstance(item.get("explanation"), str):
            raise FragenGeneratorError("Ollama hat ungültige Fragen geliefert.")

    return fragen
```

- [ ] **Step 6: Run tests, confirm they pass**

Run: `cd "/Users/jelenaivanova/Downloads/istqb/istqb-quiz/question-generator" && python3 -m pytest tests/ -v`
Expected: PASS (all tests)

- [ ] **Step 7: Commit**

```bash
git add question-generator/fragen_generator.py question-generator/requirements.txt question-generator/tests/conftest.py question-generator/tests/test_fragen_generator.py
git commit -m "feat(question-generator): add Ollama question generation"
```

---

### Task 2: `naechste_frage_id()` + `uebernehme_fragen()` — write, commit, push

**Files:**
- Modify: `question-generator/fragen_generator.py`
- Modify: `question-generator/tests/test_fragen_generator.py`

**Interfaces:**
- Produces: `fragen_generator.naechste_frage_id(quiz_data: dict) -> int`; `fragen_generator.uebernehme_fragen(kapitel: int, akzeptierte_fragen: list[dict]) -> str` (returns the commit message used). Both operate on the module-level `REPO_ROOT`/`QUIZ_DATA_PATH` (read dynamically, so tests can monkeypatch them onto a temp git repo).

- [ ] **Step 1: Append tests to `question-generator/tests/test_fragen_generator.py`**

```python
import subprocess


def _init_git_repo_with_remote(repo_root, remote_root):
    subprocess.run(["git", "init", "--bare"], cwd=remote_root, capture_output=True, check=True)
    subprocess.run(["git", "init"], cwd=repo_root, capture_output=True, check=True)
    subprocess.run(["git", "branch", "-M", "main"], cwd=repo_root, capture_output=True, check=True)
    subprocess.run(
        ["git", "config", "user.email", "test@test.local"],
        cwd=repo_root,
        capture_output=True,
        check=True,
    )
    subprocess.run(
        ["git", "config", "user.name", "Test"], cwd=repo_root, capture_output=True, check=True
    )
    subprocess.run(
        ["git", "remote", "add", "origin", str(remote_root)],
        cwd=repo_root,
        capture_output=True,
        check=True,
    )


def test_naechste_frage_id_continues_from_max(fragen_generator):
    quiz_data = {"questions": [{"id": 5}, {"id": 12}, {"id": 3}]}

    assert fragen_generator.naechste_frage_id(quiz_data) == 13


def test_naechste_frage_id_starts_at_1_when_empty(fragen_generator):
    assert fragen_generator.naechste_frage_id({"questions": []}) == 1


def test_uebernehme_fragen_writes_commits_and_pushes(fragen_generator, tmp_path, monkeypatch):
    repo_root = tmp_path / "work"
    remote_root = tmp_path / "remote.git"
    repo_root.mkdir()
    data_dir = repo_root / "src" / "data"
    data_dir.mkdir(parents=True)
    quiz_data_path = data_dir / "quizData.json"
    quiz_data_path.write_text(
        json.dumps({"chapters": [], "questions": [{"id": 1}], "glossary": []}),
        encoding="utf-8",
    )

    _init_git_repo_with_remote(repo_root, remote_root)
    subprocess.run(["git", "add", "-A"], cwd=repo_root, capture_output=True, check=True)
    subprocess.run(
        ["git", "commit", "-m", "init"], cwd=repo_root, capture_output=True, check=True
    )
    subprocess.run(
        ["git", "push", "-u", "origin", "main"],
        cwd=repo_root,
        capture_output=True,
        check=True,
    )

    monkeypatch.setattr(fragen_generator, "REPO_ROOT", str(repo_root))
    monkeypatch.setattr(fragen_generator, "QUIZ_DATA_PATH", str(quiz_data_path))

    akzeptierte = [
        {
            "question": "Neue Frage?",
            "options": ["a", "b", "c", "d"],
            "correct": 0,
            "explanation": "...",
        }
    ]

    commit_message = fragen_generator.uebernehme_fragen(3, akzeptierte)

    assert "1" in commit_message and "chapter 3" in commit_message

    updated = json.loads(quiz_data_path.read_text(encoding="utf-8"))
    assert len(updated["questions"]) == 2
    neue_frage = updated["questions"][1]
    assert neue_frage["id"] == 2
    assert neue_frage["chapter"] == 3
    assert neue_frage["points"] == 1
    assert neue_frage["question"] == "Neue Frage?"

    log = subprocess.run(
        ["git", "log", "--oneline", "-1"],
        cwd=remote_root,
        capture_output=True,
        text=True,
        check=True,
    )
    assert "chapter 3" in log.stdout


def test_uebernehme_fragen_raises_with_clear_message_when_push_fails(
    fragen_generator, tmp_path, monkeypatch
):
    repo_root = tmp_path / "work"
    data_dir = repo_root / "src" / "data"
    data_dir.mkdir(parents=True)
    quiz_data_path = data_dir / "quizData.json"
    quiz_data_path.write_text(
        json.dumps({"chapters": [], "questions": [], "glossary": []}), encoding="utf-8"
    )

    subprocess.run(["git", "init"], cwd=repo_root, capture_output=True, check=True)
    subprocess.run(["git", "branch", "-M", "main"], cwd=repo_root, capture_output=True, check=True)
    subprocess.run(
        ["git", "config", "user.email", "test@test.local"],
        cwd=repo_root,
        capture_output=True,
        check=True,
    )
    subprocess.run(
        ["git", "config", "user.name", "Test"], cwd=repo_root, capture_output=True, check=True
    )
    subprocess.run(["git", "add", "-A"], cwd=repo_root, capture_output=True, check=True)
    subprocess.run(
        ["git", "commit", "-m", "init"], cwd=repo_root, capture_output=True, check=True
    )
    # No remote configured at all -> push must fail

    monkeypatch.setattr(fragen_generator, "REPO_ROOT", str(repo_root))
    monkeypatch.setattr(fragen_generator, "QUIZ_DATA_PATH", str(quiz_data_path))

    akzeptierte = [
        {"question": "?", "options": ["a", "b", "c", "d"], "correct": 0, "explanation": "..."}
    ]

    with pytest.raises(fragen_generator.FragenGeneratorError):
        fragen_generator.uebernehme_fragen(1, akzeptierte)

    # The commit must still exist locally even though the push failed
    log = subprocess.run(
        ["git", "log", "--oneline"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    assert "chapter 1" in log.stdout
```

- [ ] **Step 2: Run tests, confirm the new tests fail**

Run: `cd "/Users/jelenaivanova/Downloads/istqb/istqb-quiz/question-generator" && python3 -m pytest tests/ -v`
Expected: FAIL — `AttributeError: module 'fragen_generator' has no attribute 'naechste_frage_id'`

- [ ] **Step 3: Append to `question-generator/fragen_generator.py`**

```python
def naechste_frage_id(quiz_data: dict) -> int:
    if not quiz_data["questions"]:
        return 1
    return max(f["id"] for f in quiz_data["questions"]) + 1


def _run_git(args: list[str]) -> None:
    result = subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, text=True
    )
    if result.returncode != 0:
        raise FragenGeneratorError(
            f"git {' '.join(args)} fehlgeschlagen: {result.stderr.strip()}"
        )


def uebernehme_fragen(kapitel: int, akzeptierte_fragen: list[dict]) -> str:
    with open(QUIZ_DATA_PATH, encoding="utf-8") as f:
        quiz_data = json.load(f)

    naechste_id = naechste_frage_id(quiz_data)
    for i, frage in enumerate(akzeptierte_fragen):
        quiz_data["questions"].append(
            {
                "id": naechste_id + i,
                "chapter": kapitel,
                "points": 1,
                "question": frage["question"],
                "options": frage["options"],
                "correct": frage["correct"],
                "explanation": frage["explanation"],
            }
        )

    with open(QUIZ_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(quiz_data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    anzahl = len(akzeptierte_fragen)
    plural = "n" if anzahl != 1 else ""
    commit_message = f"feat(quiz): add {anzahl} generated question{plural} for chapter {kapitel}"

    _run_git(["add", "src/data/quizData.json"])
    _run_git(["commit", "-m", commit_message])
    _run_git(["push"])

    return commit_message
```

Note: `_run_git` uses the module-level `REPO_ROOT` at call time (not captured as a default argument), so monkeypatching `fragen_generator.REPO_ROOT` in a test affects it correctly.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `cd "/Users/jelenaivanova/Downloads/istqb/istqb-quiz/question-generator" && python3 -m pytest tests/ -v`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add question-generator/fragen_generator.py question-generator/tests/test_fragen_generator.py
git commit -m "feat(question-generator): write, commit, and push accepted questions"
```

---

### Task 3: FastAPI backend (`app.py`)

**Files:**
- Create: `question-generator/app.py`
- Create: `question-generator/tests/test_app.py`

**Interfaces:**
- Consumes: `fragen_generator.{FragenGeneratorError, generiere_fragen, uebernehme_fragen, THEORY_DIR, QUIZ_DATA_PATH}`.
- Produces: FastAPI app `app.py`'s `app`. `POST /api/generate-questions` — `{kapitel: int, anzahl: int}` → `list[dict]` of generated (not-yet-saved) questions, or 404 if no `theory-{kapitel}.md` exists, or 502 on `FragenGeneratorError`. `POST /api/accept-questions` — `{kapitel: int, fragen: list[{question, options, correct, explanation}]}` → `{"status": "ok", "commit_message": str}`, or 502 on `FragenGeneratorError`.

- [ ] **Step 1: Write `question-generator/tests/test_app.py` (will fail — `app.py` doesn't exist yet)**

```python
import json

from fastapi.testclient import TestClient

import fragen_generator as fg
import app as app_module

client = TestClient(app_module.app)


def test_generate_questions_returns_list(tmp_path, monkeypatch):
    theory_dir = tmp_path
    (theory_dir / "theory-2.md").write_text("Syllabus-Text Kapitel 2", encoding="utf-8")
    quiz_data_path = tmp_path / "quizData.json"
    quiz_data_path.write_text(
        json.dumps(
            {
                "chapters": [],
                "questions": [
                    {"id": 1, "chapter": 2, "question": "Alt?", "options": [], "correct": 0, "points": 1, "explanation": ""}
                ],
                "glossary": [],
            }
        ),
        encoding="utf-8",
    )

    monkeypatch.setattr(fg, "THEORY_DIR", str(theory_dir))
    monkeypatch.setattr(fg, "QUIZ_DATA_PATH", str(quiz_data_path))
    monkeypatch.setattr(
        fg,
        "generiere_fragen",
        lambda kapitel, anzahl, syllabus_text, vorhandene_fragen: [
            {"question": "Neu?", "options": ["a", "b", "c", "d"], "correct": 1, "explanation": "..."}
        ],
    )

    response = client.post("/api/generate-questions", json={"kapitel": 2, "anzahl": 1})

    assert response.status_code == 200
    assert response.json() == [
        {"question": "Neu?", "options": ["a", "b", "c", "d"], "correct": 1, "explanation": "..."}
    ]


def test_generate_questions_returns_404_for_missing_chapter(tmp_path, monkeypatch):
    monkeypatch.setattr(fg, "THEORY_DIR", str(tmp_path))

    response = client.post("/api/generate-questions", json={"kapitel": 99, "anzahl": 1})

    assert response.status_code == 404


def test_generate_questions_returns_502_on_generator_error(tmp_path, monkeypatch):
    theory_dir = tmp_path
    (theory_dir / "theory-1.md").write_text("Text", encoding="utf-8")
    quiz_data_path = tmp_path / "quizData.json"
    quiz_data_path.write_text(
        json.dumps({"chapters": [], "questions": [], "glossary": []}), encoding="utf-8"
    )

    monkeypatch.setattr(fg, "THEORY_DIR", str(theory_dir))
    monkeypatch.setattr(fg, "QUIZ_DATA_PATH", str(quiz_data_path))

    def boom(*args, **kwargs):
        raise fg.FragenGeneratorError("Ollama nicht erreichbar")

    monkeypatch.setattr(fg, "generiere_fragen", boom)

    response = client.post("/api/generate-questions", json={"kapitel": 1, "anzahl": 1})

    assert response.status_code == 502
    assert "Ollama nicht erreichbar" in response.json()["error"]


def test_accept_questions_returns_commit_message(monkeypatch):
    monkeypatch.setattr(
        fg, "uebernehme_fragen", lambda kapitel, fragen: f"feat(quiz): add {len(fragen)} for chapter {kapitel}"
    )

    response = client.post(
        "/api/accept-questions",
        json={
            "kapitel": 3,
            "fragen": [
                {"question": "?", "options": ["a", "b", "c", "d"], "correct": 0, "explanation": "..."}
            ],
        },
    )

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "commit_message": "feat(quiz): add 1 for chapter 3"}


def test_accept_questions_returns_502_on_push_failure(monkeypatch):
    def boom(*args, **kwargs):
        raise fg.FragenGeneratorError("git push fehlgeschlagen: ...")

    monkeypatch.setattr(fg, "uebernehme_fragen", boom)

    response = client.post(
        "/api/accept-questions",
        json={
            "kapitel": 1,
            "fragen": [
                {"question": "?", "options": ["a", "b", "c", "d"], "correct": 0, "explanation": "..."}
            ],
        },
    )

    assert response.status_code == 502
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `cd "/Users/jelenaivanova/Downloads/istqb/istqb-quiz/question-generator" && python3 -m pytest tests/ -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app'`

- [ ] **Step 3: Create `question-generator/app.py`**

```python
"""FastAPI backend for the istqb-quiz question generator (admin-only tool)."""

import json
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import fragen_generator as fg

app = FastAPI(title="Fragen-Generator")


class GenerateRequest(BaseModel):
    kapitel: int
    anzahl: int


class Frage(BaseModel):
    question: str
    options: list[str]
    correct: int
    explanation: str


class AcceptRequest(BaseModel):
    kapitel: int
    fragen: list[Frage]


@app.exception_handler(fg.FragenGeneratorError)
def handle_fragen_generator_error(
    request: Request, exc: fg.FragenGeneratorError
) -> JSONResponse:
    return JSONResponse(status_code=502, content={"error": str(exc)})


@app.post("/api/generate-questions")
def generate_questions(body: GenerateRequest) -> list[dict]:
    theory_path = os.path.join(fg.THEORY_DIR, f"theory-{body.kapitel}.md")
    if not os.path.exists(theory_path):
        raise HTTPException(
            status_code=404,
            detail=f"Kein Syllabus-Text für Kapitel {body.kapitel} gefunden.",
        )
    with open(theory_path, encoding="utf-8") as f:
        syllabus_text = f.read()

    with open(fg.QUIZ_DATA_PATH, encoding="utf-8") as f:
        quiz_data = json.load(f)
    vorhandene_fragen = [
        q for q in quiz_data["questions"] if q["chapter"] == body.kapitel
    ]

    return fg.generiere_fragen(body.kapitel, body.anzahl, syllabus_text, vorhandene_fragen)


@app.post("/api/accept-questions")
def accept_questions(body: AcceptRequest) -> dict:
    akzeptierte = [f.model_dump() for f in body.fragen]
    commit_message = fg.uebernehme_fragen(body.kapitel, akzeptierte)
    return {"status": "ok", "commit_message": commit_message}


_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
```

- [ ] **Step 4: Run tests, confirm they pass**

Run: `cd "/Users/jelenaivanova/Downloads/istqb/istqb-quiz/question-generator" && python3 -m pytest tests/ -v`
Expected: PASS (all tests) — note: `app.py`'s static mount requires a `static/` directory to exist relative to the working directory `uvicorn` is run from; Task 4 creates it. `TestClient` instantiation in `test_app.py` will fail at import time if `static/` doesn't exist yet — if Step 4 fails only on the `StaticFiles` mount, create an empty `question-generator/static/` directory now (`mkdir -p question-generator/static`) as part of this step, and note that Task 4 fills it in.

- [ ] **Step 5: Commit**

```bash
git add question-generator/app.py question-generator/tests/test_app.py question-generator/static/.gitkeep
git commit -m "feat(question-generator): add FastAPI backend with generate/accept endpoints"
```

(If `question-generator/static/` is empty at this point, add a placeholder `question-generator/static/.gitkeep` file so the directory is tracked — Task 4 replaces it with real content and can remove the placeholder.)

---

### Task 4: Frontend — single-page vanilla HTML/JS UI

**Files:**
- Create: `question-generator/static/index.html`
- Modify: remove `question-generator/static/.gitkeep` if it was added in Task 3

**Interfaces:**
- Consumes: `POST /api/generate-questions`, `POST /api/accept-questions` (Task 3), served at the same origin (no CORS needed — FastAPI's `StaticFiles` mount serves this file at `/`).

- [ ] **Step 1: Create `question-generator/static/index.html`**

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fragen-Generator</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; background: #0f172a; color: #e2e8f0; }
      h1 { font-size: 1.5rem; }
      label { display: block; margin: 1rem 0 0.25rem; }
      input, select, button { font-size: 1rem; padding: 0.4rem; }
      button { cursor: pointer; margin-top: 1rem; background: #4f46e5; color: white; border: none; border-radius: 4px; padding: 0.5rem 1rem; }
      button:disabled { opacity: 0.5; cursor: not-allowed; }
      .frage { border: 1px solid #334155; border-radius: 6px; padding: 1rem; margin: 1rem 0; }
      .frage.verworfen { opacity: 0.4; }
      .optionen { margin: 0.5rem 0; }
      .optionen div.richtig { color: #4ade80; font-weight: bold; }
      .erklaerung { color: #94a3b8; font-size: 0.9rem; margin-top: 0.5rem; }
      .fehler { color: #f87171; }
      .erfolg { color: #4ade80; }
    </style>
  </head>
  <body>
    <h1>Fragen-Generator</h1>

    <label for="kapitel">Kapitel</label>
    <select id="kapitel">
      <option value="1">1 – Generative KI Grundlagen</option>
      <option value="2">2 – Prompt Engineering</option>
      <option value="3">3 – Risikomanagement</option>
      <option value="4">4 – LLM-Infrastruktur</option>
      <option value="5">5 – Organisatorische Integration</option>
    </select>

    <label for="anzahl">Anzahl neuer Fragen</label>
    <input type="number" id="anzahl" min="1" max="10" value="3" />

    <button id="generieren-btn">Fragen generieren</button>

    <div id="status"></div>
    <div id="fragen-liste"></div>

    <button id="uebernehmen-btn" style="display: none">Ausgewählte übernehmen</button>

    <script>
      let generierteFragen = []
      const akzeptiert = new Set()

      const statusEl = document.getElementById('status')
      const listeEl = document.getElementById('fragen-liste')
      const generierenBtn = document.getElementById('generieren-btn')
      const uebernehmenBtn = document.getElementById('uebernehmen-btn')

      function renderFragen() {
        listeEl.innerHTML = ''
        generierteFragen.forEach((frage, i) => {
          const div = document.createElement('div')
          div.className = 'frage' + (akzeptiert.has(i) ? '' : ' verworfen')

          const optionenHtml = frage.options
            .map((opt, j) => `<div class="${j === frage.correct ? 'richtig' : ''}">${j === frage.correct ? '✓ ' : ''}${opt}</div>`)
            .join('')

          div.innerHTML = `
            <label>
              <input type="checkbox" ${akzeptiert.has(i) ? 'checked' : ''} data-index="${i}" />
              <strong>${frage.question}</strong>
            </label>
            <div class="optionen">${optionenHtml}</div>
            <div class="erklaerung">${frage.explanation}</div>
          `

          div.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            if (e.target.checked) akzeptiert.add(i)
            else akzeptiert.delete(i)
            renderFragen()
          })

          listeEl.appendChild(div)
        })
        uebernehmenBtn.style.display = generierteFragen.length > 0 ? 'block' : 'none'
      }

      generierenBtn.addEventListener('click', async () => {
        const kapitel = Number(document.getElementById('kapitel').value)
        const anzahl = Number(document.getElementById('anzahl').value)

        generierenBtn.disabled = true
        statusEl.innerHTML = 'Generiere Fragen ...'

        try {
          const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kapitel, anzahl }),
          })
          if (!response.ok) {
            const body = await response.json().catch(() => ({}))
            throw new Error(body.error ?? body.detail ?? `HTTP ${response.status}`)
          }
          generierteFragen = await response.json()
          akzeptiert.clear()
          generierteFragen.forEach((_, i) => akzeptiert.add(i))
          statusEl.innerHTML = ''
          renderFragen()
        } catch (err) {
          statusEl.innerHTML = `<p class="fehler">${err.message}</p>`
        } finally {
          generierenBtn.disabled = false
        }
      })

      uebernehmenBtn.addEventListener('click', async () => {
        const kapitel = Number(document.getElementById('kapitel').value)
        const ausgewaehlt = generierteFragen.filter((_, i) => akzeptiert.has(i))

        if (ausgewaehlt.length === 0) {
          statusEl.innerHTML = '<p class="fehler">Keine Fragen ausgewählt.</p>'
          return
        }

        uebernehmenBtn.disabled = true
        statusEl.innerHTML = 'Übernehme Fragen ...'

        try {
          const response = await fetch('/api/accept-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kapitel, fragen: ausgewaehlt }),
          })
          if (!response.ok) {
            const body = await response.json().catch(() => ({}))
            throw new Error(body.error ?? body.detail ?? `HTTP ${response.status}`)
          }
          const result = await response.json()
          statusEl.innerHTML = `<p class="erfolg">Übernommen und gepusht: ${result.commit_message}</p>`
          generierteFragen = []
          akzeptiert.clear()
          renderFragen()
        } catch (err) {
          statusEl.innerHTML = `<p class="fehler">${err.message}</p>`
        } finally {
          uebernehmenBtn.disabled = false
        }
      })
    </script>
  </body>
</html>
```

- [ ] **Step 2: Remove the placeholder if present**

Run: `rm -f "/Users/jelenaivanova/Downloads/istqb/istqb-quiz/question-generator/static/.gitkeep"` (only if it exists from Task 3's Step 5 note).

- [ ] **Step 3: Verify manually**

Run: `cd "/Users/jelenaivanova/Downloads/istqb/istqb-quiz/question-generator" && pip install -r requirements.txt && python3 -m uvicorn app:app --port 8010 &` (background it, note the PID to kill later).

`curl -s http://localhost:8010/` — confirm the HTML page loads (contains `<title>Fragen-Generator</title>`).

`curl -s -X POST http://localhost:8010/api/generate-questions -H 'Content-Type: application/json' -d '{"kapitel": 99, "anzahl": 1}'` — confirm a 404 (chapter 99 has no `theory-99.md`), proving the endpoint is wired to the real `THEORY_DIR` (the actual repo's `src/data/`) without needing a real Ollama call to verify routing.

Kill the background `uvicorn` process when done.

You cannot click through the checkbox UI in a real browser — note this honestly as an expected, acceptable gap (no browser available), not a defect. The curl checks above verify the backend wiring the frontend depends on.

- [ ] **Step 4: Commit**

```bash
cd "/Users/jelenaivanova/Downloads/istqb/istqb-quiz"
git add question-generator/static/index.html
git rm --cached question-generator/static/.gitkeep 2>/dev/null || true
rm -f question-generator/static/.gitkeep
git commit -m "feat(question-generator): add review/accept web UI"
```

---

### Task 5: Docker deployment for the Mac Mini

**Files:**
- Create: `question-generator/Dockerfile`
- Create: `question-generator/README.md`

**Interfaces:**
- Produces: a container that serves the tool on port 8010 (arbitrary, non-conflicting with `vokabel-song`'s 8000/8090), reachable only via the Mac Mini's Tailscale IP, operating on a git checkout of `istqb-quiz` mounted/cloned on the host.

- [ ] **Step 1: Create `question-generator/Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY fragen_generator.py app.py ./
COPY static/ static/

EXPOSE 8010

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8010"]
```

- [ ] **Step 2: Create `question-generator/README.md`**

```markdown
# Fragen-Generator (Ollama)

Admin-only tool — not part of the public istqb-quiz app. Generates new
ISTQB-style multiple-choice questions from the syllabus text
(`src/data/theory-N.md`) via Ollama, lets you review/accept them, then
writes, commits, and pushes accepted questions into `src/data/quizData.json`.

## Running on the Mac Mini (Docker)

The container needs `git` push access to this repo, so the SAME checkout
that already has `gh auth setup-git` configured (see the main repo's
homeserver notes — this is the same setup used for `vokabel-song`) is
bind-mounted into the container. `REPO_ROOT` is overridden via an
environment variable to point at that mounted path, since inside the
container `fragen_generator.py`'s own directory is not the repo checkout.

```bash
cd question-generator
docker build -t istqb-question-generator .
docker run -d \
  --name istqb-question-generator \
  -p 8010:8010 \
  -v /absolute/path/to/istqb-quiz:/repo-checkout \
  -e REPO_ROOT=/repo-checkout \
  -e OLLAMA_URL=http://host.docker.internal:11434 \
  -e OLLAMA_MODEL=llama3.1:latest \
  --add-host=host.docker.internal:host-gateway \
  istqb-question-generator
```

Access via Tailscale only: `http://100.73.147.87:8010` — do not publish
this port to the LAN/public internet, since it has unauthenticated git
push access to a public repo.

## Running directly (simpler alternative, no Docker)

Since `REPO_ROOT` defaults to this script's own parent directory, running
it straight from within the real repo checkout needs no environment
variable and no volume mount:

```bash
cd question-generator
pip install -r requirements.txt
python3 -m uvicorn app:app --host 0.0.0.0 --port 8010
```
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/jelenaivanova/Downloads/istqb/istqb-quiz"
git add question-generator/Dockerfile question-generator/README.md
git commit -m "docs: add deployment notes for the question generator"
```
