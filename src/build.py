import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from src import llm
from src.config import ROOT

DATA_DIR = ROOT / "data"
ARCHIVE_DIR = DATA_DIR / "archive"
LATEST_PATH = DATA_DIR / "latest.json"
INDEX_PATH = ARCHIVE_DIR / "index.json"


def write_issue(curated, config, weather_data=None):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    today = datetime.now().strftime("%Y-%m-%d")

    issue = {
        "date": today,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "city": config.get("city"),
        "country": config.get("country"),
        "model": llm.model_name(config),
        "headline": curated.get("headline", ""),
        "digest": curated.get("digest", ""),
        "weather": weather_data,
        "articles": curated.get("articles", []),
    }

    if LATEST_PATH.exists():
        old = json.loads(LATEST_PATH.read_text())
        old_date = old.get("date")
        if old_date and old_date != today:
            shutil.copy(LATEST_PATH, ARCHIVE_DIR / f"{old_date}.json")

    LATEST_PATH.write_text(json.dumps(issue, indent=2))

    dates = sorted({p.stem for p in ARCHIVE_DIR.glob("*.json") if p.stem != "index"})
    INDEX_PATH.write_text(json.dumps(dates, indent=2))

    return issue
