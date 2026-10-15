import logging

from . import enrichment
from .image_service import generate_image_url, get_all_existing_images
from .prompts import generate_new_prompt, get_unused_prompt


logger = logging.getLogger(__name__)

MAX_CONSECUTIVE_FAILURES = 3


def seed_images(count: int) -> dict:
    """Generate up to `count` new images, stopping early on repeated failure.

    Used by both the admin endpoint and the `flask seed` CLI command.
    """
    used = {p.lower() for _, p in get_all_existing_images()}
    generated = 0
    errors: list[str] = []
    failures = 0

    for i in range(count):
        prompt = generate_new_prompt(existing_prompts=used)
        if not prompt:
            prompt = get_unused_prompt(used)
        if prompt.lower() in used:
            errors.append(f"No unused prompt available at step {i + 1}")
            break

        url = generate_image_url(prompt)
        if url:
            enrichment.generate_and_store(url, prompt)
            used.add(prompt.lower())
            generated += 1
            failures = 0
            logger.info("Seeded %d/%d: %s", generated, count, prompt)
        else:
            failures += 1
            errors.append(f"Image generation failed for: {prompt}")
            if failures >= MAX_CONSECUTIVE_FAILURES:
                errors.append("Stopping after repeated failures")
                break

    return {"generated": generated, "target": count, "errors": errors[:10]}
