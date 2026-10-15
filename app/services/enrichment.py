"""Per-image writing help: questions to think about and power words.

Every image always has details: an OpenAI-written set is stored when one
could be generated, otherwise a deterministic built-in set is used.
"""
import hashlib
import json
import logging
import os
import random
import threading
from typing import Optional

from . import image_service

logger = logging.getLogger(__name__)

ENRICHMENT_NAME = "enrichment.json"
_lock = threading.Lock()

QUESTION_TEMPLATES = [
    "Who is the main character, and what are they like?",
    "Where is this happening, and what can you see, hear and smell?",
    "What does the main character want more than anything?",
    "What is the character feeling right now, and why?",
    "What might be hiding just out of sight?",
    "What went wrong, or is about to go wrong?",
    "Who could help the character, and how?",
    "What happened just before this picture?",
    "What will the character do next?",
    "What surprising thing could happen on the very next page?",
    "If the picture could speak, what would it say?",
    "How will the character be different at the end of the story?",
]

WORD_BANK = [
    ("shimmering", "shining with a soft, flickering light"),
    ("curious", "eager to find out about things"),
    ("tiptoed", "walked quietly on the tips of your toes"),
    ("enormous", "extremely big"),
    ("whispered", "spoke very softly"),
    ("gleaming", "shining brightly"),
    ("startled", "suddenly surprised or scared"),
    ("bravely", "in a way that shows courage"),
    ("tangled", "twisted together in a mess"),
    ("peculiar", "strange or unusual"),
    ("scurried", "ran quickly with small steps"),
    ("dazzling", "so bright it is hard to look at"),
    ("mysterious", "strange and hard to explain"),
    ("rumbled", "made a deep, rolling sound"),
    ("wandered", "walked around without a plan"),
    ("glimpse", "a quick look at something"),
    ("fearless", "not afraid of anything"),
    ("drifted", "moved slowly and gently"),
    ("treasure", "a collection of precious things"),
    ("hesitated", "paused because you were not sure"),
    ("sparkled", "shone with tiny flashes of light"),
    ("determined", "firmly decided to do something"),
    ("cozy", "warm, comfortable and safe"),
    ("echoed", "a sound that bounced back again"),
    ("swirled", "moved round and round"),
    ("astonished", "very, very surprised"),
    ("gentle", "kind and soft"),
    ("adventure", "an exciting journey or event"),
    ("wobbled", "moved unsteadily from side to side"),
    ("splendid", "wonderful and impressive"),
    ("nervously", "in a worried, jumpy way"),
    ("discovered", "found something for the first time"),
    ("magnificent", "very grand and beautiful"),
    ("crept", "moved slowly and quietly"),
    ("triumphant", "feeling proud after winning"),
    ("whirled", "spun around quickly"),
]


def _seed(prompt: str) -> int:
    return int(hashlib.sha1(prompt.lower().encode()).hexdigest()[:8], 16)


def fallback_details(prompt: str) -> dict:
    rng = random.Random(_seed(prompt))
    return {
        "questions": rng.sample(QUESTION_TEMPLATES, 3),
        "words": [
            {"word": w, "meaning": m}
            for w, m in rng.sample(WORD_BANK, 4)
        ],
    }


def _read() -> dict:
    path = image_service.GENERATED_IMAGES_DIR / ENRICHMENT_NAME
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _valid(d) -> bool:
    return (
        isinstance(d, dict)
        and isinstance(d.get("questions"), list)
        and 1 <= len(d["questions"]) <= 5
        and all(isinstance(q, str) and q for q in d["questions"])
        and isinstance(d.get("words"), list)
        and 1 <= len(d["words"]) <= 6
        and all(
            isinstance(w, dict)
            and isinstance(w.get("word"), str)
            and isinstance(w.get("meaning"), str)
            for w in d["words"]
        )
    )


def details_for(url: str, prompt: str, store: Optional[dict] = None) -> dict:
    name = url.rsplit("/", 1)[-1]
    data = (store if store is not None else _read()).get(name)
    return data if _valid(data) else fallback_details(prompt)


def load_store() -> dict:
    return _read()


def generate_and_store(url: str, prompt: str) -> Optional[dict]:
    """Ask OpenAI for tailored questions/words; store them if safe."""
    key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not key.startswith("sk-"):
        return None
    try:
        from openai import OpenAI

        from .prompts import is_prompt_safe

        client = OpenAI(api_key=key, timeout=20.0, max_retries=0)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            max_tokens=400,
            temperature=0.8,
            messages=[
                {"role": "system", "content": (
                    "You help children aged 6-11 write stories from a "
                    "picture. Reply with JSON only: {\"questions\": "
                    "[3 short questions about the picture that spark story "
                    "ideas], \"words\": [4 objects {\"word\", \"meaning\"} "
                    "of vivid words a child could use, meanings under 10 "
                    "words]}. Keep everything gentle and child-friendly.")},
                {"role": "user", "content": prompt},
            ],
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        details = {
            "questions": [q.strip() for q in data.get("questions", [])][:3],
            "words": [
                {"word": w["word"].strip(), "meaning": w["meaning"].strip()}
                for w in data.get("words", [])
            ][:4],
        }
        if not _valid(details):
            return None
        if not is_prompt_safe(client, json.dumps(details)):
            return None
        name = url.rsplit("/", 1)[-1]
        with _lock:
            store = _read()
            store[name] = details
            image_service._atomic_write(
                image_service.GENERATED_IMAGES_DIR / ENRICHMENT_NAME,
                json.dumps(store, indent=2, sort_keys=True).encode("utf-8"),
            )
        return details
    except Exception as e:
        logger.warning("Enrichment failed; using built-in details: %s", e)
        return None
