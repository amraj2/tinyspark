import json
import struct
import zlib

from app import routes
from app.services import image_service, prompts
from app.services.limits import DailyCap, RateLimiter


def _png() -> bytes:
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d))

    return (
        image_service.PNG_SIGNATURE
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(b"\x00\xff\x00\x00"))
        + chunk(b"IEND", b"")
    )


def test_health(client):
    assert client.get("/healthz").get_json() == {"status": "ok"}


def test_home_lists_apps_and_links_to_story_starter(client):
    html = client.get("/").data.decode()
    assert "Story Starter" in html
    assert 'href="/story-starter"' in html
    for href in ("/word-wizard/", "/doodle-quest/", "/rhyme-time/"):
        assert f'href="{href}"' in html
    assert "Coming soon" not in html
    # 11+ and the Stumble race are separate adventures
    assert 'href="/11plus/"' in html and 'href="/11plus/stumble"' in html
    assert 'data-title="Spark Stumble Race"' in html
    assert 'data-title="11+ Examinator"' in html


def test_home_links_to_elevenplus_and_it_is_isolated(client):
    assert 'href="/11plus/"' in client.get("/").data.decode()
    r = client.get("/11plus/")
    assert r.status_code == 200
    html = r.data.decode()
    assert "googletagmanager" not in html          # 11+ app stays tracker-free
    assert "script-src 'self'" in r.headers["Content-Security-Policy"]
    assert 'href="/"' in html                      # link back to the hub
    # the hub keeps its own (CSP-free) behaviour
    assert "Content-Security-Policy" not in client.get("/").headers


def test_story_starter_renders(client):
    r = client.get("/story-starter")
    assert r.status_code == 200
    assert b"Cloud Harbour" in r.data and b"Moonwood" in r.data
    assert b"Tideglass Cove" in r.data and b"Your chapter" in r.data


def test_genseed_forbidden_without_token(client, monkeypatch):
    monkeypatch.delenv("ADMIN_TOKEN", raising=False)
    assert client.post("/genseed").status_code == 403
    monkeypatch.setenv("ADMIN_TOKEN", "secret")
    assert client.post("/genseed").status_code == 403
    r = client.post("/genseed", headers={"X-Admin-Token": "wrong"})
    assert r.status_code == 403


def test_genseed_with_token_stops_without_api_key(client, monkeypatch):
    monkeypatch.setenv("ADMIN_TOKEN", "secret")
    r = client.post(
        "/genseed", headers={"X-Admin-Token": "secret"}, json={"count": 5}
    )
    assert r.status_code == 200
    assert r.get_json()["generated"] == 0


def test_random_image_malformed_body(client):
    r = client.post(
        "/api/random-image", data="not json",
        content_type="application/json",
    )
    assert r.status_code == 200
    assert r.get_json()["image_url"]


def test_existing_image_roundtrip_keeps_exact_prompt(gen_dir):
    prompt = "A star-shaped kite, over Mary's hill!"
    name = image_service._filename_for(prompt)
    (gen_dir / name).write_bytes(_png())
    image_service._record_prompt(name, prompt)
    assert image_service.get_all_existing_images() == [
        (f"/static/generated/{name}", prompt)
    ]


def test_similar_prompts_do_not_collide():
    a = image_service._filename_for("a cat, in a hat")
    b = image_service._filename_for("a cat in a hat")
    assert a != b


def test_download_rejects_non_png(gen_dir, monkeypatch, tmp_path):
    bad = tmp_path / "bad.bin"
    bad.write_bytes(b"<html>nope</html>")
    out = image_service._download_and_save_image(bad.as_uri(), "p")
    assert out is None
    assert not list(gen_dir.glob("*.png"))


def test_download_saves_png_atomically(gen_dir, tmp_path):
    src = tmp_path / "src.bin"
    src.write_bytes(_png())
    out = image_service._download_and_save_image(src.as_uri(), "a dragon")
    assert out and out.startswith("/static/generated/")
    assert len(list(gen_dir.glob("*.png"))) == 1
    assert not list(gen_dir.glob("*.tmp"))


def test_generation_limited_falls_back_to_existing(
    client, gen_dir, monkeypatch
):
    name = image_service._filename_for("old image")
    (gen_dir / name).write_bytes(_png())
    image_service._record_prompt(name, "old image")
    monkeypatch.setattr(routes, "_ip_limiter", RateLimiter(0, 3600))
    r = client.post("/api/random-image", json={"generate_new": True})
    body = r.get_json()
    assert r.status_code == 200
    assert body["generated"] is False
    assert body["prompt"] == "old image"


def test_generation_limited_without_images_is_429(client, monkeypatch):
    monkeypatch.setattr(routes, "_daily_cap", DailyCap(0))
    r = client.post("/api/random-image", json={"generate_new": True})
    assert r.status_code == 429


def test_rate_limiter_window():
    rl = RateLimiter(2, 3600)
    assert rl.allow("a") and rl.allow("a") and not rl.allow("a")
    assert rl.allow("b")


def test_unused_prompt_skips_used():
    used = {p.lower() for p in prompts.KID_SAFE_THEMES[1:]}
    assert prompts.get_unused_prompt(used) == prompts.KID_SAFE_THEMES[0]


def test_moderation_fails_closed():
    class Boom:
        class moderations:
            @staticmethod
            def create(**_):
                raise RuntimeError("down")

    assert prompts.is_prompt_safe(Boom, "hello") is False


def _seed_image(gen_dir, prompt):
    name = image_service._filename_for(prompt)
    (gen_dir / name).write_bytes(_png())
    image_service._record_prompt(name, prompt)
    return f"/static/generated/{name}"


def test_images_include_themes_questions_and_words(client, gen_dir):
    _seed_image(gen_dir, "a shy fox finding a tiny door at the bottom of a tree")
    img = client.get("/api/existing-images").get_json()["images"][0]
    assert "animals" in img["themes"]
    assert len(img["questions"]) == 3
    assert len(img["words"]) == 4 and {"word", "meaning"} <= set(img["words"][0])


def test_theme_filter(client, gen_dir):
    _seed_image(gen_dir, "a shy fox finding a tiny door at the bottom of a tree")
    _seed_image(gen_dir, "a small robot discovering a glowing flower")
    r = client.get("/api/existing-images?theme=space").get_json()
    assert [i["prompt"] for i in r["images"]] == [
        "a small robot discovering a glowing flower"
    ]
    # unknown themes are ignored rather than erroring
    assert client.get("/api/existing-images?theme=nope").get_json()["total"] == 2


def test_daily_is_stable_and_404_when_empty(client, gen_dir):
    assert client.get("/api/daily").status_code == 404
    for p in ("one old story", "two old story", "three old story"):
        _seed_image(gen_dir, p)
    a = client.get("/api/daily").get_json()
    b = client.get("/api/daily").get_json()
    assert a["url"] == b["url"] and a["date"]


def test_stored_enrichment_is_used_and_bad_data_falls_back(gen_dir):
    from app.services import enrichment

    url = _seed_image(gen_dir, "a dragon baking bread")
    name = url.rsplit("/", 1)[-1]
    good = {"questions": ["Q1?"], "words": [{"word": "toasty", "meaning": "warm"}]}
    (gen_dir / enrichment.ENRICHMENT_NAME).write_text(json.dumps({name: good}))
    assert enrichment.details_for(url, "a dragon baking bread") == good
    (gen_dir / enrichment.ENRICHMENT_NAME).write_text(json.dumps({name: {"x": 1}}))
    assert enrichment.details_for(url, "a dragon baking bread")["questions"]


def test_themes_default_to_everyday():
    from app.services.themes import themes_for

    assert themes_for("xyzzy") == ["everyday"]
    assert "space" in themes_for("A ROBOT in a rocket")


def test_story_page_ships_config_and_script(client):
    html = client.get("/story-starter").data.decode()
    assert 'id="app-config"' in html and "/console/story.js" in html
    assert 'href="/"' in html  # game exits back to the adventure hub


def test_genseed_non_ascii_token_is_403_not_500(client, monkeypatch):
    monkeypatch.setenv("ADMIN_TOKEN", "secret")
    r = client.post("/genseed", headers={"X-Admin-Token": "s\u00e9cret"})
    assert r.status_code == 403


def test_generate_image_url_saves_base64_result(gen_dir, monkeypatch):
    png = _png()
    monkeypatch.setattr(image_service, "_openai_generate_image", lambda p: png)
    url = image_service.generate_image_url("a friendly whale")
    assert url and url.startswith("/static/generated/")
    saved = list(gen_dir.glob("*.png"))
    assert len(saved) == 1 and saved[0].read_bytes() == png


def test_generate_image_url_rejects_non_png_bytes(gen_dir, monkeypatch):
    monkeypatch.setattr(image_service, "_openai_generate_image", lambda p: b"nope")
    assert image_service.generate_image_url("a friendly whale") is None
    assert not list(gen_dir.glob("*.png"))


def test_default_quality_matches_model_family():
    assert image_service._default_quality("gpt-image-1-mini") == "medium"
    assert image_service._default_quality("dall-e-3") == "standard"


def test_saved_files_are_world_readable(gen_dir):
    import stat

    name = image_service._filename_for("a readable whale")
    image_service._save_image_bytes(_png(), "a readable whale")
    mode = stat.S_IMODE((gen_dir / name).stat().st_mode)
    assert mode == 0o644
    assert stat.S_IMODE((gen_dir / "index.json").stat().st_mode) == 0o644
