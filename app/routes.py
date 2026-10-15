import hmac
import os
import random

from flask import (
    Blueprint,
    current_app,
    jsonify,
    render_template,
    request,
    url_for,
)

import hashlib
from datetime import datetime, timezone

from .services import enrichment
from .services.themes import THEME_IDS, public_themes, themes_for
from .services.image_service import (
    generate_image_url,
    get_all_existing_images,
    random_fallback_url,
)
from .services.limits import DailyCap, RateLimiter
from .services.prompts import get_unused_prompt
from .services.seeding import seed_images


bp = Blueprint("main", __name__)

MAX_SEED_COUNT = 50
DEFAULT_IMAGE_LIMIT = 24
MAX_IMAGE_LIMIT = 100

_ip_limiter = RateLimiter(
    max_events=int(os.environ.get("GENERATE_LIMIT_PER_HOUR", "5")),
    window_sec=3600,
)
_daily_cap = DailyCap(int(os.environ.get("DAILY_GENERATION_CAP", "100")))


# Sections and apps shown on the homepage. Add an app to a section's
# "apps" list to launch it; entries without an endpoint render as
# "Coming soon" cards.
SECTIONS = [
    {
        "id": "story",
        "title": "Stories & creativity",
        "blurb": "Spark ideas and get writing.",
        "apps": [
            {
                "name": "Story Starter",
                "tagline": "Spin up a picture and write a story about it.",
                "emoji": "\U0001F4D6",
                "ages": "Ages 6-11",
                "min_age": 6,
                "max_age": 11,
                "endpoint": "main.story_starter",
            },
            {
                "name": "Word Wizard",
                "tagline": "Build spells out of new and exciting words.",
                "emoji": "\U0001FA84",
                "ages": "Ages 6-11",
                "endpoint": "wordwizard.index",
                "world": "challenge",
                "menu_label": "CAST A SPELL",
                "min_age": 6,
                "max_age": 11,
            },
            {
                "name": "Doodle Quest",
                "tagline": "Draw along with a daily creative challenge.",
                "emoji": "\U0001F58D\uFE0F",
                "ages": "Ages 6-11",
                "endpoint": "doodlequest.index",
                "world": "create",
                "menu_label": "DRAW A DOODLE",
                "min_age": 6,
                "max_age": 11,
            },
            {
                "name": "Rhyme Time",
                "tagline": "Find rhymes and make silly poems.",
                "emoji": "\U0001F3B5",
                "ages": "Ages 6-11",
                "endpoint": "rhymetime.index",
                "world": "create",
                "menu_label": "MAKE A RHYME",
                "min_age": 6,
                "max_age": 11,
            },
        ],
    },
    {
        "id": "skills",
        "title": "Skills",
        "blurb": "Level up a real-life skill, one song at a time.",
        "apps": [
            {
                "name": "Typing Hero",
                "tagline": "Rock the keyboard and learn to touch type, "
                           "finger by finger.",
                "emoji": "\U0001F3B8",
                "ages": "Ages 7-11",
                "min_age": 7,
                "max_age": 11,
                "endpoint": "typinghero.index",
                "world": "race",
                "menu_label": "ROCK THE KEYS",
            },
        ],
    },
    {
        "id": "11-plus",
        "title": "11 Plus",
        "blurb": "Friendly exam practice, plus a game that makes it fun.",
        "apps": [
            {
                "name": "11+ Examinator",
                "tagline": "Short practice rounds in maths, English and "
                           "reasoning, with instant explanations.",
                "emoji": "\U0001F4DD",
                "ages": "Ages 9-11 · 11+ prep",
                "min_age": 9,
                "max_age": 11,
                "endpoint": "elevenplus.index",
            },
            {
                "name": "Spark Stumble Race",
                "tagline": "Race 31 players by answering questions. "
                           "Win the crown!",
                "emoji": "\U0001F3C1",
                "ages": "Ages 9-11 · 11+ prep",
                "min_age": 9,
                "max_age": 11,
                "endpoint": "elevenplus.stumble",
            },
        ],
    },
]


def _payload(url: str, prompt: str, store=None) -> dict:
    """An image plus its themes and writing help."""
    details = enrichment.details_for(url, prompt, store)
    return {
        "url": url,
        "image_url": url,
        "prompt": prompt,
        "themes": themes_for(prompt),
        "questions": details["questions"],
        "words": details["words"],
    }


def _image_json(url: str, prompt: str, generated: bool):
    return jsonify({**_payload(url, prompt), "generated": generated})


def _random_existing(existing):
    url, prompt = random.choice(existing)
    return _image_json(url, prompt, generated=False)


def _theme_arg(raw):
    return raw if raw in THEME_IDS else None


@bp.get("/")
def index():
    sections = [
        {
            **sec,
            "apps": [
                {
                    **a,
                    "url": url_for(a["endpoint"]) if a.get("endpoint") else None,
                }
                for a in sec["apps"]
            ],
        }
        for sec in SECTIONS
    ]
    return render_template(
        "home.html",
        title="TinySpark",
        sections=sections,
        ga_id=current_app.config.get("GA_MEASUREMENT_ID", ""),
    )


@bp.get("/story-starter")
def story_starter():
    return render_template(
        "story.html",
        title="TinySpark",
        ga_id=current_app.config.get("GA_MEASUREMENT_ID", ""),
        story_config={
            "themes": public_themes(),
            "elevenplusUrl": url_for("elevenplus.index"),
        },
    )


@bp.get("/healthz")
def healthz():
    return jsonify({"status": "ok"})


@bp.get("/api/existing-images")
def api_existing_images():
    """Return a random sample of images (default 24, max 100).

    Optional `theme` filters to one theme id (see services/themes.py).
    """
    limit = request.args.get("limit", DEFAULT_IMAGE_LIMIT, type=int)
    limit = max(1, min(limit, MAX_IMAGE_LIMIT))
    theme = _theme_arg(request.args.get("theme"))

    images = get_all_existing_images()
    if theme:
        images = [i for i in images if theme in themes_for(i[1])]
    random.shuffle(images)
    store = enrichment.load_store()
    return jsonify({
        "images": [_payload(u, p, store) for u, p in images[:limit]],
        "total": len(images),
    })


@bp.get("/api/daily")
def api_daily():
    """The same picture for everyone on a given UTC day."""
    images = get_all_existing_images()
    if not images:
        return jsonify({"error": "no images yet"}), 404
    today = datetime.now(timezone.utc).date().isoformat()
    url, prompt = min(
        images,
        key=lambda i: hashlib.sha1(f"{today}:{i[0]}".encode()).hexdigest(),
    )
    return jsonify({**_payload(url, prompt), "date": today})


@bp.post("/api/random-image")
def api_random_image():
    body = request.get_json(silent=True)
    body = body if isinstance(body, dict) else {}
    want_new = body.get("generate_new") is True
    theme = _theme_arg(body.get("theme"))

    existing = get_all_existing_images()
    pool = existing
    if theme:
        pool = [i for i in existing if theme in themes_for(i[1])] or existing
    if pool and not want_new:
        return _random_existing(pool)

    # Generating costs money: enforce per-client and daily limits, and
    # degrade to an existing image rather than failing the kid's click.
    client = request.remote_addr or "unknown"
    if not (_ip_limiter.allow(client) and _daily_cap.acquire()):
        if pool:
            return _random_existing(pool)
        return jsonify({"error": "Please try again later"}), 429

    used = {prompt.lower() for _, prompt in existing}
    prompt = get_unused_prompt(used, theme=theme)
    image_url = generate_image_url(prompt)
    if image_url:
        enrichment.generate_and_store(image_url, prompt)
        return _image_json(image_url, prompt, generated=True)

    if pool:
        return _random_existing(pool)
    return _image_json(random_fallback_url(), prompt, generated=False)


@bp.post("/genseed")
def generate_seed():
    """Admin-only: generate a batch of images.

    Requires ADMIN_TOKEN to be configured and sent as `X-Admin-Token`.
    For large batches prefer the CLI: `flask --app app:create_app seed`.
    """
    expected = os.environ.get("ADMIN_TOKEN", "").encode("utf-8")
    provided = request.headers.get("X-Admin-Token", "").encode("utf-8")
    # Compare bytes: str comparison raises TypeError on non-ASCII input.
    if not expected or not hmac.compare_digest(provided, expected):
        return jsonify({"error": "forbidden"}), 403

    body = request.get_json(silent=True)
    count = body.get("count", 20) if isinstance(body, dict) else 20
    if not isinstance(count, int) or isinstance(count, bool):
        count = 20
    count = max(1, min(count, MAX_SEED_COUNT))

    result = seed_images(count)
    return jsonify({"status": "complete", **result})
