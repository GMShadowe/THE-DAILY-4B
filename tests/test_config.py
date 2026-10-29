import os

import pytest

from src import config as settings

FEEDS = "feeds:\n  tech:\n    - name: A\n      url: https://a.example/rss\n"


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    monkeypatch.setattr(os, "environ", {})


def write(tmp_path, text):
    path = tmp_path / "config.yaml"
    path.write_text(text)
    return path


def test_fills_in_defaults(tmp_path):
    config = settings.load(write(tmp_path, "city: Pune\n" + FEEDS))

    assert config["provider"] == "ollama"
    assert config["units"] == "celsius"
    assert config["api_key"] == ""


def test_missing_file_explains_how_to_set_up(tmp_path):
    with pytest.raises(settings.ConfigError, match="config.example.yaml"):
        settings.load(tmp_path / "missing.yaml")


@pytest.mark.parametrize("extra", ["provider: openai\n", "units: kelvin\n", "provider: claude\n"])
def test_rejects_invalid_settings(tmp_path, extra):
    with pytest.raises(settings.ConfigError):
        settings.load(write(tmp_path, "city: Pune\n" + extra + FEEDS))


def test_requires_a_feed(tmp_path):
    with pytest.raises(settings.ConfigError, match="feed"):
        settings.load(write(tmp_path, "city: Pune\n"))


def test_rejects_feeds_that_are_not_grouped_by_section(tmp_path):
    with pytest.raises(settings.ConfigError, match="section"):
        settings.load(write(tmp_path, "city: Pune\nfeeds:\n  - name: A\n    url: https://a.example/rss\n"))


def test_reads_the_key_and_overrides_from_env_file(tmp_path):
    env = tmp_path / ".env"
    env.write_text("# keys\nDAILY4B_API_KEY='sk-1'\nDAILY4B_OLLAMA_HOST=http://host.docker.internal:11434\n")

    settings.load_env(env)
    config = settings.load(write(tmp_path, "city: Pune\n" + FEEDS))

    assert config["api_key"] == "sk-1"
    assert config["ollama_host"] == "http://host.docker.internal:11434"
