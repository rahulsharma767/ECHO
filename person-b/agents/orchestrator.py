from typing import List, Dict

from agents.extraction_agent import ExtractionAgent
from data.repository import SceneRepository
from utils.logging_utils import get_logger

logger = get_logger(__name__)


class Orchestrator:
    """Small deterministic root workflow for Person B.

    The ADK integration can be swapped in here without changing API contracts.
    """

    def __init__(self, extractor: ExtractionAgent, repository: SceneRepository):
        self.extractor = extractor
        self.repository = repository

    def extract_script(self, script_text: str) -> List[Dict]:
        logger.info("orchestrator_start action=extract_script")
        lines = self.extractor.extract(script_text)

        grouped = {}
        for item in lines:
            grouped.setdefault(item["scene_id"], []).append(item)

        for scene_id, scene_lines in grouped.items():
            self.repository.upsert_reference_lines(scene_id, scene_lines)

        logger.info(
            "orchestrator_complete action=extract_script scenes=%s lines=%s",
            len(grouped),
            len(lines),
        )
        return lines
