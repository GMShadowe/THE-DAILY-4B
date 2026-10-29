# Contributing

Thanks for helping make the morning paper better. Bug reports, feed suggestions and pull requests are all welcome.

## Getting set up

```bash
make setup      # python venv, dev dependencies, web dependencies
make dev        # site with live settings at http://localhost:5173
make dry-run    # check config, weather and feeds without the model
make run        # print a full issue
```

You need Python 3.12+, Node 20.19+ and either [Ollama](https://ollama.com) or an API key for an OpenAI-compatible provider.

## How the code is laid out

| Path | What it does |
| --- | --- |
| `main.py` | Command line: `--now`, `--dry-run`, `--daily`, `--config` |
| `src/research.py` | Fetches RSS feeds and Google News for your city and country |
| `src/curate.py` | Prompt and schema for picking and summarizing stories |
| `src/llm.py` | Talks to Ollama or an OpenAI-compatible API |
| `src/images.py` | Finds preview images for stories that lack one |
| `src/weather.py` | Forecast from Open-Meteo |
| `src/build.py` | Writes `data/latest.json` and archives past issues |
| `web/vite.config.js` | Serves `data/` live and the local settings API |
| `web/src/` | The React front end |

## Before you open a pull request

- Run `make test` and `make lint`.
- Keep pull requests to one change, and commits small and focused.
- Avoid code comments unless leaving one out would let someone break something by accident.
- For anything visual, follow the design rules in `.claude/skills/taste/SKILL.md` (paper, ink and one red accent; ruled square cells; serif headlines) and add a screenshot to the pull request.
- Never commit `config.yaml`, `.env` or anything in `data/`.

## Adding a default feed

Add it to `config.example.yaml` under `tech_feeds` or `science_feeds`. Check it with `make dry-run` first: some sites block unknown user agents or move their feeds.
