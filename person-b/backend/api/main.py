import os
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List

from agents.extraction_agent import ExtractionAgent
from agents.orchestrator import Orchestrator
from agents.report_agent import ReportAgent
from data.repository import SceneRepository

app = FastAPI(title="ECHO Person B Backend", version="0.1.0")
_cors_origins = [x.strip() for x in os.getenv("ECHO_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001").split(",") if x.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
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


class DecisionRequest(BaseModel):
    decision: str
    decided_by: str = "AD (on-set)"


class DemoTakeRequest(BaseModel):
    take_number: int = Field(ge=1, le=4)
    character: str = "MARCUS"
    line: str = Field(min_length=1)
    file_name: Optional[str] = None


def _classify_demo_take(line: str, take_number: int) -> dict:
    normalized = " ".join(line.lower().strip().rstrip(".").split())
    reference = "i never trusted him"
    if normalized == reference:
        return {"status": "MATCH", "confidence": 0.98, "diverging_phrase": None, "conflicts_with_take": None, "reason": None}
    if normalized == "i didn't trust him" or normalized == "i did not trust him":
        return {"status": "ACCEPTABLE_ADLIB", "confidence": 0.86, "diverging_phrase": None, "conflicts_with_take": 1, "reason": "Wording changed but meaning and rhythm remain close enough to intercut."}
    if "really" in normalized:
        return {"status": "DRIFT", "confidence": 0.91 if take_number == 3 else 0.82, "diverging_phrase": "really", "conflicts_with_take": 1, "reason": "Adds emphasis that may prevent clean intercutting with the reference take."}
    extra = next((w for w in normalized.split() if w not in reference.split()), None)
    return {"status": "DRIFT", "confidence": 0.79, "diverging_phrase": extra, "conflicts_with_take": 1, "reason": "Wording differs from the reference line — review before intercutting."}


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


@app.post("/api/scenes/{scene_id}/takes/{take_number}/decision")
def decide_take(scene_id: str, take_number: int, request: DecisionRequest):
    if request.decision not in {"ACCEPT", "FLAG_FOR_RESHOOT"}:
        raise HTTPException(status_code=400, detail="Invalid decision")
    scene = repo.get_scene(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    takes = scene.get("takes", [])
    target = next((t for t in takes if int(t.get("take_number", -1)) == take_number), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Take not found")
    target["human_decision"] = request.decision
    target["decided_by"] = request.decided_by
    target["decided_at"] = datetime.now(timezone.utc).isoformat()
    repo.upsert_take(scene_id, target)
    return {"status": "ok", "scene_id": scene_id, "take_number": take_number, "decision": request.decision}


@app.post("/api/scenes/{scene_id}/demo-takes")
def add_demo_take(scene_id: str, request: DemoTakeRequest):
    scene = repo.get_scene(scene_id)
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    classification = _classify_demo_take(request.line, request.take_number)
    take = {
        "take_number": request.take_number,
        "character": request.character,
        "line": request.line.strip(),
        **classification,
        "human_decision": None,
        "review_required": classification["confidence"] < 0.75,
        "processing_state": "NEEDS_REVIEW" if classification["confidence"] < 0.75 else classification["status"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "audio_ref": f"local-video://{request.file_name}" if request.file_name else None,
    }
    repo.upsert_take(scene_id, take)
    return {"status": "ok", "scene_id": scene_id, "take": take}


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
