# ADK integration boundary

The current standalone package keeps the root orchestration contract in `agents/orchestrator.py`.
When the Google ADK/Vertex Agent Engine environment is configured, the root agent can call the
same ExtractionAgent and ReportAgent interfaces. This keeps local testing independent from cloud
credentials while preserving the Person B architecture.
