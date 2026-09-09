# Person A streaming contract

Person A publishes Kafka/Confluent events to topic `takes.transcripts`.

Expected event:

```json
{
  "event_id": "evt_00042",
  "scene_id": "SC14",
  "take_number": 3,
  "character": "MARCUS",
  "transcribed_line": "I never really trusted him.",
  "timestamp": "2026-09-09T10:42:11Z",
  "audio_ref": "gs://echo-demo-audio/sc14_take3.wav"
}
```

Person B's Firestore `scenes/{scene_id}.takes[]` is the downstream persistence contract.
