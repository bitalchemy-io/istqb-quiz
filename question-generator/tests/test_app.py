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
                    {
                        "id": 1,
                        "chapter": 2,
                        "question": "Alt?",
                        "options": [],
                        "correct": 0,
                        "points": 1,
                        "explanation": "",
                    }
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
            {
                "question": "Neu?",
                "options": ["a", "b", "c", "d"],
                "correct": 1,
                "explanation": "...",
            }
        ],
    )

    response = client.post("/api/generate-questions", json={"kapitel": 2, "anzahl": 1})

    assert response.status_code == 200
    assert response.json() == [
        {
            "question": "Neu?",
            "options": ["a", "b", "c", "d"],
            "correct": 1,
            "explanation": "...",
        }
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
        fg,
        "uebernehme_fragen",
        lambda kapitel, fragen: f"feat(quiz): add {len(fragen)} for chapter {kapitel}",
    )

    response = client.post(
        "/api/accept-questions",
        json={
            "kapitel": 3,
            "fragen": [
                {
                    "question": "?",
                    "options": ["a", "b", "c", "d"],
                    "correct": 0,
                    "explanation": "...",
                }
            ],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "commit_message": "feat(quiz): add 1 for chapter 3",
    }


def test_accept_questions_returns_502_on_push_failure(monkeypatch):
    def boom(*args, **kwargs):
        raise fg.FragenGeneratorError("git push fehlgeschlagen: ...")

    monkeypatch.setattr(fg, "uebernehme_fragen", boom)

    response = client.post(
        "/api/accept-questions",
        json={
            "kapitel": 1,
            "fragen": [
                {
                    "question": "?",
                    "options": ["a", "b", "c", "d"],
                    "correct": 0,
                    "explanation": "...",
                }
            ],
        },
    )

    assert response.status_code == 502
