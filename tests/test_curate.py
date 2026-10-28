from src import curate, llm

POOL = [
    {
        "title": f"Story {i}",
        "link": f"https://news.example/{i}",
        "summary": "",
        "image": f"https://news.example/{i}.jpg" if i % 2 == 0 else None,
        "source": "Example",
        "category": "tech",
    }
    for i in range(4)
]


def test_maps_picks_back_to_the_pool(monkeypatch):
    monkeypatch.setattr(llm, "complete_json", lambda *args: {
        "headline": "Big day",
        "digest": "A digest.",
        "articles": [
            {"index": 2, "summary": " Two. ", "importance": "high"},
            {"index": 2, "summary": "Duplicate.", "importance": "low"},
            {"index": 9, "summary": "Out of range.", "importance": "low"},
            {"index": "1", "summary": "Not an int.", "importance": "low"},
            {"index": 3, "summary": "Three.", "importance": "enormous"},
        ],
    })

    result = curate.curate(POOL, {"max_articles": 2})

    assert result["headline"] == "Big day"
    assert [a["link"] for a in result["articles"]] == ["https://news.example/2", "https://news.example/3"]
    assert result["articles"][0]["summary"] == "Two."
    assert result["articles"][0]["image"] == "https://news.example/2.jpg"
    assert result["articles"][1]["importance"] == "low"


def test_prompt_numbers_every_candidate():
    prompt = curate._build_prompt(POOL, 2)

    assert "[3] category=tech" in prompt
    assert "Select exactly 2" in prompt
