"""Local HTTP result store for the ECHO Person A -> Person B integration.

Uses only Python's standard library so the local demo needs no extra package.
Person B remains the persistence/API owner; Person A only sends final
classification records to its HTTP endpoint.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from streaming.firestore_writer import ResultStore


class HttpResultStore(ResultStore):
    def __init__(self, base_url: str | None = None, timeout: float = 5.0):
        self.base_url = (base_url or os.getenv("ECHO_PERSON_B_URL", "http://127.0.0.1:8080")).rstrip("/")
        self.timeout = timeout

    def _post_take(self, scene_id: str, take_record: dict) -> None:
        payload = json.dumps(take_record).encode("utf-8")
        request = Request(
            f"{self.base_url}/api/scenes/{scene_id}/takes",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                if response.status < 200 or response.status >= 300:
                    raise RuntimeError(f"Person B returned HTTP {response.status}")
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Person B HTTP {exc.code}: {body}") from exc
        except URLError as exc:
            raise RuntimeError(
                f"Cannot reach Person B at {self.base_url}: {exc.reason}"
            ) from exc

    def upsert_take(self, scene_id: str, take_record: dict) -> None:
        self._post_take(scene_id, take_record)

    def set_processing_state(
        self, scene_id: str, take_number: int, character: str, state: str
    ) -> None:
        # Person B stores the final classification record. Intermediate states
        # stay inside Person A for this local demo.
        return None

    def get_scene(self, scene_id: str):
        return None


if __name__ == "__main__":
    print("HttpResultStore ready:", os.getenv("ECHO_PERSON_B_URL", "http://127.0.0.1:8080"))
