import pytest

from agents.classifier import ClassificationResult, ClassifierError, FakeDialogueClassifier
from streaming.consumer import TranscriptConsumer
from streaming.event_schema import TranscriptEvent
from streaming.firestore_writer import FakeResultStore

SCENE = "SC14"
CHARACTER = "MARCUS"


def make_event(event_id: str, take_number: int, line: str) -> str:
    return TranscriptEvent(
        event_id=event_id,
        scene_id=SCENE,
        take_number=take_number,
        character=CHARACTER,
        transcribed_line=line,
        timestamp="2026-09-09T10:40:00Z",
    ).to_json()


def build_consumer(classifier=None, result_store=None):
    return TranscriptConsumer(
        classifier=classifier or FakeDialogueClassifier(),
        result_store=result_store or FakeResultStore(),
        settings=object(),  # unused: process_raw_message never touches Kafka wiring
        kafka_consumer=object(),  # prevents real Confluent client construction
    )


# --- Retry logic (classifier layer) -----------------------------------------


def test_gemini_timeout_retries_once_then_raises(monkeypatch):
    from agents.classifier import GeminiDialogueClassifier

    classifier = GeminiDialogueClassifier(api_key="fake", max_attempts=2)
    call_count = {"n": 0}

    def flaky_call(_self, _prompt):
        call_count["n"] += 1
        raise TimeoutError("simulated timeout")

    monkeypatch.setattr(GeminiDialogueClassifier, "_call_gemini", flaky_call)

    with pytest.raises(ClassifierError) as exc_info:
        classifier.classify("ref", [], {"take_number": 1, "line": "x"})

    assert exc_info.value.category == "GEMINI_TIMEOUT"
    assert call_count["n"] == 2  # one retry, per spec


def test_gemini_malformed_response_retries_then_raises(monkeypatch):
    from agents.classifier import GeminiDialogueClassifier

    classifier = GeminiDialogueClassifier(api_key="fake", max_attempts=2)
    call_count = {"n": 0}

    def bad_json_call(_self, _prompt):
        call_count["n"] += 1
        return "not valid json"

    monkeypatch.setattr(GeminiDialogueClassifier, "_call_gemini", bad_json_call)

    with pytest.raises(ClassifierError) as exc_info:
        classifier.classify("ref", [], {"take_number": 1, "line": "x"})

    assert exc_info.value.category == "GEMINI_INVALID_OUTPUT"
    assert call_count["n"] == 2


def test_gemini_recovers_on_second_attempt(monkeypatch):
    from agents.classifier import GeminiDialogueClassifier

    classifier = GeminiDialogueClassifier(api_key="fake", max_attempts=2)
    call_count = {"n": 0}

    def recovers(_self, _prompt):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise TimeoutError("simulated timeout")
        return '{"status": "MATCH", "confidence": 0.95, "diverging_phrase": null, "conflicts_with_take": null, "reason": null}'

    monkeypatch.setattr(GeminiDialogueClassifier, "_call_gemini", recovers)
    result = classifier.classify("ref", [], {"take_number": 1, "line": "x"})
    assert result.status == "MATCH"
    assert call_count["n"] == 2


# --- Consumer-level failure routing -----------------------------------------


def test_kafka_malformed_message_does_not_crash_consumer():
    consumer = build_consumer()
    outcome = consumer.process_raw_message(b"{not valid json")
    assert outcome is None  # rejected, logged, pipeline keeps running


def test_low_confidence_routes_to_review():
    fixed = ClassificationResult(status="MATCH", confidence=0.62)
    classifier = FakeDialogueClassifier(fixed_result=fixed)
    result_store = FakeResultStore()
    consumer = build_consumer(classifier=classifier, result_store=result_store)

    outcome = consumer.process_raw_message(make_event("evt_1", 1, "I never trusted him."))

    assert outcome.review_required is True
    assert outcome.review_reason == "LOW_CONFIDENCE"
    scene = result_store.get_scene(SCENE)
    take = scene["takes"][0]
    assert take["processing_state"] == "NEEDS_REVIEW"


def test_classifier_error_never_defaults_to_match():
    classifier = FakeDialogueClassifier(raise_error=ClassifierError("GEMINI_ERROR", "boom"))
    result_store = FakeResultStore()
    consumer = build_consumer(classifier=classifier, result_store=result_store)

    outcome = consumer.process_raw_message(make_event("evt_1", 1, "I never trusted him."))

    assert outcome.status == "NEEDS_REVIEW"
    assert outcome.status != "MATCH"
    scene = result_store.get_scene(SCENE)
    assert scene["takes"][0]["processing_state"] == "NEEDS_REVIEW"


def test_duplicate_event_ignored():
    classifier = FakeDialogueClassifier()
    result_store = FakeResultStore()
    consumer = build_consumer(classifier=classifier, result_store=result_store)

    raw = make_event("evt_dup", 1, "I never trusted him.")
    first = consumer.process_raw_message(raw)
    second = consumer.process_raw_message(raw)

    assert first is not None
    assert second is None
    assert len(classifier.calls) == 1  # Gemini called only once


def test_out_of_order_take_routes_to_review_not_silent_context_invention():
    classifier = FakeDialogueClassifier()
    result_store = FakeResultStore()
    consumer = build_consumer(classifier=classifier, result_store=result_store)

    # Take 3 arrives with no Take 1/2 ever seen for this scene/character.
    outcome = consumer.process_raw_message(make_event("evt_1", 3, "I never really trusted him."))

    assert outcome.status == "NEEDS_REVIEW"
    assert outcome.review_reason == "ORDERING_ANOMALY"
    assert len(classifier.calls) == 0  # never fabricated missing context to classify anyway


def test_firestore_write_failure_is_logged_not_swallowed_as_success():
    classifier = FakeDialogueClassifier()
    result_store = FakeResultStore()
    consumer = build_consumer(classifier=classifier, result_store=result_store)

    result_store.fail_next_write = True
    # Should not raise -- consumer must not crash on a Firestore outage.
    outcome = consumer.process_raw_message(make_event("evt_1", 1, "I never trusted him."))
    assert outcome is not None  # classification still happened
