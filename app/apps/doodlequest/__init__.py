"""Doodle Quest: a daily drawing challenge (mounted at /doodle-quest)."""

from flask import Blueprint, render_template

from .data import PROMPTS, TWISTS

bp = Blueprint("doodlequest", __name__, url_prefix="/doodle-quest")


@bp.get("/")
def index():
    return render_template(
        "apps/doodle_quest.html",
        app_name="Doodle Quest",
        app_tagline="A new drawing challenge every day",
        config_json={"prompts": PROMPTS, "twists": TWISTS},
    )
