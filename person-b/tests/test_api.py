from fastapi.testclient import TestClient
from backend.api.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_extract():
    response = client.post(
        "/api/scripts/extract",
        json={"script_text": "SC14\nMARCUS: I never trusted him."},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["reference_lines"][0]["scene_id"] == "SC14"
    assert body["reference_lines"][0]["character"] == "MARCUS"
