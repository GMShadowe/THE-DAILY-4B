import json
import os
import shutil
from datetime import datetime, timezone

from src import llm
from src.config import ROOT

DATA_DIR = ROOT / "data"


def recent_links(days=3, data_dir=DATA_DIR, today=None):
    today = today or datetime.now().date()
    links = set()
    for path in [data_dir / "latest.json", *(data_dir / "archive").glob("*.json")]:
        if path.name == "index.json" or not path.exists():
            continue
        try:
            issue = json.loads(path.read_text())
            date = datetime.strptime(issue.get("date", ""), "%Y-%m-%d").date()
        except (OSError, ValueError):
            continue
        if 0 < (today - date).days <= days:
            links.update(a["link"] for a in issue.get("articles", []) if a.get("link"))
    return links


def _write_json(path, value):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2))
    os.replace(temporary, path)


def write_issue(curated, config, weather_data=None, data_dir=DATA_DIR, now=None):
    now = now or datetime.now()
    archive_dir = data_dir / "archive"
    latest_path = data_dir / "latest.json"
    archive_dir.mkdir(parents=True, exist_ok=True)

    today = now.strftime("%Y-%m-%d")
    issue = {
        "date": today,
        "generated_at": now.astimezone(timezone.utc).isoformat(),
        "city": config.get("city"),
        "country": config.get("country"),
        "model": llm.model_name(config),
        "headline": curated.get("headline", ""),
        "digest": curated.get("digest", ""),
        "weather": weather_data,
        "articles": curated.get("articles", []),
    }

    if latest_path.exists():
        old_date = json.loads(latest_path.read_text()).get("date")
        if old_date and old_date != today:
            shutil.copy(latest_path, archive_dir / f"{old_date}.json")

    _write_json(latest_path, issue)
    dates = sorted(p.stem for p in archive_dir.glob("*.json") if p.stem != "index")
    _write_json(archive_dir / "index.json", dates)
    return issue
