"""Stream Analyst Agent -- the brain of Person A.

For every new take it assembles reference + prior-take context (isolated by
scene_id + character), asks a ``DialogueClassifier`` whether the take can be
cleanly intercut, and applies the confidence policy. It never decides
DRIFT/MATCH itself -- that's the classifier's job -- and it never turns a
failure into a false MATCH.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional, Protocol

from agents.classifier import ClassificationResult, ClassifierError, DialogueClassifier
from streaming.event_schema import TranscriptEvent
from streaming.kafka_config import LOW_CONFIDENCE_THRESHOLD

logger = logging.getLogger("echo.stream_analyst")


class SceneMemory(Protocol):
    """Durable previous-take memory, isolated by scene_id + character."""

    def get_reference_line(self, scene_id: str, character: str) -> Optional[str]: ...

    def set_reference_line(self, scene_id: str, character: str, line: str) -> None: ...

    def get_prior_takes(self, scene_id: str, character: str) -> list[dict]: ...

    def record_take(self, scene_id: str, character: str, take_number: int, line: str) -> None: ...


class InMemorySceneMemory:
    """Simple in-process ``SceneMemory``.

    Suitable for local dev/tests and as a performance cache in front of
    Firestore. Keyed strictly by ``scene_id::character`` so scenes and
    characters never cross-contaminate.
    """

    def __init__(self):
        self._reference_lines: dict[str, str] = {}
        self._takes: dict[str, list[dict]] = {}

    @staticmethod
    def _key(scene_id: str, character: str) -> str:
        return f"{scene_id}::{character}"

    def set_reference_line(self, scene_id: str, character: str, line: str) -> None:
        self._reference_lines[self._key(scene_id, character)] = line

    def get_reference_line(self, scene_id: str, character: str) -> Optional[str]:
        return self._reference_lines.get(self._key(scene_id, character))

    def get_prior_takes(self, scene_id: str, character: str) -> list[dict]:
        return list(self._takes.get(self._key(scene_id, character), []))

    def record_take(self, scene_id: str, character: str, take_number: int, line: str) -> None:
        key = self._key(scene_id, character)
        takes = self._takes.setdefault(key, [])
        takes.append({"take_number": take_number, "line": line})
        takes.sort(key=lambda t: t["take_number"])


@dataclass(frozen=True)
class AnalysisOutcome:
    """Final, review-policy-applied result for one take."""

    status: str
    confidence: float
    diverging_phrase: Optional[str]
    conflicts_with_take: Optional[int]
    reason: Optional[str]
    review_required: bool
    review_reason: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "confidence": self.confidence,
            "diverging_phrase": self.diverging_phrase,
            "conflicts_with_take": self.conflicts_with_take,
            "reason": self.reason,
            "review_required": self.review_required,
            "review_reason": self.review_reason,
        }


class OutOfOrderTakeError(Exception):
    """Raised when a take arrives without enough prior context to reason about safely."""

    def __init__(self, scene_id: str, character: str, take_number: int):
        self.scene_id = scene_id
        self.character = character
        self.take_number = take_number
        super().__init__(
            f"take {take_number} for {scene_id}/{character} arrived out of order "
            "with insufficient prior context"
        )


class StreamAnalystAgent:
    """Orchestrates context assembly, classification, and confidence policy."""

    def __init__(
        self,
        classifier: DialogueClassifier,
        memory: SceneMemory,
        confidence_threshold: float = LOW_CONFIDENCE_THRESHOLD,
    ):
        self._classifier = classifier
        self._memory = memory
        self._confidence_threshold = confidence_threshold

    def analyze(self, event: TranscriptEvent, allow_out_of_order: bool = False) -> AnalysisOutcome:
        """Analyze a single validated take.

        Raises:
            OutOfOrderTakeError: if the take number implies missing prior
                takes and ``allow_out_of_order`` is False. Callers should
                catch this and route to review/reconciliation rather than
                treat it as a hard failure.
            ClassifierError: propagated from the classifier after retries
                are exhausted, for the caller to map to NEEDS_REVIEW.
        """
        prior_takes = self._memory.get_prior_takes(event.scene_id, event.character)
        reference_line = self._memory.get_reference_line(event.scene_id, event.character)

        if reference_line is None and event.take_number == 1:
            # No script reference registered yet -- Take 1 becomes the de
            # facto reference, persisted so later takes can compare against it.
            reference_line = event.transcribed_line
            self._memory.set_reference_line(event.scene_id, event.character, reference_line)

        expected_prior_count = event.take_number - 1
        if len(prior_takes) < expected_prior_count and not allow_out_of_order:
            raise OutOfOrderTakeError(event.scene_id, event.character, event.take_number)

        if reference_line is None:
            result = ClassificationResult(
                status="MATCH",
                confidence=0.0,
                reason="No reference line available for comparison.",
            )
            outcome = self._apply_confidence_policy(result)
            return outcome

        result = self._classifier.classify(
            reference_line=reference_line,
            prior_takes=prior_takes,
            new_take={"take_number": event.take_number, "line": event.transcribed_line},
        )

        outcome = self._apply_confidence_policy(result)

        self._memory.record_take(
            event.scene_id, event.character, event.take_number, event.transcribed_line
        )
        return outcome

    def _apply_confidence_policy(self, result: ClassificationResult) -> AnalysisOutcome:
        review_required = result.confidence < self._confidence_threshold
        review_reason = "LOW_CONFIDENCE" if review_required else None
        return AnalysisOutcome(
            status=result.status,
            confidence=result.confidence,
            diverging_phrase=result.diverging_phrase,
            conflicts_with_take=result.conflicts_with_take,
            reason=result.reason,
            review_required=review_required,
            review_reason=review_reason,
        )
