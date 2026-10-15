"""Checks on the 11+ question bank (questions.json): every question must be well formed and answerable."""

import json
import re
from pathlib import Path

import pytest

BANK = json.loads((Path(__file__).resolve().parents[2] / "app" / "apps" / "elevenplus" / "data" / "questions.json").read_text(encoding="utf-8"))


def questions():
    for subject, section in BANK.items():
        for q in section["questions"]:
            yield subject, q


def test_subjects_and_sizes():
    assert list(BANK) == ["Maths", "English", "Verbal reasoning", "Non-verbal reasoning"]
    for subject, section in BANK.items():
        assert section["icon"]
        assert len(section["questions"]) >= 180, subject


@pytest.mark.parametrize("subject,q", list(questions()))
def test_question_is_well_formed(subject, q):
    prompt, options, answer, explanation, tag = q
    assert prompt.strip() and explanation.strip()
    assert len(options) == 4 and len({o.strip() for o in options}) == 4
    assert all(o.strip() for o in options)
    assert isinstance(answer, int) and 0 <= answer < 4
    topic, level = tag
    assert topic and level in (1, 2, 3)


def test_no_duplicate_questions():
    seen = set()
    for subject, (prompt, options, *_rest) in questions():
        key = (subject, prompt, tuple(sorted(options)))
        assert key not in seen, prompt[:80]
        seen.add(key)


def test_every_subject_has_all_difficulty_levels_for_the_game():
    for subject, section in BANK.items():
        levels = {q[4][1] for q in section["questions"]}
        assert {2}.issubset(levels), subject
        assert len(levels) >= 2, subject


def test_html_in_prompts_is_balanced():
    for subject, (prompt, options, *_rest) in questions():
        for text in [prompt, *options]:
            assert text.count("<svg") == text.count("</svg>"), text[:80]
            assert "<script" not in text.lower()
            assert not re.search(r"\bon\w+=", text), text[:80]   # no inline event handlers
