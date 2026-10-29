import urllib.parse
from concurrent.futures import ThreadPoolExecutor

import feedparser
import requests

USER_AGENT = "Daily4B/0.1 (self-hosted morning paper)"
TIMEOUT = 10
MAX_POOL = 120


def _extract_image(entry):
    if "media_content" in entry and entry.media_content:
        return entry.media_content[0].get("url")
    if "media_thumbnail" in entry and entry.media_thumbnail:
        return entry.media_thumbnail[0].get("url")
    for link in entry.get("links", []):
        if link.get("type", "").startswith("image/"):
            return link.get("href")
    return None


def parse_feed(content, source, category, limit=6):
    items = []
    for entry in feedparser.parse(content).entries[:limit]:
        title = entry.get("title", "").strip()
        publisher = (entry.get("source") or {}).get("title")
        if publisher and title.endswith(f" - {publisher}"):
            title = title[: -len(publisher) - 3]
        items.append({
            "title": title,
            "link": entry.get("link", ""),
            "summary": (entry.get("summary", "") or "")[:600],
            "image": _extract_image(entry),
            "source": publisher or source,
            "category": category,
            "published": entry.get("published", ""),
        })
    return items


def fetch_feed(url, source, category, limit=6):
    try:
        response = requests.get(url, timeout=TIMEOUT, headers={"User-Agent": USER_AGENT})
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"  skipped {source} ({e.__class__.__name__})")
        return []
    return parse_feed(response.content, source, category, limit)


def google_news_url(query):
    q = urllib.parse.quote(f"{query} when:1d")
    return f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"


def sources(config):
    jobs = [
        (feed["url"], feed["name"], section)
        for section, feeds in (config.get("feeds") or {}).items()
        for feed in feeds or []
    ]
    for key, category in (("city", "local"), ("country", "country")):
        place = config.get(key)
        if place:
            jobs.append((google_news_url(place), f"Google News ({place})", category))
    return jobs


def dedupe(items, exclude=()):
    seen = set(exclude)
    result = []
    for item in items:
        key = item["link"] or item["title"]
        if not item["title"] or key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def per_feed_limit(count):
    return max(3, min(6, MAX_POOL // max(count, 1)))


def gather(config, exclude=()):
    jobs = sources(config)
    limit = per_feed_limit(len(jobs))
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = executor.map(lambda job: fetch_feed(*job, limit), jobs)
    return dedupe([item for items in results for item in items], exclude)
