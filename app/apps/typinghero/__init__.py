"""Typing Hero: a rhythm game that teaches touch typing (/typing-hero)."""

import os
from pathlib import Path

from flask import Blueprint, render_template, request, url_for

from . import data

bp = Blueprint("typinghero", __name__, url_prefix="/typing-hero")


ART_DIR = Path(__file__).resolve().parents[2] / "static" / "apps" / "typinghero" / "art"
ART_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"}


def available_art() -> dict:
    """Art files that exist now; missing ones fall back to built-in drawing."""
    out = {}
    if ART_DIR.is_dir():
        for p in sorted(ART_DIR.iterdir()):
            if p.suffix.lower() in ART_EXTS:
                out[p.stem] = p.name
    return out


@bp.get("/")
def index():
    return render_template(
        "apps/typing_hero.html",
        app_name="Typing Hero",
        selftest="selftest" in request.args,
        config_json={
            "artBase": url_for("static", filename="apps/typinghero/art/"),
            "art": available_art(),
            "laneOrder": data.LANE_ORDER,
            "fingerNames": data.FINGER_NAMES,
            "fingerKeys": data.FINGER_KEYS,
            "shifted": data.SHIFTED,
            "rows": data.KEYBOARD_ROWS,
            "worlds": data.worlds_meta(),
            "levels": data.build_levels(),
            "words": data.WORDS,
            "sentences": {str(k): v for k, v in data.SENTENCES.items()},
        },
    )
