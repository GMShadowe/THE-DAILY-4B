# The Daily 4B

A self-hosted morning newspaper, curated by a small local LLM. Run it once before you
wake up, and you get a clean static newspaper of the best tech/AI/science news and the
biggest stories from your city and country.

No server runs 24/7. No pm2. You run it once, it writes a JSON file, the site reads it.

## How it works

1. `src/research.py` pulls candidate articles from a list of tech/science RSS feeds,
   plus Google News RSS for your configured city and country.
2. `src/curate.py` sends the candidate pool to a local [Ollama](https://ollama.com)
   model (default `qwen3.5:4b`) and asks it to pick the best stories, write short
   summaries, and return structured JSON.
3. `src/build.py` writes `web/public/data/latest.json` and moves yesterday's issue into
   `web/public/data/archive/`.
4. `src/weather.py` grabs today's forecast for your city from Open-Meteo (no API key).
5. The React + Tailwind frontend in `web/` renders a full-width bento grid: weather and a
   daily brief up top, stories sized by importance, category filters, and a reader view
   so you get the full summary without leaving the page. Past issues live at `/archive`.

## Setup

```bash
# backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# pull a small local model (any ~4B instruct model works)
ollama pull qwen3.5:4b

# frontend
cd web && npm install
```

Then run `npm run dev` in `web/` and open the site. On first run it walks you through a
short setup (location, model, sources) and saves `config.yaml`. You can reopen it any time
from **Settings**, or copy `config.example.yaml` to `config.yaml` and edit it by hand.

## Usage

Generate today's issue:

```bash
python3 main.py --now
```

Then serve the site:

```bash
cd web && npm run dev     # or: npm run build && npm run preview
```

Run `python3 main.py --now` every morning however you like best - a cron entry, a
launchd job, or just by hand when you wake up. There's no background process to keep
running.
