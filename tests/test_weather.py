from src import weather

RESULTS = [
    {"name": "San Francisco", "country": "Philippines"},
    {"name": "San Francisco", "country": "United States"},
]


def test_prefers_the_configured_country():
    assert weather.pick_place(RESULTS, "united states")["country"] == "United States"


def test_falls_back_to_the_first_match():
    assert weather.pick_place(RESULTS, "")["country"] == "Philippines"
    assert weather.pick_place([], "India") is None
