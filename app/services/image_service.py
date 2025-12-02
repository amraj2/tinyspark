import os
import re
import logging
from pathlib import Path
from typing import Optional
from concurrent.futures import (
    ThreadPoolExecutor,
    TimeoutError as FuturesTimeout,
)
import urllib.request


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

# Directory to save generated images
GENERATED_IMAGES_DIR = Path(__file__).parent.parent / "static" / "generated"


def _sanitize_filename(prompt: str) -> str:
    """Convert prompt to a safe filename."""
    # Remove or replace invalid filename characters
    filename = re.sub(r'[^\w\s-]', '', prompt.lower())
    # Replace spaces and multiple dashes with single dash
    filename = re.sub(r'[-\s]+', '-', filename)
    # Remove leading/trailing dashes
    filename = filename.strip('-')
    # Limit length to avoid filesystem issues
    if len(filename) > 200:
        filename = filename[:200]
    return filename


def _download_and_save_image(url: str, prompt: str) -> Optional[str]:
    """Download image from URL and save locally with prompt as filename."""
    try:
        # Ensure directory exists
        GENERATED_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

        # Create filename from prompt
        filename = _sanitize_filename(prompt)
        filepath = GENERATED_IMAGES_DIR / f"{filename}.png"

        # Download the image
        urllib.request.urlretrieve(url, filepath)

        # Return the URL path that Flask can serve
        return f"/static/generated/{filename}.png"
    except Exception as e:
        logger.warning("Failed to save image locally: %s", e)
        return None


def _openai_generate_image(prompt: str) -> Optional[str]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.warning("No OPENAI_API_KEY; using fallback")
        return None

    # Validate API key format (OpenAI keys start with "sk-")
    api_key = api_key.strip()
    if not api_key.startswith("sk-"):
        logger.warning(
            "Invalid OpenAI API key format (should start with 'sk-'); "
            "using fallback"
        )
        return None

    # DALL·E 3 can take 15-30+ seconds, so use a longer timeout
    timeout_s = float(os.environ.get("OPENAI_IMAGE_TIMEOUT_SEC", "30"))

    def _call() -> Optional[str]:
        try:
            from openai import OpenAI
            # Set a timeout on the client to avoid hanging
            client = OpenAI(
                api_key=api_key,
                timeout=timeout_s + 5.0,  # Add buffer for network overhead
            )
            # DALL·E 3 is the correct model for image generation
            resp = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
            )
            return resp.data[0].url
        except Exception as e:
            # Extract error message safely
            error_msg = str(e)
            if "invalid_api_key" in error_msg.lower() or "401" in error_msg:
                logger.warning(
                    "Invalid OpenAI API key provided; using fallback. "
                    "Get a valid key at "
                    "https://platform.openai.com/account/api-keys"
                )
            else:
                logger.warning(
                    "OpenAI image generation error: %s; falling back",
                    error_msg,
                )
            return None

    try:
        with ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_call)
            return future.result(timeout=timeout_s)
    except FuturesTimeout:
        logger.warning("OpenAI image generation timed out; falling back")
        return None


def get_all_existing_images() -> list[tuple[str, str]]:
    """Get all existing images from the generated folder.

    Returns:
        List of tuples (image_url, prompt) for all images.
    """
    try:
        # Ensure directory exists
        GENERATED_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

        # Get all PNG files
        image_files = list(GENERATED_IMAGES_DIR.glob("*.png"))

        if not image_files:
            return []

        results = []
        for file in image_files:
            # Extract prompt from filename (remove .png extension)
            prompt = file.stem.replace('-', ' ')
            # Return the URL path
            image_url = f"/static/generated/{file.name}"
            results.append((image_url, prompt))

        return results
    except Exception as e:
        logger.warning("Failed to get existing images: %s", e)
        return []


def get_random_existing_image() -> Optional[tuple[str, str]]:
    """Get a random existing image from the generated folder.

    Returns:
        Tuple of (image_url, prompt) or None if no images exist.
    """
    try:
        import random

        all_images = get_all_existing_images()
        if not all_images:
            return None

        # Pick a random image
        return random.choice(all_images)
    except Exception as e:
        logger.warning("Failed to get random existing image: %s", e)
        return None


def generate_image_url(prompt: str) -> str:
    # Try OpenAI first
    remote_url = _openai_generate_image(prompt)
    if remote_url:
        # Download and save locally
        local_url = _download_and_save_image(remote_url, prompt)
        if local_url:
            return local_url
        # If save fails, return remote URL as fallback
        return remote_url

    # Fallback kid-friendly stock URLs (don't save these)
    import random
    return random.choice(FALLBACK_URLS)
