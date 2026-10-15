"""Smoke tests for the web app: routes, caching, security headers, PWA files."""

import json
import re

import pytest

from app import create_app

P = "/11plus"


@pytest.fixture(scope="module")
def client():
    return create_app().test_client()


@pytest.mark.parametrize("path", [f"{P}/", f"{P}/stumble", f"{P}/privacy"])
def test_pages_render(client, path):
    r = client.get(path)
    assert r.status_code == 200
    assert "text/html" in r.content_type
    assert b"QUESTION_BANK" not in r.data          # the bank is served separately, not inlined


def test_health(client):
    body = client.get(f"{P}/healthz").get_json()
    assert body["status"] == "ok"
    assert sum(body["questions"].values()) > 1500


def test_question_bank_is_cacheable_javascript(client):
    r = client.get(f"{P}/questions.js")
    assert r.status_code == 200
    assert "immutable" in r.headers["Cache-Control"]
    assert r.data.startswith(b"window.QUESTION_BANK=")
    data = json.loads(r.data[len(b"window.QUESTION_BANK="):-1])
    assert set(data) == {"Maths", "English", "Verbal reasoning", "Non-verbal reasoning"}


def test_pages_reference_versioned_assets(client):
    html = client.get(f'{P}/stumble').get_data(as_text=True)
    for asset in re.findall(r'(?:src|href)="(/11plus/static/[^"]+\.(?:js|css)\?v=[0-9a-f]{10})"', html):
        assert client.get(asset).status_code == 200
    assert "/11plus/questions.js?v=" in html


def test_security_headers(client):
    r = client.get(f"{P}/")
    assert "script-src 'self'" in r.headers["Content-Security-Policy"]
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "no-referrer"


def test_no_third_party_requests_in_pages(client):
    for path in (f"{P}/", f"{P}/stumble", f"{P}/privacy"):
        html = client.get(path).get_data(as_text=True)
        assert not re.findall(r'(?:src|href)="https?://', html), path


def test_manifest_and_icons(client):
    m = client.get(f"{P}/manifest.webmanifest").get_json()
    assert m["display"] == "standalone"
    for icon in m["icons"]:
        assert client.get(icon["src"]).status_code == 200


def test_service_worker(client):
    r = client.get(f"{P}/sw.js")
    assert r.status_code == 200
    assert r.headers["Service-Worker-Allowed"] == "/11plus/"
    body = r.get_data(as_text=True)
    assert 'const CACHE = "spark-' in body
    for path in json.loads(re.search(r"const PRECACHE = (\[.*\]);", body).group(1)):
        assert client.get(path).status_code == 200, path


def test_unknown_route_is_404(client):
    assert client.get("/nope").status_code == 404


def test_character_roster_has_distinct_artwork_and_offline_assets(client):
    html = client.get(f'{P}/stumble').get_data(as_text=True)
    artwork = json.loads(re.search(r"data-character-artwork='([^']+)'", html).group(1))
    assert len(artwork) == 50
    assert len(set(artwork.values())) == 50
    assert artwork['pip'].startswith('/11plus/static/art/runner-pixel-sheet.png?v=')
    sw = client.get(f'{P}/sw.js').get_data(as_text=True)
    precache = json.loads(re.search(r'const PRECACHE = (\[.*\]);', sw).group(1))
    for character, path in artwork.items():
        assert path in precache, character
        response = client.get(path)
        assert response.status_code == 200, character
        assert response.data.startswith(b'\x89PNG\r\n\x1a\n'), character


def test_music_tracks_are_playable_and_available_offline(client):
    html = client.get(f'{P}/stumble').get_data(as_text=True)
    tracks = re.findall(r'data-(?:hill|lab|dusk)="([^"]+)"', html)
    assert len(tracks) == 3
    sw = client.get(f'{P}/sw.js').get_data(as_text=True)
    precache = json.loads(re.search(r'const PRECACHE = (\[.*\]);', sw).group(1))
    for track in tracks:
        assert track in precache
        whole = client.get(track)
        assert whole.mimetype == 'audio/mpeg'
        partial = client.get(track, headers={'Range': 'bytes=0-1023'})
        assert partial.status_code == 206
        assert partial.data == whole.data[:1024]
        assert partial.headers['Content-Range'] == f'bytes 0-1023/{len(whole.data)}'
