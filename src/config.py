import os
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent

DEFAULTS = {
    "city": "",
    "country": "",
    "units": "celsius",
    "provider": "ollama",
    "ollama_host": "http://localhost:11434",
    "ollama_model": "qwen3.5:4b",
    "api_base_url": "https://api.openai.com/v1",
    "api_model": "",
    "max_articles": 24,
    "feeds": {},
}

ENV_OVERRIDES = {"DAILY4B_OLLAMA_HOST": "ollama_host"}


class ConfigError(Exception):
    pass


def load_env(path=ROOT / ".env"):
    path = Path(path)
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def load(path):
    path = Path(path)
    if not path.exists():
        raise ConfigError(
            f"no config found at {path}.\n"
            "run `npm run dev` in web/ and open the site to set up, "
            "or copy config.example.yaml to config.yaml and edit it."
        )
    config = {**DEFAULTS, **(yaml.safe_load(path.read_text()) or {})}
    for env, key in ENV_OVERRIDES.items():
        if os.environ.get(env):
            config[key] = os.environ[env]
    config["api_key"] = os.environ.get("DAILY4B_API_KEY", "")
    validate(config)
    return config


def validate(config):
    if not str(config["city"]).strip():
        raise ConfigError("config is missing `city`")
    if config["provider"] not in ("ollama", "openai"):
        raise ConfigError("`provider` must be `ollama` or `openai`")
    if config["provider"] == "openai" and not config["api_model"]:
        raise ConfigError("set `api_model` when `provider` is `openai`")
    if config["units"] not in ("celsius", "fahrenheit"):
        raise ConfigError("`units` must be `celsius` or `fahrenheit`")
    feeds = config["feeds"]
    if not isinstance(feeds, dict) or not all(isinstance(v, list) for v in feeds.values()):
        raise ConfigError("`feeds` must map each section to a list of {name, url} feeds")
    if not any(feeds.values()):
        raise ConfigError("add at least one feed under `feeds`")
