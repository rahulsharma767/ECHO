"""Idempotency guard keyed on ``event_id``.

Kafka delivers at-least-once, so the same take can arrive twice. This keeps
the simplest reliable thing that works for the hackathon scope: a bounded
in-process set of seen event_ids. Firestore's ``upsert_take`` (keyed on
take_number + character) is naturally idempotent for the persisted result,
so this guard's real job is avoiding a duplicate, wasted Gemini call.
"""

from __future__ import annotations

from collections import OrderedDict


class IdempotencyStore:
    """Tracks seen ``event_id`` values with a bounded LRU-style eviction."""

    def __init__(self, max_size: int = 10_000):
        self._seen: OrderedDict[str, bool] = OrderedDict()
        self._max_size = max_size

    def is_duplicate(self, event_id: str) -> bool:
        return event_id in self._seen

    def mark_seen(self, event_id: str) -> None:
        if event_id in self._seen:
            self._seen.move_to_end(event_id)
            return
        self._seen[event_id] = True
        if len(self._seen) > self._max_size:
            self._seen.popitem(last=False)
