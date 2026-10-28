import re
from concurrent.futures import ThreadPoolExecutor
from html import unescape
from urllib.parse import urljoin, urlparse

import requests

from src.research import USER_AGENT

META = re.compile(r"<meta\b[^>]*>", re.I)
ATTR = re.compile(r"""([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')""")
KEYS = ("og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src")
SKIP_HOSTS = ("news.google.com",)
MAX_BYTES = 500_000


def find_image(html, base_url):
    head = re.split(r"</head>", html, maxsplit=1, flags=re.I)[0]
    found = {}
    for tag in META.findall(head):
        attrs = {name.lower(): unescape(dq or sq) for name, dq, sq in ATTR.findall(tag)}
        key = (attrs.get("property") or attrs.get("name") or "").lower()
        if key in KEYS and attrs.get("content", "").strip():
            found.setdefault(key, attrs["content"].strip())
    for key in KEYS:
        if key in found:
            return urljoin(base_url, found[key])
    return None


def fetch_image(url):
    parsed = urlparse(url or "")
    if parsed.scheme not in ("http", "https") or parsed.hostname in SKIP_HOSTS:
        return None
    try:
        with requests.get(url, timeout=8, headers={"User-Agent": USER_AGENT}, stream=True) as response:
            if not response.ok or "html" not in response.headers.get("content-type", ""):
                return None
            body = b""
            for chunk in response.iter_content(65536):
                body += chunk
                if len(body) > MAX_BYTES or b"</head>" in body.lower():
                    break
            return find_image(body.decode(response.encoding or "utf-8", errors="replace"), response.url)
    except requests.RequestException:
        return None


def enrich(articles):
    missing = [a for a in articles if not a.get("image")]
    with ThreadPoolExecutor(max_workers=8) as executor:
        for article, image in zip(missing, executor.map(lambda a: fetch_image(a["link"]), missing)):
            article["image"] = image
    return sum(1 for a in missing if a["image"])
