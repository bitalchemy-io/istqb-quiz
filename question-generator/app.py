"""FastAPI backend for the istqb-quiz question generator (admin-only tool)."""

import json
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import fragen_generator as fg

app = FastAPI(title="Fragen-Generator")


class GenerateRequest(BaseModel):
    kapitel: int
    anzahl: int


class Frage(BaseModel):
    question: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct: int = Field(ge=0, le=3)
    explanation: str


class AcceptRequest(BaseModel):
    kapitel: int
    fragen: list[Frage] = Field(min_length=1)


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

    return fg.generiere_fragen(
        body.kapitel, body.anzahl, syllabus_text, vorhandene_fragen
    )


@app.post("/api/accept-questions")
def accept_questions(body: AcceptRequest) -> dict:
    akzeptierte = [f.model_dump() for f in body.fragen]
    commit_message = fg.uebernehme_fragen(body.kapitel, akzeptierte)
    return {"status": "ok", "commit_message": commit_message}


_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
