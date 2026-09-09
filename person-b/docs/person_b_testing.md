# Person B testing checklist

## 1. Start server
`uvicorn backend.api.main:app --reload --port 8080`

## 2. Health
GET `/health`

Expected:
`{"status":"ok","service":"echo-person-b"}`

## 3. Extraction
POST `/api/scripts/extract` with sample script.

Expected one object per spoken line:
`scene_id`, `character`, `reference_line`.

## 4. Persistence
GET `/api/scenes/SC14`

Expected `reference_lines` contains MARCUS and the reference dialogue.

## 5. PDF
POST `/api/reports/generate` with `{"scene_id":"SC14"}`.

Expected PDF:
`reports/SC14_continuity_report.pdf`

## 6. Automated tests
`pytest -q`

## 7. Frontend sync later
Person C can use:
- POST `/api/scripts/extract`
- GET `/api/scenes`
- GET `/api/scenes/{scene_id}`
- POST `/api/reports/generate`

No frontend implementation is included here.
