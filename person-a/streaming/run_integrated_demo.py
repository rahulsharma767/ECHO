"""Run the ECHO local end-to-end demo: Kafka -> Person A -> Person B."""
from __future__ import annotations

import os

from agents.classifier import FakeDialogueClassifier
from streaming.consumer import TranscriptConsumer
from streaming.http_result_store import HttpResultStore
from streaming.kafka_config import load_kafka_settings


def main():
    os.environ.setdefault("ECHO_PERSON_B_URL", "http://127.0.0.1:8080")
    os.environ.setdefault("KAFKA_GROUP_ID", "echo-integrated-demo")
    settings = load_kafka_settings()

    print(f"Connecting to Kafka: {settings.bootstrap_servers}")
    print(f"Sending classified takes to: {os.environ['ECHO_PERSON_B_URL']}")

    consumer = TranscriptConsumer(
        classifier=FakeDialogueClassifier(),
        result_store=HttpResultStore(),
        settings=settings,
    )
    consumer.run()


if __name__ == "__main__":
    main()
