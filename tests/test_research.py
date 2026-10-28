from src import research

RSS = b"""<?xml version="1.0"?>
<rss version="2.0"><channel><title>Feed</title>
<item>
  <title>Big story - The Atlantic</title>
  <link>https://news.example/1</link>
  <source url="https://www.theatlantic.com">The Atlantic</source>
</item>
<item>
  <title>Plain story</title>
  <link>https://news.example/2</link>
  <enclosure url="https://news.example/2.jpg" type="image/jpeg" length="1"/>
</item>
</channel></rss>"""


def test_credits_the_original_publisher():
    first, second = research.parse_feed(RSS, "Google News (Pune)", "local")

    assert first["title"] == "Big story"
    assert first["source"] == "The Atlantic"
    assert second["source"] == "Google News (Pune)"


def test_finds_enclosure_images():
    assert research.parse_feed(RSS, "Feed", "tech")[1]["image"] == "https://news.example/2.jpg"


def test_dedupe_drops_repeats_untitled_and_excluded_stories():
    items = [
        {"title": "a", "link": "1"},
        {"title": "a again", "link": "1"},
        {"title": "", "link": "2"},
        {"title": "c", "link": "3"},
        {"title": "d", "link": "4"},
    ]

    assert [i["link"] for i in research.dedupe(items, exclude={"4"})] == ["1", "3"]


def test_sources_add_city_and_country_news():
    jobs = research.sources({
        "tech_feeds": [{"name": "A", "url": "https://a.example/rss"}],
        "science_feeds": [],
        "city": "Pune",
        "country": "India",
    })

    assert [job[2] for job in jobs] == ["tech", "local", "country"]
    assert "Pune" in jobs[1][0]
