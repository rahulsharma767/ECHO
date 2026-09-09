from streaming.idempotency import IdempotencyStore


def test_new_event_is_not_duplicate():
    store = IdempotencyStore()
    assert store.is_duplicate("evt_1") is False


def test_marked_event_is_duplicate():
    store = IdempotencyStore()
    store.mark_seen("evt_1")
    assert store.is_duplicate("evt_1") is True


def test_distinct_events_do_not_collide():
    store = IdempotencyStore()
    store.mark_seen("evt_1")
    assert store.is_duplicate("evt_2") is False


def test_bounded_eviction():
    store = IdempotencyStore(max_size=3)
    for i in range(5):
        store.mark_seen(f"evt_{i}")
    # oldest two should have been evicted
    assert store.is_duplicate("evt_0") is False
    assert store.is_duplicate("evt_1") is False
    assert store.is_duplicate("evt_4") is True
