import time
import urllib.parse
import feedparser


def _extract_image(entry):
    if "media_content" in entry and entry.media_content:
        return entry.media_content[0].get("url")
    if "media_thumbnail" in entry and entry.media_thumbnail:
        return entry.media_thumbnail[0].get("url")
    for link in entry.get("links", []):
        if link.get("type", "").startswith("image/"):
            return link.get("href")
    return None


def _fetch_feed(url, source, category, limit=6):
    items = []
    try:
        parsed = feedparser.parse(url)
    except Exception:
        return items

    for entry in parsed.entries[:limit]:
        items.append({
            "title": entry.get("title", "").strip(),
            "link": entry.get("link", ""),
            "summary": (entry.get("summary", "") or "")[:600],
            "image": _extract_image(entry),
            "source": source,
            "category": category,
            "published": entry.get("published", ""),
        })
    return items


def google_news_rss(query, category, limit=6):
    q = urllib.parse.quote(f"{query} when:1d")
    url = f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"
    return _fetch_feed(url, f"Google News ({query})", category, limit=limit)


def gather(config):
    pool = []

    for feed in config.get("tech_feeds", []):
        pool += _fetch_feed(feed["url"], feed["name"], "tech")
        time.sleep(0.2)

    for feed in config.get("science_feeds", []):
        pool += _fetch_feed(feed["url"], feed["name"], "science")
        time.sleep(0.2)

    city = config.get("city")
    country = config.get("country")
    if city:
        pool += google_news_rss(city, "local")
    if country:
        pool += google_news_rss(country, "country")

    seen = set()
    deduped = []
    for item in pool:
        key = item["link"] or item["title"]
        if key in seen or not item["title"]:
            continue
        seen.add(key)
        deduped.append(item)

    return deduped
