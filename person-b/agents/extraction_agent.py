import json
import os
import re
from typing import List, Dict

from pydantic import BaseModel, Field

from utils.logging_utils import get_logger

logger = get_logger(__name__)


class ReferenceLine(BaseModel):
    scene_id: str
    character: str
    reference_line: str


EXTRACTION_PROMPT = """You are extracting reference dialogue lines from a film script for a continuity-tracking system.
Input: raw script text for one or more scenes.
For each line of spoken dialogue, output a JSON object:
{ "scene_id": <string>, "character": <string>, "reference_line": <string> }
Return ONLY a JSON array. No other text, no markdown fences."""


class ExtractionAgent:
    """Gemini-backed extractor with a deterministic local parser for demo mode."""

    def __init__(self):
        self.demo_mode = os.getenv("ECHO_DEMO_MODE", "true").lower() == "true"
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    def extract(self, script_text: str) -> List[Dict]:
        if self.demo_mode:
            return [x.model_dump() for x in self._local_extract(script_text)]

        try:
            from google import genai
            from google.genai import types

            client = genai.Client()

            response = client.models.generate_content(
                model=self.model,
                contents=f"{EXTRACTION_PROMPT}\n\nRAW SCRIPT:\n{script_text}",
                config=types.GenerateContentConfig(
                    temperature=0,
                    response_mime_type="application/json",
                ),
            )

            data = json.loads(response.text)
            validated = [
                ReferenceLine.model_validate(item)
                for item in data
            ]

            logger.info(
                "extraction_success count=%s",
                len(validated)
            )

            return [x.model_dump() for x in validated]

        except Exception as exc:
            logger.exception("extraction_failed")
            raise RuntimeError(
                f"Extraction failed: {exc}"
            ) from exc

    def _local_extract(
        self,
        script_text: str
    ) -> List[ReferenceLine]:

        current_scene = "UNKNOWN"
        results = []

        for raw in script_text.splitlines():
            line = raw.strip()

            if not line:
                continue

            # Supports:
            # SC14
            # SCENE SC14
            # SCENE_ID: SC14
            scene_match = re.match(
                r"^(?:SCENE\s+|SCENE_ID\s*[:=-]?\s*|)(SC\d+)\s*$",
                line,
                re.I
            )

            if scene_match:
                current_scene = scene_match.group(1).upper()
                continue

            # Supports:
            # MARCUS: dialogue
            # MARCUS - dialogue
            dialogue = re.match(
                r"^([A-Z][A-Z0-9_ ]{1,30})\s*[:\-]\s*(.+)$",
                line
            )

            if dialogue:
                character = dialogue.group(1).strip().upper()
                spoken = dialogue.group(2).strip()

                results.append(
                    ReferenceLine(
                        scene_id=current_scene,
                        character=character,
                        reference_line=spoken,
                    )
                )

        return results