from src import images


def test_prefers_og_image_and_resolves_relative_urls():
    html = (
        '<head><meta name="twitter:image" content="/twitter.jpg">'
        '<meta property="og:image" content="/og.jpg?a=1&amp;b=2"></head>'
    )

    assert images.find_image(html, "https://site.example/post") == "https://site.example/og.jpg?a=1&b=2"


def test_ignores_tags_after_the_head():
    assert images.find_image('<head></head><meta property="og:image" content="x.jpg">', "https://s.example/") is None


def test_skips_google_news_and_non_http_links():
    assert images.fetch_image("https://news.google.com/rss/articles/abc") is None
    assert images.fetch_image("ftp://files.example/a") is None
