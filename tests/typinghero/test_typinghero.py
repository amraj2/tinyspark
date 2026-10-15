import pytest

from app import create_app
from app.apps.typinghero import data


@pytest.fixture(scope="module")
def client():
    return create_app().test_client()


def test_page_renders_with_config_and_scripts(client):
    r = client.get("/typing-hero/")
    assert r.status_code == 200
    html = r.data.decode()
    for name in ("core.js", "audio.js", "art.js", "game.js", "ui.js"):
        assert name in html
    assert 'id="th-config"' in html and 'id="scPlay"' in html
    assert "selftest.js" not in html
    assert "selftest.js" in client.get("/typing-hero/?selftest=1").data.decode()


def test_static_assets_served(client):
    for f in ("core.js", "audio.js", "art.js", "game.js", "ui.js", "typinghero.css"):
        assert client.get(f"/static/apps/typinghero/{f}").status_code == 200


def test_hub_links_typing_hero(client):
    html = client.get("/").data.decode()
    assert 'href="/typing-hero/"' in html


def test_every_letter_has_exactly_one_finger():
    owners = {}
    for finger, keys in data.FINGER_KEYS.items():
        for k in keys:
            assert k not in owners, f"{k} assigned twice"
            owners[k] = finger
    for c in "abcdefghijklmnopqrstuvwxyz":
        assert c in owners
    assert set(data.LANE_ORDER) == set(data.FINGER_KEYS)


def test_home_row_matches_touch_typing_convention():
    fk = data.FINGER_KEYS
    assert fk["lp"].startswith("qaz") and "a" in fk["lp"]
    assert "f" in fk["li"] and "j" in fk["ri"]
    assert "d" in fk["lm"] and "k" in fk["rm"]
    assert "s" in fk["lr"] and "l" in fk["rr"]
    assert ";" in fk["rp"]


@pytest.fixture(scope="module")
def levels():
    return data.build_levels()


def test_level_ids_unique_and_chain_resolves(levels):
    ids = [l["id"] for l in levels]
    assert len(ids) == len(set(ids))
    for l in levels:
        assert l["requires"] is None or l["requires"] in ids
        # you can only be required to pass a level that comes earlier
        if l["requires"]:
            assert ids.index(l["requires"]) < ids.index(l["id"])


def test_first_level_is_open_and_home_row_first(levels):
    first = levels[0]
    assert first["requires"] is None
    assert set(first["focus"]) == set("asdf")


def test_focus_keys_belong_to_level_and_new_keys_are_introduced_once(levels):
    seen = set()
    for l in levels:
        if l["optional"] or l["mode"] != "notes":
            continue
        assert set(l["focus"]) <= set(l["keys"]), l["id"]
        for k in l["focus"]:
            assert k not in seen, f"{k} introduced twice ({l['id']})"
            seen.add(k)


def test_all_letters_are_taught_before_word_rock(levels):
    taught = set()
    for l in levels:
        if l["world"] < 9:
            taught |= set(l["keys"])
    assert set("abcdefghijklmnopqrstuvwxyz") <= taught


def test_levels_only_use_typable_keys(levels):
    known = set("".join(data.FINGER_KEYS.values())) | set(data.SHIFTED)
    for l in levels:
        for k in l["keys"]:
            assert k.lower() in known or k in data.SHIFTED, (l["id"], k)


def test_word_levels_have_enough_words(levels):
    for l in levels:
        if l["mode"] == "words":
            assert len(l["pool"]) >= 12, (l["id"], len(l["pool"]))
            letters = {k for k in l["keys"] if k.isalpha() and k.islower()}
            assert all(set(w) <= letters for w in l["pool"])


def test_sentences_are_typable_with_taught_keys():
    allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ .,'!?")
    for tier, lines in data.SENTENCES.items():
        assert len(lines) >= 5
        for s in lines:
            assert set(s) <= allowed, (tier, s)


def test_pass_difficulty_rises_gently(levels):
    bpms = [l["bpm"] for l in levels if l["mode"] == "notes" and l["world"] <= 6 and not l["boss"]]
    assert bpms == sorted(bpms)
    assert bpms[0] <= 66 and max(bpms) <= 100  # kids' first songs stay slow


def test_available_art_lists_only_existing_images(tmp_path, monkeypatch):
    from app.apps import typinghero

    (tmp_path / "stage.png").write_bytes(b"x")
    (tmp_path / "notes.txt").write_text("x")
    monkeypatch.setattr(typinghero, "ART_DIR", tmp_path)
    assert typinghero.available_art() == {"stage": "stage.png"}
