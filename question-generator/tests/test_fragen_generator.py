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
