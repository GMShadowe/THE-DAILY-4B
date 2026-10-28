import argparse
import sys
from pathlib import Path

import yaml

from src import research, curate, build, weather


def run():
    if not Path("config.yaml").exists():
        print("no config.yaml yet. run `npm run dev` in web/ and open the site to set up,")
        print("or copy config.example.yaml to config.yaml and edit it.")
        sys.exit(1)

    config = yaml.safe_load(open("config.yaml"))

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
    args = parser.parse_args()

    if not args.now:
        print("nothing to do. run with --now to generate today's issue.")
        print("tip: schedule this with your own cron job for every morning.")
        sys.exit(0)

    run()


if __name__ == "__main__":
    main()
