import random

import pytest

from app import create_app
from app.apps.doodlequest.data import PROMPTS, TWISTS
from app.apps.rhymetime import data as rhyme
from app.apps.wordwizard.data import LEVEL_NAMES, word_bank


@pytest.fixture(scope="module")
def client():
    return create_app().test_client()


@pytest.mark.parametrize(
    "path", ["/word-wizard/", "/doodle-quest/", "/rhyme-time/"]
)
def test_pages_render_with_shell(client, path):
    r = client.get(path)
    assert r.status_code == 200
    html = r.data.decode()
    assert 'id="app-config"' in html and "shared.js" in html
    assert 'href="/"' in html  # back to the hub


# ----- Word Wizard -----
def test_word_bank_is_well_formed():
    bank = word_bank()
    assert {w["level"] for w in bank} == set(LEVEL_NAMES)
    words = [w["word"] for w in bank]
    assert len(words) == len(set(words))
    for w in bank:
        assert w["word"] == w["word"].lower() and w["word"].isalpha()
        assert w["word"] in w["example"].lower(), w["word"]
        assert len(w["meaning"]) > 5
    for level in LEVEL_NAMES:
        # a quiz needs one answer plus three distractors from the level
        assert sum(1 for w in bank if w["level"] == level) >= 12


# ----- Doodle Quest -----
def test_doodle_content():
    assert len(PROMPTS) >= 30 and len(set(PROMPTS)) == len(PROMPTS)
    assert len(TWISTS) >= 5


# ----- Rhyme Time -----
def test_rhymes_for_known_word(client):
    body = client.get("/rhyme-time/api/rhymes?word=Cat").get_json()
    assert body["known"] is True
    assert "hat" in body["rhymes"] and "cat" not in body["rhymes"]


def test_rhymes_unknown_word_uses_ending(client):
    body = client.get("/rhyme-time/api/rhymes?word=wombat").get_json()
    assert body["known"] is False
    assert "cat" in body["rhymes"]


def test_rhymes_nonsense_and_empty(client):
    assert client.get("/rhyme-time/api/rhymes?word=").get_json()["rhymes"] == []
    assert client.get("/rhyme-time/api/rhymes?word=qzx").get_json()["rhymes"] == []


def test_check_pairs(client):
    ok = client.get("/rhyme-time/api/check?a=night&b=kite").get_json()
    assert ok["rhymes"] is True
    no = client.get("/rhyme-time/api/check?a=cat&b=dog").get_json()
    assert no["rhymes"] is False


def test_families_have_no_duplicates_within_a_family():
    for fam in rhyme.FAMILIES:
        assert len(fam) == len(set(fam)), fam
        assert all(w.isalpha() and w == w.lower() for w in fam)


def test_quiz_has_exactly_one_rhyme_option():
    for seed in range(200):
        q = rhyme.make_quiz(random.Random(seed))
        assert len(q["options"]) == 3 and q["answer"] in q["options"]
        rhyming = [o for o in q["options"] if rhyme.do_rhyme(q["target"], o)]
        assert rhyming == [q["answer"]], (seed, q)
