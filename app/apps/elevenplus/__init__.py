"""Tiny Spark 11+ Examinator, mounted as an app under /11plus."""

import functools
import hashlib
import json
from pathlib import Path

from flask import Blueprint, Response, jsonify, render_template, url_for

BASE_DIR = Path(__file__).resolve().parent
URL_PREFIX = "/11plus"

# Everything these pages need is same-origin: no third-party scripts, fonts,
# analytics or trackers. The CSP is applied to this blueprint only.
CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data:; connect-src 'self'; manifest-src 'self'; "
    "worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; "
    "form-action 'none'"
)

bp = Blueprint(
    "elevenplus",
    __name__,
    url_prefix=URL_PREFIX,
    static_folder="static",
    static_url_path="/static",
    template_folder="templates",
)


def _digest(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()[:10]


@functools.lru_cache(maxsize=1)
def _bank():
    """Question bank, its JS payload and content version (loaded lazily)."""
    raw = (BASE_DIR / "data" / "questions.json").read_bytes()
    bank = json.loads(raw)
    js = (
        "window.QUESTION_BANK="
        + json.dumps(bank, ensure_ascii=False, separators=(",", ":"))
        + ";"
    ).encode("utf-8")
    return bank, js, _digest(js)


@functools.lru_cache(maxsize=None)
def static_v(filename: str) -> str:
    """Static URL with a content hash so it can be cached for a long time."""
    digest = _digest((BASE_DIR / "static" / filename).read_bytes())
    return url_for("elevenplus.static", filename=filename, v=digest)


def _characters():
    return sorted((BASE_DIR / "static" / "art" / "characters").glob("*.png"))


@bp.context_processor
def _inject():
    return {"static_v": static_v, "bank_version": _bank()[2]}


@bp.after_request
def _secure(resp):
    resp.headers.setdefault("Content-Security-Policy", CSP)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    resp.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), "
        "interest-cohort=()",
    )
    if resp.mimetype == "text/html":
        resp.headers.setdefault("Cache-Control", "no-cache")
    return resp


@bp.get("/")
def index():
    return render_template("elevenplus/index.html")


@bp.get("/stumble")
def stumble():
    artwork = {"pip": static_v("art/runner-pixel-sheet.png")}
    artwork.update(
        {p.stem: static_v(f"art/characters/{p.name}") for p in _characters()}
    )
    return render_template("elevenplus/stumble.html", character_artwork=artwork)


@bp.get("/privacy")
def privacy():
    return render_template("elevenplus/privacy.html")


@bp.get("/questions.js")
def questions_js():
    resp = Response(_bank()[1], mimetype="text/javascript")
    resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return resp


@bp.get("/sw.js")
def service_worker():
    bank_version = _bank()[2]
    precache = [
        url_for("elevenplus.index"),
        url_for("elevenplus.stumble"),
        url_for("elevenplus.privacy"),
        url_for("elevenplus.questions_js", v=bank_version),
        static_v("style.css"),
        static_v("practice.js"),
        static_v("pwa.js"),
        static_v("stumble.css"),
        static_v("stumble.js"),
        static_v("art/runner-pixel-sheet.png"),
        static_v("art/world-pixel-atlas.png"),
        static_v("pixel.css"),
        static_v("art/pixel-logo.svg"),
        static_v("audio/sunny-overworld.mp3"),
        static_v("audio/ascension-run.mp3"),
        static_v("audio/dusk-arpeggio.mp3"),
        url_for("elevenplus.manifest"),
        url_for("elevenplus.static", filename="icons/icon-192.png"),
    ]
    precache.extend(static_v(f"art/characters/{p.name}") for p in _characters())
    cache_name = "spark-" + _digest((bank_version + "".join(precache)).encode())
    body = render_template(
        "elevenplus/sw.js",
        cache_name=cache_name,
        precache=json.dumps(precache),
        base=URL_PREFIX,
    )
    resp = Response(body, mimetype="text/javascript")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["Service-Worker-Allowed"] = URL_PREFIX + "/"
    return resp


@bp.get("/manifest.webmanifest")
def manifest():
    def icon(name, size, purpose):
        return {
            "src": url_for("elevenplus.static", filename=f"icons/{name}"),
            "sizes": f"{size}x{size}",
            "type": "image/png",
            "purpose": purpose,
        }

    data = {
        "name": "Tiny Spark 11+ Examinator",
        "short_name": "Tiny Spark",
        "id": URL_PREFIX + "/",
        "start_url": url_for("elevenplus.stumble"),
        "scope": URL_PREFIX + "/",
        "display": "standalone",
        "orientation": "any",
        "background_color": "#5b2bd6",
        "theme_color": "#5b2bd6",
        "description": (
            "Short, friendly 11+ practice in English, maths, verbal and "
            "non-verbal reasoning, plus the Spark Stumble race game."
        ),
        "icons": [
            icon("icon-192.png", 192, "any"),
            icon("icon-512.png", 512, "any"),
            icon("maskable-512.png", 512, "maskable"),
        ],
    }
    resp = Response(json.dumps(data), mimetype="application/manifest+json")
    resp.headers["Cache-Control"] = "public, max-age=3600"
    return resp


@bp.get("/healthz")
def healthz():
    bank, _, version = _bank()
    return jsonify(
        status="ok",
        questions={k: len(v["questions"]) for k, v in bank.items()},
        version=version,
    )
