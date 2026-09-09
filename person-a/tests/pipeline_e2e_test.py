"""End-to-end architecture test.

Proves the full flow -- Producer -> Kafka boundary -> Consumer -> Stream
Analyst -> Classifier -> Firestore boundary -- using controlled test doubles
in place of Confluent Kafka, Gemini, and Firestore. This verifies the
*architecture*, not live cloud connectivity.

A separate, clearly-marked live integration test (skipped unless real
credentials are present) is provided at the bottom for use when Confluent
and Gemini credentials are actually configured.
"""

import json
import os

import pytest

from agents.classifier import FakeDialogueClassifier
from streaming.consumer import TranscriptConsumer
from streaming.event_schema import TranscriptEvent
from streaming.firestore_writer import FakeResultStore
from streaming.producer import load_demo_events


class FakeKafkaQueue:
    """In-process stand-in for the Kafka broker boundary.

    The real producer/consumer talk to Confluent over the network; here a
    plain list plays the role of ``takes.transcripts`` so the test proves
    the pipeline wiring without a live broker.
    """

    def __init__(self):
        self.messages: list[bytes] = []

    def produce(self, value: str) -> None:
        self.messages.append(value.encode("utf-8"))


def test_full_pipeline_three_takes_demo_narrative():
    events = load_demo_events()
    assert [e.take_number for e in events] == [1, 2, 3]

    # --- Producer boundary: events become Kafka-shaped JSON messages ---
    queue = FakeKafkaQueue()
    for event in events:
        queue.produce(event.to_json())
    assert len(queue.messages) == 3

    # --- Consumer boundary: classifier + Firestore are test doubles ---
    classifier = FakeDialogueClassifier()
    result_store = FakeResultStore()
    consumer = TranscriptConsumer(
        classifier=classifier,
        result_store=result_store,
        settings=object(),
        kafka_consumer=object(),
    )

    outcomes = [consumer.process_raw_message(raw) for raw in queue.messages]

    assert outcomes[0].status == "MATCH"
    assert outcomes[1].status == "ACCEPTABLE_ADLIB"
    assert outcomes[2].status == "DRIFT"
    assert outcomes[2].diverging_phrase == "really"
    assert outcomes[2].conflicts_with_take == 1
    assert outcomes[2].reason  # plain-English explanation present

    # --- Firestore boundary: results persisted in the documented contract ---
    scene = result_store.get_scene("SC14")
    assert scene is not None
    takes_by_number = {t["take_number"]: t for t in scene["takes"] if "status" in t}
    assert takes_by_number[1]["status"] == "MATCH"
    assert takes_by_number[2]["status"] == "ACCEPTABLE_ADLIB"
    assert takes_by_number[3]["status"] == "DRIFT"
    assert takes_by_number[3]["diverging_phrase"] == "really"
    assert takes_by_number[3]["conflicts_with_take"] == 1
    assert takes_by_number[3]["human_decision"] is None


def test_pipeline_never_produces_false_match_on_classifier_failure():
    from agents.classifier import ClassifierError

    events = load_demo_events()
    classifier = FakeDialogueClassifier(raise_error=ClassifierError("GEMINI_ERROR", "boom"))
    result_store = FakeResultStore()
    consumer = TranscriptConsumer(
        classifier=classifier, result_store=result_store,
        settings=object(), kafka_consumer=object(),
    )

    outcome = consumer.process_raw_message(events[0].to_json())
    assert outcome.status == "NEEDS_REVIEW"
    assert outcome.status != "MATCH"


# --- Live integration test (only runs with real credentials) ---------------

LIVE_CREDS_AVAILABLE = bool(
    os.environ.get("KAFKA_BOOTSTRAP_SERVERS")
    and os.environ.get("KAFKA_API_KEY")
    and os.environ.get("GEMINI_API_KEY")
)


@pytest.mark.skipif(
    not LIVE_CREDS_AVAILABLE,
    reason="NOT LIVE VERIFIED: no Confluent/Gemini credentials in this environment",
)
def test_live_pipeline_against_real_confluent_and_gemini():  # pragma: no cover
    """Only runs when KAFKA_BOOTSTRAP_SERVERS/KAFKA_API_KEY/GEMINI_API_KEY are set.

    This is intentionally separate from the mocked e2e test above: a mocked
    test result must never be reported as live cloud verification.
    """
    from agents.classifier import GeminiDialogueClassifier
    from streaming.consumer import TranscriptConsumer
    from streaming.firestore_writer import FirestoreResultStore

    consumer = TranscriptConsumer(
        classifier=GeminiDialogueClassifier(),
        result_store=FirestoreResultStore(),
    )
    events = load_demo_events()
    outcomes = [consumer.process_raw_message(e.to_json()) for e in events]
    assert outcomes[2].status == "DRIFT"
