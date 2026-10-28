import json

import pytest

from src import llm


def test_parse_json_ignores_text_around_the_object():
    assert llm.parse_json('Sure! {"a": 1} Hope that helps.') == {"a": 1}


def test_parse_json_raises_without_an_object():
    with pytest.raises(json.JSONDecodeError):
        llm.parse_json("no json here")


def test_retries_once_after_broken_json(monkeypatch):
    replies = iter(["{broken", '{"ok": true}'])
    monkeypatch.setattr(llm, "_ollama", lambda *args: next(replies))

    assert llm.complete_json("prompt", {}, {"provider": "ollama"}) == {"ok": True}


def test_gives_up_after_two_broken_replies(monkeypatch):
    monkeypatch.setattr(llm, "_ollama", lambda *args: "{broken")

    with pytest.raises(llm.LLMError):
        llm.complete_json("prompt", {}, {"provider": "ollama"})


def test_uses_the_openai_provider_when_configured(monkeypatch):
    monkeypatch.setattr(llm, "_openai", lambda *args: '{"via": "openai"}')

    assert llm.complete_json("prompt", {}, {"provider": "openai"}) == {"via": "openai"}


def test_model_name_follows_the_provider():
    config = {"api_model": "hosted", "ollama_model": "local"}

    assert llm.model_name({**config, "provider": "openai"}) == "hosted"
    assert llm.model_name({**config, "provider": "ollama"}) == "local"
