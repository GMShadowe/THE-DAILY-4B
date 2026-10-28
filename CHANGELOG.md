# Changelog

## 0.1.0 (2026-10-29)

First public release.

- Morning pipeline: fetches tech and science feeds plus Google News for your city and country, has a small model pick and summarize the best stories, and prints them to `data/latest.json`.
- Newspaper front end: a full-width bento grid in newsprint style, with weather, a daily brief, a reader view and an archive of past issues.
- Settings onboarding in the browser: location, units, model, sources and custom RSS feeds.
- Runs on a local Ollama model or any OpenAI-compatible API (OpenAI, OpenRouter, Groq, LM Studio). API keys live in `.env`.
- Finds preview images for stories that lack one, and skips stories from the last three issues.
- `--now`, `--dry-run`, `--daily HH:MM` and `--config` on the command line.
- Docker compose for self-hosting, `make` shortcuts, tests and CI.
