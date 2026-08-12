"""Ollama question generation and quizData.json integration for istqb-quiz."""

import json
import os
import subprocess
import urllib.request

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
    except OSError as e:
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
    commit_message = (
        f"feat(quiz): add {anzahl} generated question{plural} for chapter {kapitel}"
    )

    _run_git(["add", "src/data/quizData.json"])
    _run_git(["commit", "-m", commit_message, "--", "src/data/quizData.json"])

    try:
        _run_git(["push"])
    except FragenGeneratorError as e:
        stderr = str(e).replace("git push fehlgeschlagen: ", "")
        raise FragenGeneratorError(
            f"Commit erfolgreich lokal (chapter {kapitel}), aber push fehlgeschlagen — bitte manuell erneut versuchen: {stderr}"
        )

    return commit_message
