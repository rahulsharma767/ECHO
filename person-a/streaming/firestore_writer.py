"""Firestore persistence layer -- the backend contract Person C's dashboard reads.

Writes to ``scenes/{scene_id}`` with a ``takes`` array, plus a lightweight
``processing_state`` field per take so the frontend can show live progress
(NEW_TAKE -> INVESTIGATING -> ... -> MATCH/ACCEPTABLE_ADLIB/DRIFT).

``FirestoreResultStore`` is the production implementation (talks to real
Firestore). ``FakeResultStore`` is an in-memory double with the identical
interface, used by tests and local dev without cloud credentials.
"""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("echo.firestore")

PROCESSING_STATES = (
    "NEW_TAKE",
    "INVESTIGATING",
    "COMPARING_SCRIPT",
    "COMPARING_PRIOR_TAKES",
    "CLASSIFYING",
    "MATCH",
    "ACCEPTABLE_ADLIB",
    "DRIFT",
    "AWAITING_AD",
    "LOW_CONFIDENCE",
    "NEEDS_REVIEW",
    "ERROR",
)


class FirestoreWriteError(Exception):
    """Raised when a Firestore write fails. Never swallowed silently."""

    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(f"FIRESTORE_ERROR: {detail}")


class ResultStore(ABC):
    """Interface for persisting take classification state."""

    @abstractmethod
    def upsert_take(self, scene_id: str, take_record: dict) -> None: ...

    @abstractmethod
    def set_processing_state(self, scene_id: str, take_number: int, character: str, state: str) -> None: ...

    @abstractmethod
    def get_scene(self, scene_id: str) -> Optional[dict]: ...


class FirestoreResultStore(ResultStore):
    """Production Firestore-backed store.

    Document shape: ``scenes/{scene_id}`` = {scene_id, reference_lines: [...],
    takes: [...]}. Each entry in ``takes`` matches the contract in section 21
    of the project spec (take_number, character, line, status, confidence,
    diverging_phrase, conflicts_with_take, reason, human_decision,
    review_required, processing_state, timestamp).
    """

    def __init__(self, client=None):
        self._client = client  # lazy: only required when actually writing

    def _get_client(self):
        if self._client is None:
            from google.cloud import firestore  # imported lazily

            self._client = firestore.Client()
        return self._client

    def upsert_take(self, scene_id: str, take_record: dict) -> None:
        try:
            client = self._get_client()
            doc_ref = client.collection("scenes").document(scene_id)
            snapshot = doc_ref.get()
            data: dict = snapshot.to_dict() if snapshot.exists else {"scene_id": scene_id, "takes": []}
            takes = data.get("takes", [])

            takes = [
                t
                for t in takes
                if not (
                    t.get("take_number") == take_record["take_number"]
                    and t.get("character") == take_record["character"]
                )
            ]
            takes.append(take_record)
            data["takes"] = takes
            doc_ref.set(data, merge=True)
        except Exception as exc:  # pragma: no cover - network/SDK failures
            raise FirestoreWriteError(str(exc)) from exc

    def set_processing_state(self, scene_id: str, take_number: int, character: str, state: str) -> None:
        if state not in PROCESSING_STATES:
            raise ValueError(f"unknown processing state: {state}")
        try:
            client = self._get_client()
            doc_ref = client.collection("scenes").document(scene_id)
            snapshot = doc_ref.get()
            data: dict = snapshot.to_dict() if snapshot.exists else {"scene_id": scene_id, "takes": []}
            takes = data.get("takes", [])
            found = False
            for t in takes:
                if t.get("take_number") == take_number and t.get("character") == character:
                    t["processing_state"] = state
                    found = True
            if not found:
                takes.append(
                    {
                        "take_number": take_number,
                        "character": character,
                        "processing_state": state,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )
            data["takes"] = takes
            doc_ref.set(data, merge=True)
        except Exception as exc:  # pragma: no cover - network/SDK failures
            raise FirestoreWriteError(str(exc)) from exc

    def get_scene(self, scene_id: str) -> Optional[dict]:
        try:
            client = self._get_client()
            snapshot = client.collection("scenes").document(scene_id).get()
            return snapshot.to_dict() if snapshot.exists else None
        except Exception as exc:  # pragma: no cover - network/SDK failures
            raise FirestoreWriteError(str(exc)) from exc


class FakeResultStore(ResultStore):
    """In-memory ``ResultStore`` double for tests and local dev.

    Supports ``fail_next_write`` to deterministically exercise the
    ``FIRESTORE_ERROR`` handling path.
    """

    def __init__(self):
        self._scenes: dict[str, dict] = {}
        self.fail_next_write = False

    def _maybe_fail(self):
        if self.fail_next_write:
            self.fail_next_write = False
            raise FirestoreWriteError("simulated Firestore outage")

    def upsert_take(self, scene_id: str, take_record: dict) -> None:
        self._maybe_fail()
        scene = self._scenes.setdefault(scene_id, {"scene_id": scene_id, "takes": []})
        scene["takes"] = [
            t
            for t in scene["takes"]
            if not (
                t.get("take_number") == take_record["take_number"]
                and t.get("character") == take_record["character"]
            )
        ]
        scene["takes"].append(take_record)

    def set_processing_state(self, scene_id: str, take_number: int, character: str, state: str) -> None:
        self._maybe_fail()
        if state not in PROCESSING_STATES:
            raise ValueError(f"unknown processing state: {state}")
        scene = self._scenes.setdefault(scene_id, {"scene_id": scene_id, "takes": []})
        for t in scene["takes"]:
            if t.get("take_number") == take_number and t.get("character") == character:
                t["processing_state"] = state
                return
        scene["takes"].append(
            {
                "take_number": take_number,
                "character": character,
                "processing_state": state,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    def get_scene(self, scene_id: str) -> Optional[dict]:
        return self._scenes.get(scene_id)
