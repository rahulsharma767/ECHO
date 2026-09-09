from agents.stream_analyst_agent import InMemorySceneMemory


def test_scene_isolation():
    memory = InMemorySceneMemory()
    memory.record_take("SC13", "MARCUS", 1, "line from SC13")
    memory.record_take("SC14", "MARCUS", 1, "line from SC14")

    assert memory.get_prior_takes("SC13", "MARCUS") == [{"take_number": 1, "line": "line from SC13"}]
    assert memory.get_prior_takes("SC14", "MARCUS") == [{"take_number": 1, "line": "line from SC14"}]


def test_character_isolation():
    memory = InMemorySceneMemory()
    memory.record_take("SC14", "MARCUS", 1, "Marcus line")
    memory.record_take("SC14", "SARAH", 1, "Sarah line")

    assert memory.get_prior_takes("SC14", "MARCUS") == [{"take_number": 1, "line": "Marcus line"}]
    assert memory.get_prior_takes("SC14", "SARAH") == [{"take_number": 1, "line": "Sarah line"}]


def test_prior_takes_sorted_by_take_number():
    memory = InMemorySceneMemory()
    memory.record_take("SC14", "MARCUS", 2, "second")
    memory.record_take("SC14", "MARCUS", 1, "first")

    takes = memory.get_prior_takes("SC14", "MARCUS")
    assert [t["take_number"] for t in takes] == [1, 2]


def test_reference_line_storage():
    memory = InMemorySceneMemory()
    memory.set_reference_line("SC14", "MARCUS", "I never trusted him.")
    assert memory.get_reference_line("SC14", "MARCUS") == "I never trusted him."
    assert memory.get_reference_line("SC14", "SARAH") is None


def test_unknown_scene_returns_empty():
    memory = InMemorySceneMemory()
    assert memory.get_prior_takes("SC99", "NOBODY") == []
    assert memory.get_reference_line("SC99", "NOBODY") is None
