from src import llm

SYSTEM_PROMPT = """You are the editor-in-chief of a daily morning newspaper.
You will be given a numbered pool of candidate articles (tech, science, local, and
country news). Pick only the best, most important and most applicable stories. Skip
anything minor, duplicate, clickbait, or low quality. For local/country news, only keep
genuinely major stories (politics, disasters, big economic/tech news) - skip routine
local items.

For each article you keep, write a thorough 2-4 sentence summary in your own words
(60-90 words) that covers what actually happened and why it matters, so a reader never
needs to open the original link to get the gist. Also rate its "importance" as "high",
"medium", or "low" - how big a deal this story actually is, not just how interesting.
Use "high" for only the 2-4 biggest stories of the day, "medium" for solid stories worth
a bigger spot, and "low" for everything else.

Finally, write a "digest": a 4-6 sentence wrap-up of the entire day across all sections,
written like the opening of a morning briefing, hitting the single most important story
in each category you included.

Refer to each article only by its pool index - never restate its title, link, image or
source, those will be filled in automatically.
"""

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "digest": {"type": "string"},
        "articles": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "index": {"type": "integer"},
                    "summary": {"type": "string"},
                    "importance": {"type": "string", "enum": ["high", "medium", "low"]},
                },
                "required": ["index", "summary", "importance"],
            },
        },
    },
    "required": ["headline", "digest", "articles"],
}


def _build_prompt(pool, max_articles):
    lines = []
    for i, item in enumerate(pool):
        summary = (item["summary"] or "")[:220].replace("\n", " ")
        lines.append(
            f"[{i}] category={item['category']} source={item['source']}\n"
            f"title: {item['title']}\n"
            f"summary: {summary}\n"
            f"has_image: {bool(item['image'])}\n"
        )
    pool_text = "\n".join(lines)
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"Select exactly {max_articles} articles from the pool below (there are plenty of "
        f"good ones, so do not return fewer), covering a good mix of categories. Prefer "
        f"articles with has_image: True when quality is similar.\n\n"
        f"CANDIDATE POOL:\n{pool_text}"
    )


def curate(pool, config):
    prompt = _build_prompt(pool, config.get("max_articles", 18))
    data = llm.complete_json(prompt, RESPONSE_SCHEMA, config)

    articles = []
    seen = set()
    for picked in data.get("articles", []):
        idx = picked.get("index")
        if not isinstance(idx, int) or idx < 0 or idx >= len(pool) or idx in seen:
            continue
        seen.add(idx)
        source_item = pool[idx]
        importance = picked.get("importance")
        if importance not in ("high", "medium", "low"):
            importance = "low"
        articles.append({
            "title": source_item["title"],
            "summary": picked.get("summary", "").strip(),
            "link": source_item["link"],
            "image": source_item["image"],
            "source": source_item["source"],
            "category": source_item["category"],
            "importance": importance,
        })

    return {
        "headline": data.get("headline", ""),
        "digest": data.get("digest", ""),
        "articles": articles,
    }
