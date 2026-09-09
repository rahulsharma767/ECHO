# Firestore schema

Collection: `scenes`

Document ID: `{scene_id}`

```json
{
  "scene_id": "SC14",
  "reference_lines": [
    {
      "character": "MARCUS",
      "line": "I never trusted him."
    }
  ],
  "takes": [
    {
      "take_number": 3,
      "character": "MARCUS",
      "line": "I never really trusted him.",
      "status": "DRIFT",
      "confidence": 0.91,
      "diverging_phrase": "really",
      "conflicts_with_take": 1,
      "reason": "Adds emphasis not present in Take 1.",
      "human_decision": null
    }
  ]
}
```

The `takes` section is the handoff area for Person A's Stream Analyst.
