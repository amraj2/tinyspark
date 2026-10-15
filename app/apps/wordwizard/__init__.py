"""Word Wizard: a vocabulary spell-casting game (mounted at /word-wizard)."""

from flask import Blueprint, render_template

from .data import LEVEL_NAMES, word_bank

bp = Blueprint("wordwizard", __name__, url_prefix="/word-wizard")


@bp.get("/")
def index():
    return render_template(
        "apps/word_wizard.html",
        app_name="Word Wizard",
        app_tagline="Learn new words and cast your spells",
        config_json={
            "words": word_bank(),
            "levelNames": {str(k): v for k, v in LEVEL_NAMES.items()},
        },
    )
