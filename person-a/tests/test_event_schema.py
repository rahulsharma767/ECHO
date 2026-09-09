import json

import pytest

from streaming.event_schema import EventValidationError, TranscriptEvent

VALID_PAYLOAD = {
    "event_id": "evt_00042",
    "scene_id": "SC14",
    "take_number": 3,
    "character": "MARCUS",
    "transcribed_line": "I never really trusted him.",
    "timestamp": "2026-09-09T10:42:11Z",
    "audio_ref": "gs://echo-demo-audio/sc14_take3.wav",
}


def test_valid_event_parses():
    event = TranscriptEvent.from_json(json.dumps(VALID_PAYLOAD))
    assert event.event_id == "evt_00042"
    assert event.scene_id == "SC14"
    assert event.take_number == 3
    assert event.character == "MARCUS"
    assert event.memory_key == "SC14::MARCUS"


def test_missing_event_id_rejected():
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "event_id"}
    with pytest.raises(EventValidationError) as exc_info:
        TranscriptEvent.from_dict(payload)
    assert exc_info.value.reason == "INVALID_EVENT"


def test_missing_scene_id_rejected():
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "scene_id"}
    with pytest.raises(EventValidationError):
        TranscriptEvent.from_dict(payload)


def test_missing_character_rejected():
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "character"}
    with pytest.raises(EventValidationError):
        TranscriptEvent.from_dict(payload)


def test_missing_transcript_rejected():
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "transcribed_line"}
    with pytest.raises(EventValidationError):
        TranscriptEvent.from_dict(payload)


@pytest.mark.parametrize("bad_take_number", [0, -1, "3", 3.5, True])
def test_invalid_take_number_rejected(bad_take_number):
    payload = {**VALID_PAYLOAD, "take_number": bad_take_number}
    with pytest.raises(EventValidationError):
        TranscriptEvent.from_dict(payload)


def test_invalid_json_rejected():
    with pytest.raises(EventValidationError) as exc_info:
        TranscriptEvent.from_json("{not valid json")
    assert exc_info.value.reason == "INVALID_JSON"


def test_audio_ref_optional():
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "audio_ref"}
    event = TranscriptEvent.from_dict(payload)
    assert event.audio_ref is None


def test_missing_timestamp_defaults_to_now():
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "timestamp"}
    event = TranscriptEvent.from_dict(payload)
    assert event.timestamp  # non-empty, ISO-ish


def test_invalid_timestamp_rejected():
    payload = {**VALID_PAYLOAD, "timestamp": "not-a-timestamp"}
    with pytest.raises(EventValidationError):
        TranscriptEvent.from_dict(payload)


def test_round_trip_json():
    event = TranscriptEvent.from_dict(VALID_PAYLOAD)
    reparsed = TranscriptEvent.from_json(event.to_json())
    assert reparsed == event
