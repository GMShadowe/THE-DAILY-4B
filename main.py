import argparse
import sys

from src import build, curate, research, weather
from src import config as settings


def run(config_path):
    settings.load_env()
    try:
        config = settings.load(config_path)
    except settings.ConfigError as e:
        print(e)
        sys.exit(1)

    print("checking weather...")
    weather_data = weather.fetch(config.get("city"), config.get("country"))

    print("researching...")
    pool = research.gather(config)
    print(f"found {len(pool)} candidate articles")

    print("curating with local model...")
    curated = curate.curate(pool, config)
    print(f"kept {len(curated.get('articles', []))} articles")

    issue = build.write_issue(curated, config, weather_data)
    print(f"wrote issue for {issue['date']} -> web/public/data/latest.json")


def main():
    parser = argparse.ArgumentParser(description="generate today's newspaper")
    parser.add_argument("--now", action="store_true", help="run the full pipeline once")
    parser.add_argument("--config", default=settings.ROOT / "config.yaml", help="path to config.yaml")
    args = parser.parse_args()

    if not args.now:
        print("nothing to do. run with --now to generate today's issue.")
        print("tip: schedule this with your own cron job for every morning.")
        sys.exit(0)

    run(args.config)


if __name__ == "__main__":
    main()
