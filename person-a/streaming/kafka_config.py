"""Environment-driven Confluent Kafka configuration.

Never hardcode credentials. Every value here is read from the environment
(optionally loaded from a local ``.env`` for development), with safe
development defaults for everything except secrets.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # pragma: no cover - dotenv is a dev convenience only
    pass


DEFAULT_TOPIC = "takes.transcripts"
DEFAULT_GROUP_ID = "echo-stream-analyst"
DEFAULT_BOOTSTRAP = "localhost:9092"
LOW_CONFIDENCE_THRESHOLD = 0.75


@dataclass(frozen=True)
class KafkaSettings:
    bootstrap_servers: str
    api_key: str | None
    api_secret: str | None
    topic: str
    group_id: str

    @property
    def is_confluent_cloud(self) -> bool:
        """True when SASL credentials are configured (i.e. not local dev)."""
        return bool(self.api_key and self.api_secret)

    def producer_config(self) -> dict:
        config = {"bootstrap.servers": self.bootstrap_servers}
        config.update(self._security_config())
        return config

    def consumer_config(self) -> dict:
        config = {
            "bootstrap.servers": self.bootstrap_servers,
            "group.id": self.group_id,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,
        }
        config.update(self._security_config())
        return config

    def _security_config(self) -> dict:
        if not self.is_confluent_cloud:
            return {}
        return {
            "security.protocol": "SASL_SSL",
            "sasl.mechanisms": "PLAIN",
            "sasl.username": self.api_key,
            "sasl.password": self.api_secret,
        }


def load_kafka_settings() -> KafkaSettings:
    """Build ``KafkaSettings`` from environment variables.

    Required (with dev-safe defaults):
        KAFKA_BOOTSTRAP_SERVERS, KAFKA_TOPIC, KAFKA_GROUP_ID
    Secrets (no default -- optional locally, required for Confluent Cloud):
        KAFKA_API_KEY, KAFKA_API_SECRET
    """
    return KafkaSettings(
        bootstrap_servers=os.environ.get("KAFKA_BOOTSTRAP_SERVERS", DEFAULT_BOOTSTRAP),
        api_key=os.environ.get("KAFKA_API_KEY") or None,
        api_secret=os.environ.get("KAFKA_API_SECRET") or None,
        topic=os.environ.get("KAFKA_TOPIC", DEFAULT_TOPIC),
        group_id=os.environ.get("KAFKA_GROUP_ID", DEFAULT_GROUP_ID),
    )
