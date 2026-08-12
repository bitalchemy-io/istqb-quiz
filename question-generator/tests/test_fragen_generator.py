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


def test_generiere_fragen_raises_on_invalid_correct_index(
    fragen_generator, monkeypatch
):
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
        [
            {
                "id": 1,
                "chapter": 1,
                "question": "Alte Frage?",
                "options": [],
                "correct": 0,
                "points": 1,
                "explanation": "",
            }
        ],
    )

    assert "Alte Frage?" in captured["prompt"]


import subprocess


def _init_git_repo_with_remote(repo_root, remote_root):
    subprocess.run(
        ["git", "init", "--bare"], cwd=remote_root, capture_output=True, check=True
    )
    subprocess.run(["git", "init"], cwd=repo_root, capture_output=True, check=True)
    subprocess.run(
        ["git", "branch", "-M", "main"], cwd=repo_root, capture_output=True, check=True
    )
    subprocess.run(
        ["git", "config", "user.email", "test@test.local"],
        cwd=repo_root,
        capture_output=True,
        check=True,
    )
    subprocess.run(
        ["git", "config", "user.name", "Test"],
        cwd=repo_root,
        capture_output=True,
        check=True,
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


def test_uebernehme_fragen_writes_commits_and_pushes(
    fragen_generator, tmp_path, monkeypatch
):
    repo_root = tmp_path / "work"
    remote_root = tmp_path / "remote.git"
    repo_root.mkdir()
    remote_root.mkdir()
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
    subprocess.run(
        ["git", "branch", "-M", "main"], cwd=repo_root, capture_output=True, check=True
    )
    subprocess.run(
        ["git", "config", "user.email", "test@test.local"],
        cwd=repo_root,
        capture_output=True,
        check=True,
    )
    subprocess.run(
        ["git", "config", "user.name", "Test"],
        cwd=repo_root,
        capture_output=True,
        check=True,
    )
    subprocess.run(["git", "add", "-A"], cwd=repo_root, capture_output=True, check=True)
    subprocess.run(
        ["git", "commit", "-m", "init"], cwd=repo_root, capture_output=True, check=True
    )
    # No remote configured at all -> push must fail

    monkeypatch.setattr(fragen_generator, "REPO_ROOT", str(repo_root))
    monkeypatch.setattr(fragen_generator, "QUIZ_DATA_PATH", str(quiz_data_path))

    akzeptierte = [
        {
            "question": "?",
            "options": ["a", "b", "c", "d"],
            "correct": 0,
            "explanation": "...",
        }
    ]

    with pytest.raises(fragen_generator.FragenGeneratorError) as exc_info:
        fragen_generator.uebernehme_fragen(1, akzeptierte)

    # Error message must indicate commit succeeded locally
    error_message = str(exc_info.value)
    assert "Commit erfolgreich lokal" in error_message
    assert "chapter 1" in error_message
    assert "push fehlgeschlagen" in error_message
    assert "manuell erneut versuchen" in error_message

    # The commit must still exist locally even though the push failed
    log = subprocess.run(
        ["git", "log", "--oneline"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    assert "chapter 1" in log.stdout
