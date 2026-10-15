import hashlib
import json
import logging
import os
import random
import re
import tempfile
import threading
import urllib.request
from pathlib import Path
from typing import Optional


FALLBACK_URLS = [
    (
        "https://images.unsplash.com/photo-1502083728181-687546e776ad"
        "?q=80&w=1200&auto=format&fit=crop"
    ),
    (
        "https://images.unsplash.com/photo-1490902931801-d6f80ca94fe1"
        "?q=80&w=1200&auto=format&fit=crop"
    ),
    (
        "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d"
        "?q=80&w=1200&auto=format&fit=crop"
    ),
    (
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e"
        "?q=80&w=1200&auto=format&fit=crop"
    ),
    (
        "https://images.unsplash.com/photo-1519681393784-d120267933ba"
        "?q=80&w=1200&auto=format&fit=crop"
    ),
]


logger = logging.getLogger(__name__)

# Directory to save generated images, plus a JSON index mapping
# filename -> exact prompt (so prompts never have to be recovered
# from filenames).
GENERATED_IMAGES_DIR = Path(__file__).parent.parent / "static" / "generated"
INDEX_NAME = "index.json"

MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

_index_lock = threading.Lock()


def _slug(prompt: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", prompt.lower())
    slug = re.sub(r"[-\s]+", "-", slug).strip("-")
    return slug[:80].strip("-") or "image"


def _filename_for(prompt: str) -> str:
    """Slug plus a short hash so different prompts never collide."""
    digest = hashlib.sha1(prompt.lower().encode("utf-8")).hexdigest()[:8]
    return f"{_slug(prompt)}-{digest}.png"


def _read_index() -> dict[str, str]:
    path = GENERATED_IMAGES_DIR / INDEX_NAME
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except FileNotFoundError:
        return {}
    except (OSError, ValueError) as e:
        logger.warning("Could not read image index: %s", e)
        return {}


def _atomic_write(path: Path, data: bytes) -> None:
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _record_prompt(filename: str, prompt: str) -> None:
    with _index_lock:
        index = _read_index()
        index[filename] = prompt
        _atomic_write(
            GENERATED_IMAGES_DIR / INDEX_NAME,
            json.dumps(index, indent=2, sort_keys=True).encode("utf-8"),
        )


def _download_and_save_image(url: str, prompt: str) -> Optional[str]:
    """Download a PNG and save it atomically. Returns its static URL."""
    try:
        GENERATED_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        filename = _filename_for(prompt)

        with urllib.request.urlopen(url, timeout=30) as resp:
            data = resp.read(MAX_DOWNLOAD_BYTES + 1)
        if len(data) > MAX_DOWNLOAD_BYTES:
            raise ValueError("image too large")
        if not data.startswith(PNG_SIGNATURE):
            raise ValueError("downloaded file is not a PNG")

        _atomic_write(GENERATED_IMAGES_DIR / filename, data)
        _record_prompt(filename, prompt)
        return f"/static/generated/{filename}"
    except Exception as e:
        logger.warning("Failed to save image locally: %s", e)
        return None


def _openai_generate_image(prompt: str) -> Optional[str]:
    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not api_key.startswith("sk-"):
        logger.warning("No valid OPENAI_API_KEY; skipping generation")
        return None

    # DALL·E 3 can take 15-30+ seconds. Keep this below the gunicorn
    # worker timeout (see README).
    timeout_s = float(os.environ.get("OPENAI_IMAGE_TIMEOUT_SEC", "45"))
    model = os.environ.get("OPENAI_IMAGE_MODEL", "dall-e-3")
    size = os.environ.get("OPENAI_IMAGE_SIZE", "1024x1024")

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, timeout=timeout_s, max_retries=0)
        resp = client.images.generate(
            model=model, prompt=prompt, size=size, quality="standard"
        )
        return resp.data[0].url
    except Exception as e:
        logger.warning("OpenAI image generation error: %s", e)
        return None


def get_all_existing_images() -> list[tuple[str, str]]:
    """Return (image_url, prompt) for every saved image."""
    try:
        GENERATED_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        index = _read_index()
        results = []
        for file in sorted(GENERATED_IMAGES_DIR.glob("*.png")):
            # Legacy files (saved before the index existed) have no entry;
            # fall back to the filename.
            prompt = index.get(file.name) or file.stem.replace("-", " ")
            results.append((f"/static/generated/{file.name}", prompt))
        return results
    except Exception as e:
        logger.warning("Failed to get existing images: %s", e)
        return []


def generate_image_url(prompt: str) -> Optional[str]:
    """Generate and save an image for the prompt.

    Returns the local static URL, or None if generation or saving failed.
    """
    remote_url = _openai_generate_image(prompt)
    if not remote_url:
        return None
    return _download_and_save_image(remote_url, prompt)


def random_fallback_url() -> str:
    return random.choice(FALLBACK_URLS)
