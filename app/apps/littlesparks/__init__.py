"""Little Sparks: play-to-learn games for ages 3-5 (/little-sparks).

Deliberately no analytics and no third-party requests: this area is for
very young children.
"""

from pathlib import Path

from flask import Blueprint, abort, render_template, url_for

from . import data

bp = Blueprint("littlesparks", __name__, url_prefix="/little-sparks")


ART_DIR = Path(__file__).resolve().parents[2] / "static" / "apps" / "littlesparks" / "art"
ART_EXTS = {".png", ".webp", ".jpg", ".jpeg", ".svg", ".gif"}


def available_art() -> dict:
    """Art that exists now; anything missing falls back to the emoji."""
    out = {}
    if ART_DIR.is_dir():
        for p in sorted(ART_DIR.iterdir()):
            if p.suffix.lower() in ART_EXTS:
                out[p.stem] = p.name
    return out


def _page(start_game=None):
    cfg = data.config()
    cfg["art"] = available_art()
    cfg["artBase"] = url_for("static", filename="apps/littlesparks/art/")
    cfg["startGame"] = start_game
    cfg["menuUrl"] = url_for("main.index")
    cfg["pickerUrl"] = url_for("littlesparks.index")
    return render_template("apps/little_sparks.html", config_json=cfg)


@bp.get("/")
def index():
    """The game picker (a calm grid of the seven games)."""
    return _page()


@bp.get("/<game_id>")
def game(game_id):
    """Open straight into one game; used by the main menu channels."""
    if game_id not in {g["id"] for g in data.GAMES}:
        abort(404)
    return _page(game_id)
