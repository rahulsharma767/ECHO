# ECHO — Person B Standalone Backend

This package implements the Person B side of ECHO independently from the frontend.

## Implemented
- Script extraction API
- Extraction Agent with Gemini adapter + deterministic demo fallback
- Firestore repository with local JSON fallback
- ADK-ready orchestrator abstraction
- Report Agent generating a PDF ledger
- Cloud Storage upload adapter
- Structured logging
- Sample script and demo takes
- Unit/API smoke tests
- Dockerfile and Cloud Run deployment skeleton

## Quick start (demo mode, no Google Cloud required)

### Windows PowerShell
```powershell
cd echo_person_b
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:ECHO_DEMO_MODE="true"
uvicorn backend.api.main:app --reload --port 8080
```

### macOS/Linux
```bash
cd echo_person_b
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export ECHO_DEMO_MODE=true
uvicorn backend.api.main:app --reload --port 8080
```

Open:
http://127.0.0.1:8080/docs

## Demo extraction

```bash
curl -X POST "http://127.0.0.1:8080/api/scripts/extract" \
  -H "Content-Type: application/json" \
  -d "{\"script_text\":\"SC14\\nMARCUS: I never trusted him.\"}"
```

## Demo report

```bash
curl -X POST "http://127.0.0.1:8080/api/reports/generate" \
  -H "Content-Type: application/json" \
  -d "{\"scene_id\":\"SC14\"}" --output echo_report.pdf
```

## Later Google Cloud mode

Set:
- `ECHO_DEMO_MODE=false`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GEMINI_MODEL`
- `GCS_BUCKET`

For Firestore/Storage, use Application Default Credentials locally or the Cloud Run service account in deployment.

The Kafka/Confluent stream analyst remains a separate integration point for Person A.
