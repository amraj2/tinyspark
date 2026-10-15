import re

import pytest

from app import create_app
from app.apps.littlesparks import data


@pytest.fixture(scope="module")
def client():
    return create_app().test_client()


def test_page_renders_without_analytics_or_third_parties(client):
    r = client.get("/little-sparks/")
    assert r.status_code == 200
    html = r.data.decode()
    assert 'id="ls-config"' in html and 'id="lsCanvas"' in html
    assert "googletagmanager" not in html
    assert "consentBanner" not in html
    assert not re.findall(r'(?:src|href)="https?://', html)


def test_all_scripts_are_served(client):
    html = client.get("/little-sparks/").data.decode()
    for src in re.findall(r'src="(/static/apps/littlesparks/[^"]+)"', html):
        assert client.get(src).status_code == 200, src
    assert client.get("/static/apps/littlesparks/littlesparks.css").status_code == 200


def test_hub_lists_each_game_as_its_own_channel(client):
    html = client.get("/").data.decode()
    for g in data.GAMES:
        assert f'href="/little-sparks/{g["id"]}"' in html, g["id"]
        assert f'data-title="{g["title"]}"' in html
    assert html.count('data-min-age="3"') == len(data.GAMES)
    assert 'data-max-age="5"' in html
    assert '<option value="4">' in html
    # the single bundled channel is gone
    assert 'href="/little-sparks/"' not in html


def test_channels_use_cover_art_when_it_exists(tmp_path, monkeypatch):
    from app.apps import littlesparks

    (tmp_path / "game-roly.png").write_bytes(b"x")
    monkeypatch.setattr(littlesparks, "ART_DIR", tmp_path)
    html = create_app().test_client().get("/").data.decode()
    assert "apps/littlesparks/art/game-roly.png" in html
    # games without art show an emoji tile instead
    assert "cover-fallback" in html and "cover-emoji" in html


def test_deep_links_start_the_game_and_unknown_ids_404(client):
    for g in data.GAMES:
        r = client.get(f"/little-sparks/{g['id']}")
        assert r.status_code == 200
        assert f'"startGame": "{g["id"]}"' in r.data.decode()
    assert client.get("/little-sparks/nope").status_code == 404
    picker = client.get("/little-sparks/").data.decode()
    assert '"startGame": null' in picker


def test_every_game_has_stickers_and_unique_ids():
    ids = [s["id"] for s in data.STICKERS]
    assert len(ids) == len(set(ids))
    games = {g["id"] for g in data.GAMES}
    assert {s["game"] for s in data.STICKERS} == games
    for g in games:
        assert sum(1 for s in data.STICKERS if s["game"] == g) == 4


def test_every_emoji_has_an_art_name():
    emojis = set()
    emojis |= {t["e"] for t in data.ROLY_ITEMS}
    emojis |= {t["e"] for t in data.BUG_TYPES}
    for c in data.SORT_COLOURS:
        emojis |= set(c["items"])
    emojis |= {f["e"] for f in data.DINER_FOODS}
    emojis |= {c["e"] for c in data.DINER_CUSTOMERS}
    emojis |= {p["e"] for p in data.BEAT_PADS}
    for p in data.GARDEN_PLANTS:
        emojis |= set(p["stages"]) | {p["seed"]}
    for lvl in data.CHOO_LEVELS:
        emojis |= set(lvl["friends"].values())
    emojis |= {"\U0001F682", "\U0001F689", "\U0001F6A7"}
    missing = emojis - set(data.ART_NAMES)
    assert not missing, missing
    assert len(set(data.ART_NAMES.values())) == len(data.ART_NAMES)


def test_roly_goal_is_reachable():
    # the ball can absorb enough area to fit the goal item (see roly.js)
    start_r, fit, growth = 26, 0.92, 0.6
    goal = next(t for t in data.ROLY_ITEMS if t.get("goal"))
    need_r = goal["r"] / fit
    area = start_r**2
    for t in data.ROLY_ITEMS:
        if t.get("goal"):
            continue
        area += growth * t["n"] * t["r"] ** 2
    assert area ** 0.5 > need_r * 1.5
    # smallest items are small enough to start with
    assert min(t["r"] for t in data.ROLY_ITEMS) <= start_r * fit


def test_bug_and_diner_vocabulary_is_speakable():
    for b in data.BUG_TYPES:
        assert b["one"].isalpha() and b["many"].isalpha()
    for f in data.DINER_FOODS:
        assert f["one"].isalpha() and f["many"].isalpha()
    assert len(data.DINER_FOODS) >= 5 and len(data.DINER_CUSTOMERS) >= 4


@pytest.mark.parametrize("level", data.CHOO_LEVELS, ids=lambda l: l["name"])
def test_choo_levels_are_solvable_and_finite(level):
    out, junctions = data.choo_graph(level)
    nodes = level["nodes"]
    assert level["start"] in nodes and len(out[level["start"]]) == 1
    assert junctions, "every level needs at least one choice"
    for a, b in level["edges"]:
        assert a in nodes and b in nodes
    for x, y in nodes.values():
        assert 40 <= x <= 960 and 40 <= y <= 600

    # acyclic: DFS with colouring
    state = {}

    def dfs(n):
        state[n] = 1
        for m in out[n]:
            assert state.get(m) != 1, f"cycle through {m}"
            if m not in state:
                dfs(m)
        state[n] = 2

    dfs(level["start"])

    # terminals are stations or dead ends; at least one station is reachable
    terminals = [n for n in nodes if not out[n]]
    assert set(level["stations"]) <= set(terminals)
    reachable = set()

    def reach(n):
        reachable.add(n)
        for m in out[n]:
            if m not in reachable:
                reach(m)

    reach(level["start"])
    assert set(level["stations"]) & reachable
    assert reachable == set(nodes), "unreachable nodes"
    # a wrong turn to learn from (a dead end), unless the choice is about
    # which route collects the friends
    assert any(t not in level["stations"] for t in terminals) or level["friends"]
    # passengers wait on real, non-terminal... nodes
    for node in level["friends"]:
        assert node in nodes


def test_choo_friend_levels_can_collect_everyone():
    for level in data.CHOO_LEVELS:
        if not level["friends"]:
            continue
        out, _ = data.choo_graph(level)
        best = 0

        def walk(n, got):
            nonlocal best
            got = got | ({n} if n in level["friends"] else set())
            if n in level["stations"]:
                best = max(best, len(got))
            for m in out[n]:
                walk(m, got)

        walk(level["start"], set())
        assert best == len(level["friends"]), level["name"]


def test_beats_and_garden_content():
    assert len(data.BEAT_PADS) == 4
    assert len({p["note"] for p in data.BEAT_PADS}) == 4
    for p in data.GARDEN_PLANTS:
        assert len(p["stages"]) == 4


def test_available_art_lists_only_existing_images(tmp_path, monkeypatch):
    from app.apps import littlesparks

    (tmp_path / "ant.png").write_bytes(b"x")
    (tmp_path / "ART.md").write_text("x")
    monkeypatch.setattr(littlesparks, "ART_DIR", tmp_path)
    assert littlesparks.available_art() == {"ant": "ant.png"}
