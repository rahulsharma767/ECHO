# ECHO deployment — free public demo

This repository is configured for a two-service Render deployment:

- `echo-backend`: FastAPI / Python
- `echo-frontend`: Next.js / Node

The hosted demo runs Person B in `ECHO_DEMO_MODE=true`, so it does **not** require Google Cloud credentials or a Gemini API key. The public demo-take endpoint uses the deterministic SC14 classifier already used by the local demo.

## Deploy

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and connect the GitHub repository.
3. Render detects `render.yaml` and creates both services.
4. During the backend service setup, set `ECHO_ALLOWED_ORIGINS` to the final frontend URL, for example `https://echo-frontend.onrender.com`.
5. Deploy/redeploy the backend after saving that variable.
6. Open the frontend URL.
7. Open **Scenes → SC14** and verify:
   - the scene loads from the backend;
   - Take 1/2/3 demo buttons create persistent backend records;
   - uploaded transcript takes call the backend;
   - Human Approval decisions persist through the backend.

## Important free-tier limitation

Render Free web services spin down after 15 minutes without traffic and have an ephemeral filesystem. Therefore the demo JSON database can reset after a restart/spin-down. This is acceptable for a hackathon/demo deployment, but not for production persistence.

## Full Kafka + Gemini production mode

Person A is intentionally not a free public web service: it is a Kafka consumer/background worker and needs a reachable Kafka broker plus Gemini credentials for live semantic classification. The repository still contains the full Person A pipeline. The free public deployment uses the backend's deterministic demo mode so the complete dashboard can be demonstrated without paid infrastructure.
