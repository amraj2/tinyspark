import hmac
import os
import random

from flask import Blueprint, current_app, jsonify, render_template, request

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


def _image_json(url: str, prompt: str, generated: bool):
    return jsonify(
        {"prompt": prompt, "image_url": url, "generated": generated}
    )


def _random_existing(existing):
    url, prompt = random.choice(existing)
    return _image_json(url, prompt, generated=False)


@bp.get("/")
def index():
    return render_template(
        "index.html",
        title="TinySpark",
        ga_id=current_app.config.get("GA_MEASUREMENT_ID", ""),
    )


@bp.get("/healthz")
def healthz():
    return jsonify({"status": "ok"})


@bp.get("/api/existing-images")
def api_existing_images():
    """Return a random sample of existing images (default 24, max 100)."""
    limit = request.args.get("limit", DEFAULT_IMAGE_LIMIT, type=int)
    limit = max(1, min(limit, MAX_IMAGE_LIMIT))

    images = get_all_existing_images()
    random.shuffle(images)
    return jsonify({
        "images": [
            {"url": url, "prompt": prompt} for url, prompt in images[:limit]
        ],
        "total": len(images),
    })


@bp.post("/api/random-image")
def api_random_image():
    body = request.get_json(silent=True)
    want_new = isinstance(body, dict) and body.get("generate_new") is True

    existing = get_all_existing_images()
    if existing and not want_new:
        return _random_existing(existing)

    # Generating costs money: enforce per-client and daily limits, and
    # degrade to an existing image rather than failing the kid's click.
    client = request.remote_addr or "unknown"
    if not (_ip_limiter.allow(client) and _daily_cap.acquire()):
        if existing:
            return _random_existing(existing)
        return jsonify({"error": "Please try again later"}), 429

    used = {prompt.lower() for _, prompt in existing}
    prompt = get_unused_prompt(used)
    image_url = generate_image_url(prompt)
    if image_url:
        return _image_json(image_url, prompt, generated=True)

    if existing:
        return _random_existing(existing)
    return _image_json(random_fallback_url(), prompt, generated=False)


@bp.post("/genseed")
def generate_seed():
    """Admin-only: generate a batch of images.

    Requires ADMIN_TOKEN to be configured and sent as `X-Admin-Token`.
    For large batches prefer the CLI: `flask --app app:create_app seed`.
    """
    expected = os.environ.get("ADMIN_TOKEN", "")
    provided = request.headers.get("X-Admin-Token", "")
    if not expected or not hmac.compare_digest(provided, expected):
        return jsonify({"error": "forbidden"}), 403

    body = request.get_json(silent=True)
    count = body.get("count", 20) if isinstance(body, dict) else 20
    if not isinstance(count, int) or isinstance(count, bool):
        count = 20
    count = max(1, min(count, MAX_SEED_COUNT))

    result = seed_images(count)
    return jsonify({"status": "complete", **result})
