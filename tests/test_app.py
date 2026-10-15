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
    assert "Coming soon" in html


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
    assert b"generateBtn" in r.data


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
