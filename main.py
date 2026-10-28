import argparse
import sys
import time
from datetime import datetime, timedelta

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


def clock(value):
    try:
        datetime.strptime(value, "%H:%M")
    except ValueError:
        raise argparse.ArgumentTypeError("use 24-hour HH:MM, like 06:00")
    return value


def seconds_until(at, now=None):
    now = now or datetime.now()
    hour, minute = map(int, at.split(":"))
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


def daily(config_path, at):
    while True:
        wait = seconds_until(at)
        step(f"next issue at {at}, {wait / 3600:.1f}h from now")
        time.sleep(wait)
        try:
            run(config_path)
        except SystemExit:
            pass
        except Exception as e:
            print(f"this morning's run failed: {e}")


def main():
    parser = argparse.ArgumentParser(description="generate today's newspaper")
    parser.add_argument("--now", action="store_true", help="run the full pipeline once")
    parser.add_argument("--dry-run", action="store_true", help="check config, weather and feeds without the model")
    parser.add_argument("--daily", type=clock, metavar="HH:MM", help="stay running and print every day at this time")
    parser.add_argument("--config", default=settings.ROOT / "config.yaml", help="path to config.yaml")
    args = parser.parse_args()

    if args.daily:
        daily(args.config, args.daily)

    if not (args.now or args.dry_run):
        print("nothing to do. run with --now to generate today's issue, or --dry-run to test your setup.")
        print("tip: schedule --now with cron or launchd for every morning.")
        sys.exit(0)

    run(args.config, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
