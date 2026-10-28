import json
from datetime import date, datetime

from src import build

CONFIG = {"city": "Pune", "country": "India", "provider": "ollama", "ollama_model": "qwen3.5:4b"}


def curated(*links):
    return {"headline": "h", "digest": "d", "articles": [{"link": link} for link in links]}


def read(path):
    return json.loads(path.read_text())


def test_moves_the_previous_day_into_the_archive(tmp_path):
    build.write_issue(curated("a"), CONFIG, data_dir=tmp_path, now=datetime(2026, 10, 28, 6))
    build.write_issue(curated("b"), CONFIG, data_dir=tmp_path, now=datetime(2026, 10, 29, 6))

    assert read(tmp_path / "latest.json")["date"] == "2026-10-29"
    assert read(tmp_path / "archive" / "2026-10-28.json")["articles"] == [{"link": "a"}]
    assert read(tmp_path / "archive" / "index.json") == ["2026-10-28"]


def test_rerunning_the_same_day_does_not_archive(tmp_path):
    for hour in (6, 7):
        build.write_issue(curated(), CONFIG, data_dir=tmp_path, now=datetime(2026, 10, 29, hour))

    assert read(tmp_path / "archive" / "index.json") == []


def test_records_the_model_used(tmp_path):
    issue = build.write_issue(curated(), CONFIG, data_dir=tmp_path, now=datetime(2026, 10, 29, 6))

    assert issue["model"] == "qwen3.5:4b"


def test_recent_links_skip_today_and_older_issues(tmp_path):
    for day, link in ((20, "old"), (28, "yesterday"), (29, "today")):
        build.write_issue(curated(link), CONFIG, data_dir=tmp_path, now=datetime(2026, 10, day, 6))

    assert build.recent_links(data_dir=tmp_path, today=date(2026, 10, 29)) == {"yesterday"}
