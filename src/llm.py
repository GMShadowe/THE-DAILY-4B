import json

import requests


class LLMError(Exception):
    pass


def model_name(config):
    return config["api_model"] if config.get("provider") == "openai" else config["ollama_model"]


def _openai(prompt, schema, config):
    base = config["api_base_url"].rstrip("/")
    headers = {"Content-Type": "application/json"}
    if config.get("api_key"):
        headers["Authorization"] = f"Bearer {config['api_key']}"
    body = {
        "model": config["api_model"],
        "messages": [
            {"role": "system", "content": "Reply with one JSON object matching this JSON schema:\n" + json.dumps(schema)},
            {"role": "user", "content": prompt},
        ],
        "response_format": {"type": "json_object"},
    }
    try:
        response = requests.post(f"{base}/chat/completions", headers=headers, json=body, timeout=600)
        if response.status_code == 400 and "response_format" in response.text:
            del body["response_format"]
            response = requests.post(f"{base}/chat/completions", headers=headers, json=body, timeout=600)
    except requests.ConnectionError:
        raise LLMError(f"couldn't reach {base}")
    if response.status_code in (401, 403):
        raise LLMError(f"{base} rejected the API key. set DAILY4B_API_KEY in .env")
    if not response.ok:
        raise LLMError(f"{base} returned {response.status_code}: {response.text[:200]}")
    return response.json()["choices"][0]["message"]["content"] or ""


def _ollama(prompt, schema, config):
    host = config["ollama_host"]
    model = config["ollama_model"]
    try:
        response = requests.post(
            f"{host}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "format": schema,
                "stream": False,
                "think": False,
                "options": {"num_ctx": 32768, "num_predict": 8192},
            },
            timeout=600,
        )
    except requests.ConnectionError:
        raise LLMError(f"couldn't reach ollama at {host}. is it running? try `ollama serve`")
    if response.status_code == 404:
        raise LLMError(f"ollama doesn't have `{model}`. pull it with `ollama pull {model}`")
    if not response.ok:
        raise LLMError(f"ollama returned {response.status_code}: {response.text[:200]}")
    return response.json()["response"]


def parse_json(raw):
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start == -1 or end <= start:
            raise
        return json.loads(raw[start:end + 1])


def complete_json(prompt, schema, config, attempts=2):
    for attempt in range(attempts):
        raw = (_openai if config.get("provider") == "openai" else _ollama)(prompt, schema, config)
        try:
            return parse_json(raw)
        except json.JSONDecodeError:
            if attempt < attempts - 1:
                print("  model returned broken JSON, retrying...")
    raise LLMError("the model returned broken JSON twice. try a larger model or fewer stories")
