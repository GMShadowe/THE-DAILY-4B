import argparse
import sys

import requests

from src import build, curate, images, llm, research, weather
from src import config as settings


def step(message):
    print(f"→ {message}", flush=True)


def report(pool):
    counts = {}
    for item in pool:
        counts[item["category"]] = counts.get(item["category"], 0) + 1
    print("  " + ", ".join(f"{n} {category}" for category, n in counts.items()))
    for item in pool[:5]:
        print(f"  - {item['title'][:80]} ({item['source']})")
    print("dry run: nothing was sent to the model or written.")


def run(config_path, dry_run=False):
    settings.load_env()
    try:
        config = settings.load(config_path)
    except settings.ConfigError as e:
        print(e)
        sys.exit(1)

    step(f"checking the weather in {config['city']}")
    try:
        weather_data = weather.fetch(config["city"], config["country"], config["units"])
    except requests.RequestException as e:
        print(f"  weather unavailable ({e.__class__.__name__}), printing without it")
        weather_data = None

    step("researching")
    seen = build.recent_links()
    pool = research.gather(config, exclude=seen)
    print(f"  {len(pool)} candidate stories, {len(seen)} recent ones skipped")
    if not pool:
        print("no stories found. check your internet connection and feeds.")
        sys.exit(1)
    if dry_run:
        report(pool)
        return

    step(f"curating with {llm.model_name(config)}")
    try:
        curated = curate.curate(pool, config)
    except llm.LLMError as e:
        print(e)
        sys.exit(1)
    print(f"  kept {len(curated['articles'])} stories")

    step("finding photos")
    print(f"  found {images.enrich(curated['articles'])} more")

    issue = build.write_issue(curated, config, weather_data)
    step(f"printed the {issue['date']} issue to data/latest.json")


def main():
    parser = argparse.ArgumentParser(description="generate today's newspaper")
    parser.add_argument("--now", action="store_true", help="run the full pipeline once")
    parser.add_argument("--dry-run", action="store_true", help="check config, weather and feeds without the model")
    parser.add_argument("--config", default=settings.ROOT / "config.yaml", help="path to config.yaml")
    args = parser.parse_args()

    if not (args.now or args.dry_run):
        print("nothing to do. run with --now to generate today's issue, or --dry-run to test your setup.")
        print("tip: schedule --now with cron or launchd for every morning.")
        sys.exit(0)

    run(args.config, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
