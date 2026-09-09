"""Transcript producer: publishes takes onto ``takes.transcripts``.

Simulates the on-set transcript system for the hackathon demo. This module
only produces events -- it never classifies a take and never writes to
Firestore.

Usage:
    python -m streaming.producer --demo
    python -m streaming.producer --file data/demo_takes.json --delay 1.5
"""

from __future__ import annotations

import argparse
import json
import logging
import signal
import sys
import time
from pathlib import Path

from streaming.event_schema import TranscriptEvent
from streaming.kafka_config import load_kafka_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("echo.producer")

DEMO_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "demo_takes.json"


class TranscriptProducer:
    """Thin wrapper around ``confluent_kafka.Producer`` for one-event publishing."""

    def __init__(self, settings=None, kafka_producer=None):
        self._settings = settings or load_kafka_settings()
        self._producer = kafka_producer or self._build_producer()
        self._shutdown_requested = False

    def _build_producer(self):
        from confluent_kafka import Producer  # imported lazily; not needed for unit tests

        return Producer(self._settings.producer_config())

    def publish(self, event: TranscriptEvent) -> None:
        """Publish one event, keyed by scene_id+character for ordered delivery
        within a scene/character partition, with a delivery-confirmation callback."""
        key = f"{event.scene_id}::{event.character}"

        def _on_delivery(err, msg):
            if err is not None:
                logger.error(
                    "DELIVERY_FAILED event_id=%s error=%s", event.event_id, err
                )
            else:
                logger.info(
                    "DELIVERY_CONFIRMED event_id=%s partition=%s offset=%s",
                    event.event_id, msg.partition(), msg.offset(),
                )

        self._producer.produce(
            topic=self._settings.topic,
            key=key,
            value=event.to_json(),
            callback=_on_delivery,
        )
        self._producer.poll(0)

    def flush(self, timeout: float = 10.0) -> int:
        return self._producer.flush(timeout)

    def request_shutdown(self, *_args) -> None:
        self._shutdown_requested = True

    def run_demo(self, events: list[TranscriptEvent], delay_seconds: float) -> None:
        signal.signal(signal.SIGINT, self.request_shutdown)
        signal.signal(signal.SIGTERM, self.request_shutdown)

        logger.info(
            "DEMO_START topic=%s event_count=%s delay=%ss",
            self._settings.topic, len(events), delay_seconds,
        )
        for event in events:
            if self._shutdown_requested:
                logger.info("SHUTDOWN_REQUESTED aborting remaining demo events")
                break
            logger.info(
                "PUBLISHING event_id=%s scene_id=%s take=%s character=%s line=%r",
                event.event_id, event.scene_id, event.take_number,
                event.character, event.transcribed_line,
            )
            self.publish(event)
            time.sleep(delay_seconds)

        self.flush()
        logger.info("DEMO_COMPLETE")


def load_demo_events(path: Path = DEMO_DATA_PATH) -> list[TranscriptEvent]:
    raw = json.loads(path.read_text())
    return [TranscriptEvent.from_dict(item) for item in raw]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ECHO transcript producer")
    parser.add_argument("--demo", action="store_true", help="Publish the deterministic demo sequence")
    parser.add_argument("--file", type=Path, default=DEMO_DATA_PATH, help="JSON file of takes to publish")
    parser.add_argument("--delay", type=float, default=2.0, help="Seconds between events in demo mode")
    args = parser.parse_args(argv)

    if not args.demo and args.file == DEMO_DATA_PATH:
        parser.error("pass --demo, or --file <path> to publish a custom sequence")

    events = load_demo_events(args.file)
    producer = TranscriptProducer()
    producer.run_demo(events, delay_seconds=args.delay)
    return 0


if __name__ == "__main__":
    sys.exit(main())
