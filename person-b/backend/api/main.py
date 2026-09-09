from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List

from agents.extraction_agent import ExtractionAgent
from agents.orchestrator import Orchestrator
from agents.report_agent import ReportAgent
from data.repository import SceneRepository

app = FastAPI(title="ECHO Person B Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

repo = SceneRepository()
extractor = ExtractionAgent()
orchestrator = Orchestrator(extractor=extractor, repository=repo)
reporter = ReportAgent(repository=repo)


class ExtractRequest(BaseModel):
    script_text: str = Field(min_length=1)


class ExtractResponse(BaseModel):
    count: int
    reference_lines: List[dict]


class ReportRequest(BaseModel):
    scene_id: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "echo-person-b"}


@app.post("/api/scripts/extract", response_model=ExtractResponse)
def extract_script(request: ExtractRequest):
    try:
        result = orchestrator.extract_script(request.script_text)
        return {"count": len(result), "reference_lines": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/scenes/{scene_id}")
def get_scene(scene_id: str):
    scene = repo.get_scene(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene


@app.post("/api/scenes/{scene_id}/takes")
def add_take(scene_id: str, take: dict):
    """Receive a classified take from Person A and persist it in the scene."""
    try:
        repo.upsert_take(scene_id, take)
        return {"status": "ok", "scene_id": scene_id, "take": take}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/reports/generate")
def generate_report(request: ReportRequest):
    try:
        path = reporter.generate(request.scene_id)
        return {"status": "ok", "scene_id": request.scene_id, "file": path}
    except KeyError:
        raise HTTPException(status_code=404, detail="Scene not found")


@app.get("/api/scenes")
def list_scenes():
    return {"scenes": repo.list_scenes()}
