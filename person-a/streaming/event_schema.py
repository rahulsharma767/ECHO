"""Schema, validation, and (de)serialization for the ``takes.transcripts`` topic.

One Kafka message on ``takes.transcripts`` represents exactly one film take.
This module defines the wire format and turns raw/untrusted JSON payloads
into a validated ``TranscriptEvent`` -- or raises ``EventValidationError`` so
the consumer can route the message to review instead of crashing.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional


class EventValidationError(Exception):
    """Raised when a raw Kafka message cannot be parsed into a valid event.

    Carries a stable ``reason`` code so callers can log/route without
    string-matching the message text.
    """

    def __init__(self, reason: str, detail: str):
        self.reason = reason
        self.detail = detail
        super().__init__(f"{reason}: {detail}")


REQUIRED_FIELDS = ("event_id", "scene_id", "take_number", "character", "transcribed_line")


@dataclass(frozen=True)
class TranscriptEvent:
    """A single validated film take, as received from ``takes.transcripts``."""

    event_id: str
    scene_id: str
    take_number: int
    character: str
    transcribed_line: str
    timestamp: str
    audio_ref: Optional[str] = field(default=None)

    @staticmethod
    def from_json(raw: str | bytes) -> "TranscriptEvent":
        """Parse and validate a raw Kafka message payload.

        Raises:
            EventValidationError: with reason ``INVALID_JSON`` or
                ``INVALID_EVENT`` if the payload is malformed.
        """
        try:
            payload = json.loads(raw)
        except (json.JSONDecodeError, TypeError, UnicodeDecodeError) as exc:
            raise EventValidationError("INVALID_JSON", str(exc)) from exc

        if not isinstance(payload, dict):
            raise EventValidationError("INVALID_EVENT", "payload is not a JSON object")

        return TranscriptEvent.from_dict(payload)

    @staticmethod
    def from_dict(payload: dict[str, Any]) -> "TranscriptEvent":
        missing = [f for f in REQUIRED_FIELDS if not payload.get(f) and payload.get(f) != 0]
        if missing:
            raise EventValidationError(
                "INVALID_EVENT", f"missing required field(s): {', '.join(missing)}"
            )

        event_id = str(payload["event_id"]).strip()
        scene_id = str(payload["scene_id"]).strip()
        character = str(payload["character"]).strip()
        transcribed_line = str(payload["transcribed_line"]).strip()

        if not event_id or not scene_id or not character or not transcribed_line:
            raise EventValidationError("INVALID_EVENT", "required field(s) empty after trimming")

        take_number = payload["take_number"]
        if isinstance(take_number, bool) or not isinstance(take_number, int) or take_number < 1:
            raise EventValidationError(
                "INVALID_EVENT", f"take_number must be a positive integer, got {take_number!r}"
            )

        timestamp = payload.get("timestamp")
        if timestamp:
            timestamp = str(timestamp)
            try:
                # Accept trailing 'Z' as UTC, same as the rest of the wire format.
                datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except ValueError as exc:
                raise EventValidationError("INVALID_EVENT", f"invalid timestamp: {exc}") from exc
        else:
            timestamp = datetime.now(timezone.utc).isoformat()

        audio_ref = payload.get("audio_ref")
        audio_ref = str(audio_ref) if audio_ref else None

        return TranscriptEvent(
            event_id=event_id,
            scene_id=scene_id,
            take_number=take_number,
            character=character,
            transcribed_line=transcribed_line,
            timestamp=timestamp,
            audio_ref=audio_ref,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "scene_id": self.scene_id,
            "take_number": self.take_number,
            "character": self.character,
            "transcribed_line": self.transcribed_line,
            "timestamp": self.timestamp,
            "audio_ref": self.audio_ref,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict())

    @property
    def memory_key(self) -> str:
        """Scene/character isolation key used for previous-take memory."""
        return f"{self.scene_id}::{self.character}"
