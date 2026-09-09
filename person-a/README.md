# ECHO — Person A: Core Streaming Pipeline

Real-time dialogue continuity pipeline: Confluent Kafka -> Stream Analyst
Agent (Gemini) -> Firestore.

## Setup

```bash
pip install -r requirements.txt   # or: pip install confluent-kafka google-cloud-firestore google-genai python-dotenv pytest
cp .env.example .env              # fill in real credentials locally, never commit
```

## Run tests

```bash
python -m pytest -q
```

47 tests: event schema validation, classifier output validation + retries,
scene/character memory isolation, idempotency, failure routing
(timeout/malformed output/malformed Kafka message/Firestore outage/low
confidence/out-of-order), and a full mocked end-to-end pipeline run.

## Run the local demo (no live cloud required)

The demo below uses the real module code paths with in-memory test doubles
standing in for the Kafka broker, Gemini, and Firestore — proving the wiring
without live credentials:

```bash
python3 -c "
from streaming.producer import load_demo_events
from streaming.consumer import TranscriptConsumer
from agents.classifier import FakeDialogueClassifier
from streaming.firestore_writer import FakeResultStore

consumer = TranscriptConsumer(
    classifier=FakeDialogueClassifier(),
    result_store=FakeResultStore(),
    settings=object(), kafka_consumer=object(),
)
for e in load_demo_events():
    o = consumer.process_raw_message(e.to_json())
    print(e.take_number, o.status, o.diverging_phrase)
"
```

Expected: `1 MATCH None`, `2 ACCEPTABLE_ADLIB ...`, `3 DRIFT really`.

## Run against live Confluent + Gemini + Firestore

Requires `.env` filled in with real `KAFKA_BOOTSTRAP_SERVERS`,
`KAFKA_API_KEY`, `KAFKA_API_SECRET`, `GEMINI_API_KEY`, and Google Cloud
Application Default Credentials for Firestore.

Terminal 1:
```bash
python -m streaming.consumer
```

Terminal 2:
```bash
python -m streaming.producer --demo --delay 2
```

## Project layout

```
streaming/   Kafka schema, config, producer, consumer, Firestore writer, idempotency
agents/      Gemini prompt, classifier interface (+ Gemini/Fake impls), Stream Analyst Agent
tests/       Unit + failure-handling + end-to-end tests
data/        Deterministic synthetic demo takes (MATCH / ACCEPTABLE_ADLIB / DRIFT)
```
