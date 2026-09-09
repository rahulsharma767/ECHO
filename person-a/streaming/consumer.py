"""Kafka consumer: the orchestration boundary of the Person A pipeline.

Consume -> validate -> load context -> classify -> apply confidence policy
-> persist to Firestore -> commit. One bad message must never crash the
consumer; every failure is logged with a stable error category and routed
to NEEDS_REVIEW rather than silently defaulted to MATCH.
"""

from __future__ import annotations

import json
import logging
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Optional

from agents.classifier import ClassifierError, DialogueClassifier, GeminiDialogueClassifier
from agents.stream_analyst_agent import (
    AnalysisOutcome,
    InMemorySceneMemory,
    OutOfOrderTakeError,
    StreamAnalystAgent,
)
from streaming.event_schema import EventValidationError, TranscriptEvent
from streaming.firestore_writer import FirestoreResultStore, FirestoreWriteError, ResultStore
from streaming.idempotency import IdempotencyStore
from streaming.kafka_config import load_kafka_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("echo.consumer")


def _log(event_name: str, **fields) -> None:
    logger.info(json.dumps({"event": event_name, **fields}))


class TranscriptConsumer:
    """Consumes ``takes.transcripts`` and drives one take through the pipeline."""

    def __init__(
        self,
        classifier: DialogueClassifier | None = None,
        result_store: ResultStore | None = None,
        settings=None,
        kafka_consumer=None,
    ):
        self._settings = settings or load_kafka_settings()
        self._classifier = classifier or GeminiDialogueClassifier()
        self._memory = InMemorySceneMemory()
        self._agent = StreamAnalystAgent(self._classifier, self._memory)
        self._result_store = result_store or FirestoreResultStore()
        self._idempotency = IdempotencyStore()
        self._consumer = kafka_consumer or self._build_consumer()
        self._shutdown_requested = False

    def _build_consumer(self):
        from confluent_kafka import Consumer  # imported lazily; not needed for unit tests

        consumer = Consumer(self._settings.consumer_config())
        consumer.subscribe([self._settings.topic])
        return consumer

    def request_shutdown(self, *_args) -> None:
        self._shutdown_requested = True

    def process_raw_message(self, raw_value: bytes | str) -> Optional[AnalysisOutcome]:
        """Process one raw Kafka message value end-to-end. Never raises."""
        started_at = time.monotonic()

        try:
            event = TranscriptEvent.from_json(raw_value)
        except EventValidationError as exc:
            _log("EVENT_REJECTED", error_type=exc.reason, detail=exc.detail)
            return None

        if self._idempotency.is_duplicate(event.event_id):
            _log("DUPLICATE_EVENT_IGNORED", event_id=event.event_id)
            return None
        self._idempotency.mark_seen(event.event_id)

        _log(
            "NEW_TAKE",
            event_id=event.event_id, scene_id=event.scene_id,
            take_number=event.take_number, character=event.character,
        )
        self._set_state(event, "NEW_TAKE")

        try:
            return self._analyze_and_persist(event, started_at)
        except OutOfOrderTakeError as exc:
            _log(
                "ORDERING_ANOMALY", event_id=event.event_id, scene_id=exc.scene_id,
                character=exc.character, take_number=exc.take_number,
            )
            outcome = self._needs_review_outcome("ORDERING_ANOMALY")
            self._safe_persist(event, outcome, "NEEDS_REVIEW")
            return outcome
        except ClassifierError as exc:
            _log(
                "CLASSIFICATION_FAILED", event_id=event.event_id,
                error_type=exc.category, detail=exc.detail,
            )
            outcome = self._needs_review_outcome(exc.category)
            self._safe_persist(event, outcome, "NEEDS_REVIEW")
            return outcome
        except Exception as exc:  # pragma: no cover - unexpected defensive backstop
            _log("UNEXPECTED_ERROR", event_id=event.event_id, detail=str(exc))
            outcome = self._needs_review_outcome("CONTEXT_ERROR")
            self._safe_persist(event, outcome, "ERROR")
            return outcome

    def _analyze_and_persist(self, event: TranscriptEvent, started_at: float) -> AnalysisOutcome:
        self._set_state(event, "COMPARING_SCRIPT")
        self._set_state(event, "COMPARING_PRIOR_TAKES")
        self._set_state(event, "CLASSIFYING")

        outcome = self._agent.analyze(event)
        latency_ms = int((time.monotonic() - started_at) * 1000)

        final_state = "NEEDS_REVIEW" if outcome.review_required else outcome.status
        self._persist(event, outcome, final_state)

        _log(
            "CLASSIFICATION_COMPLETE",
            event_id=event.event_id, scene_id=event.scene_id, take_number=event.take_number,
            character=event.character, status=outcome.status, confidence=outcome.confidence,
            review_required=outcome.review_required, latency_ms=latency_ms,
        )
        return outcome

    def _needs_review_outcome(self, review_reason: str) -> AnalysisOutcome:
        return AnalysisOutcome(
            status="NEEDS_REVIEW",
            confidence=0.0,
            diverging_phrase=None,
            conflicts_with_take=None,
            reason=None,
            review_required=True,
            review_reason=review_reason,
        )

    def _persist(self, event: TranscriptEvent, outcome: AnalysisOutcome, processing_state: str) -> None:
        take_record = {
            "take_number": event.take_number,
            "character": event.character,
            "line": event.transcribed_line,
            "status": outcome.status,
            "confidence": outcome.confidence,
            "diverging_phrase": outcome.diverging_phrase,
            "conflicts_with_take": outcome.conflicts_with_take,
            "reason": outcome.reason,
            "human_decision": None,
            "review_required": outcome.review_required,
            "processing_state": processing_state,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._result_store.upsert_take(event.scene_id, take_record)

    def _safe_persist(self, event: TranscriptEvent, outcome: AnalysisOutcome, processing_state: str) -> None:
        try:
            self._persist(event, outcome, processing_state)
        except FirestoreWriteError as exc:
            _log("FIRESTORE_ERROR", event_id=event.event_id, detail=exc.detail)

    def _set_state(self, event: TranscriptEvent, state: str) -> None:
        try:
            self._result_store.set_processing_state(
                event.scene_id, event.take_number, event.character, state
            )
        except FirestoreWriteError as exc:
            _log("FIRESTORE_ERROR", event_id=event.event_id, detail=exc.detail)

    def run(self, max_messages: Optional[int] = None) -> None:
        """Poll loop. Commits offsets only after successful processing."""
        signal.signal(signal.SIGINT, self.request_shutdown)
        signal.signal(signal.SIGTERM, self.request_shutdown)

        _log("CONSUMER_START", topic=self._settings.topic, group_id=self._settings.group_id)
        processed = 0
        try:
            while not self._shutdown_requested:
                if max_messages is not None and processed >= max_messages:
                    break
                msg = self._consumer.poll(1.0)
                if msg is None:
                    continue
                if msg.error():
                    _log("KAFKA_ERROR", detail=str(msg.error()))
                    continue

                self.process_raw_message(msg.value())
                self._consumer.commit(msg)
                processed += 1
        finally:
            self._consumer.close()
            _log("CONSUMER_STOPPED", processed=processed)


def main(argv: list[str] | None = None) -> int:
    consumer = TranscriptConsumer()
    consumer.run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
