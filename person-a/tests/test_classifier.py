import pytest

from agents.classifier import (
    ClassifierError,
    FakeDialogueClassifier,
    parse_and_validate,
)

REFERENCE = "I never trusted him."


def test_parse_valid_match():
    raw = '{"status": "MATCH", "confidence": 0.98, "diverging_phrase": null, "conflicts_with_take": null, "reason": null}'
    result = parse_and_validate(raw)
    assert result.status == "MATCH"
    assert result.confidence == 0.98


def test_parse_valid_drift():
    raw = (
        '{"status": "DRIFT", "confidence": 0.91, "diverging_phrase": "really", '
        '"conflicts_with_take": 1, "reason": "Adds emphasis."}'
    )
    result = parse_and_validate(raw)
    assert result.status == "DRIFT"
    assert result.diverging_phrase == "really"
    assert result.conflicts_with_take == 1


def test_parse_strips_markdown_fences():
    raw = '```json\n{"status": "MATCH", "confidence": 0.95, "diverging_phrase": null, "conflicts_with_take": null, "reason": null}\n```'
    result = parse_and_validate(raw)
    assert result.status == "MATCH"


def test_parse_invalid_json_raises():
    with pytest.raises(ClassifierError) as exc_info:
        parse_and_validate("not json at all")
    assert exc_info.value.category == "GEMINI_INVALID_OUTPUT"


def test_parse_illegal_status_raises():
    raw = '{"status": "MAYBE", "confidence": 0.9}'
    with pytest.raises(ClassifierError):
        parse_and_validate(raw)


def test_parse_confidence_out_of_range_raises():
    raw = '{"status": "MATCH", "confidence": 1.5}'
    with pytest.raises(ClassifierError):
        parse_and_validate(raw)


def test_parse_non_numeric_confidence_raises():
    raw = '{"status": "MATCH", "confidence": "high"}'
    with pytest.raises(ClassifierError):
        parse_and_validate(raw)


def test_parse_invalid_conflicts_with_take_raises():
    raw = '{"status": "DRIFT", "confidence": 0.9, "conflicts_with_take": "one"}'
    with pytest.raises(ClassifierError):
        parse_and_validate(raw)


def test_fake_classifier_exact_match():
    classifier = FakeDialogueClassifier()
    result = classifier.classify(REFERENCE, [], {"take_number": 1, "line": "I never trusted him."})
    assert result.status == "MATCH"


def test_fake_classifier_acceptable_adlib():
    classifier = FakeDialogueClassifier()
    prior = [{"take_number": 1, "line": "I never trusted him."}]
    result = classifier.classify(REFERENCE, prior, {"take_number": 2, "line": "I didn't trust him."})
    assert result.status == "ACCEPTABLE_ADLIB"


def test_fake_classifier_drift():
    classifier = FakeDialogueClassifier()
    prior = [{"take_number": 1, "line": "I never trusted him."}]
    result = classifier.classify(
        REFERENCE, prior, {"take_number": 3, "line": "I never really trusted him."}
    )
    assert result.status == "DRIFT"
    assert result.diverging_phrase == "really"
    assert result.conflicts_with_take == 1


def test_fake_classifier_can_be_configured_to_raise():
    error = ClassifierError("GEMINI_TIMEOUT", "simulated timeout")
    classifier = FakeDialogueClassifier(raise_error=error)
    with pytest.raises(ClassifierError) as exc_info:
        classifier.classify(REFERENCE, [], {"take_number": 1, "line": "anything"})
    assert exc_info.value.category == "GEMINI_TIMEOUT"
