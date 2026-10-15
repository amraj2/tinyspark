"""Rhyme Time: find rhymes, play the rhyme game, build silly poems.

Mounted at /rhyme-time. Rhyme data is curated in `data.py`; no external
service is used.
"""

import random

from flask import Blueprint, jsonify, render_template, request

from .data import do_rhyme, find_rhymes, make_quiz

bp = Blueprint("rhymetime", __name__, url_prefix="/rhyme-time")


@bp.get("/")
def index():
    return render_template(
        "apps/rhyme_time.html",
        app_name="Rhyme Time",
        app_tagline="Find rhymes and make silly poems",
        config_json={},
    )


@bp.get("/api/rhymes")
def api_rhymes():
    word = request.args.get("word", "", type=str)[:40]
    rhymes, known = find_rhymes(word)
    return jsonify({"word": word, "rhymes": rhymes, "known": known})


@bp.get("/api/check")
def api_check():
    a = request.args.get("a", "", type=str)[:40]
    b = request.args.get("b", "", type=str)[:40]
    return jsonify({"rhymes": do_rhyme(a, b)})


@bp.get("/api/quiz")
def api_quiz():
    return jsonify(make_quiz(random.Random()))
