# Changelog

## 0.1.0 (2026-10-29)

First public release.

- Morning pipeline: fetches feeds across eight sections (world, business, technology, science, health, climate, culture and sports) plus Google News for your city and country, has a small model pick and summarize the best stories, and prints them to `data/latest.json`.
- Newspaper front end: a full-width bento grid in newsprint style, with weather, a daily brief, a reader view and an archive of past issues.
- Settings onboarding in the browser: location, units, model, sections and custom RSS feeds. Sections are just keys under `feeds`, so you can add your own.
- Runs on a local Ollama model or any OpenAI-compatible API (OpenAI, OpenRouter, Groq, LM Studio). API keys live in `.env`.
- Finds preview images for stories that lack one, and skips stories from the last three issues.
- `--now`, `--dry-run`, `--daily HH:MM` and `--config` on the command line.
- Docker compose for self-hosting, `make` shortcuts, tests and CI.
- Accessible by keyboard and screen reader: labelled forms, a keyboard-operable city search, a native dialog for the reader view, headline buttons on story tiles in visual reading order, a skip link, page titles, and text and controls that meet WCAG 2.2 AA contrast.
- The curator is asked to cover every section, so one topic no longer fills the paper.

### Known limitations

- Small models still lean toward tech stories, partly because tech has the most default feeds.
- The Docker setup is new and has had little real-world testing.
